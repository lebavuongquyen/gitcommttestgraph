import { discoverRepository, type RepositoryDiscovery } from "../adapters/git/repository-discovery.js";
import { TypeScriptSemanticAnalyzer } from "../adapters/languages/typescript/semantic-analyzer.js";
import { ConfigurationService } from "../application/configuration/configuration-service.js";
import { RepositoryIndexer } from "../application/indexing/index-repository.js";
import { IncrementalRepositoryIndexer, type IncrementalIndexResult } from "../application/indexing/incremental-indexer.js";
import { JsonConfigurationStore } from "../infrastructure/configuration/json-configuration-store.js";
import { JsonConfigurationHistoryStore } from "../infrastructure/configuration/json-configuration-history-store.js";
import { IndexLock } from "../infrastructure/persistence/index-lock.js";
import { JsonGraphStore } from "../infrastructure/persistence/json-graph-store.js";
import { JsonSemanticCache } from "../infrastructure/persistence/json-semantic-cache.js";
import { JsonOperationHistoryStore } from "../infrastructure/persistence/json-operation-history-store.js";
import { GCTG_VERSION } from "../version.js";
import { OperationService } from "../application/operations/operation-service.js";
import { OperationHistoryService, type OperationHistoryQuery } from "../application/operations/operation-history-service.js";
import { ProgressService } from "../application/operations/progress-service.js";
import { InterruptedOperationRecoveryService } from "../application/recovery/interrupted-operation-recovery-service.js";
import { createSnapshot } from "../domain/graph/snapshot.js";
import { JsonRecoveryJournalStore } from "../infrastructure/persistence/json-recovery-journal-store.js";
import type { RecoveryJournalStore } from "../application/ports/recovery-journal.js";

export interface ApplicationRuntimeOptions {
  readonly analyzerVersion?: string;
}

export class ApplicationRuntime {
  readonly repository: RepositoryDiscovery;
  readonly git: RepositoryDiscovery["git"];
  readonly store: JsonGraphStore;
  readonly semanticCache: JsonSemanticCache;
  readonly cache: JsonSemanticCache;
  readonly configurationService: ConfigurationService;
  configuration: Awaited<ReturnType<ConfigurationService["resolve"]>>["configuration"];
  readonly analyzerVersion: string;
  readonly operations: OperationService;
  readonly operationHistory: OperationHistoryService;
  readonly progress: ProgressService;
  readonly recovery: InterruptedOperationRecoveryService;
  private readonly recoveryJournal: RecoveryJournalStore;

  private readonly indexer: IncrementalRepositoryIndexer;
  private readonly indexLock: IndexLock;
  private readonly ensurePromises = new Map<string, Promise<import("../domain/graph/model.js").GraphSnapshot>>();

  private constructor(
    repository: RepositoryDiscovery,
    configuration: Awaited<ReturnType<ConfigurationService["resolve"]>>["configuration"],
    configurationService: ConfigurationService,
    store: JsonGraphStore,
    semanticCache: JsonSemanticCache,
    indexer: IncrementalRepositoryIndexer,
    indexLock: IndexLock,
    analyzerVersion: string,
    operations: OperationService,
    operationHistory: OperationHistoryService,
    progress: ProgressService,
    recovery: InterruptedOperationRecoveryService,
    recoveryJournal: RecoveryJournalStore
  ) {
    this.repository = repository;
    this.git = repository.git;
    this.configuration = configuration;
    this.configurationService = configurationService;
    this.store = store;
    this.semanticCache = semanticCache;
    this.cache = semanticCache;
    this.indexer = indexer;
    this.indexLock = indexLock;
    this.analyzerVersion = analyzerVersion;
    this.operations = operations;
    this.operationHistory = operationHistory;
    this.progress = progress;
    this.recovery = recovery;
    this.recoveryJournal = recoveryJournal;
  }

  static async create(root: string, options: ApplicationRuntimeOptions = {}): Promise<ApplicationRuntime> {
    const repository = await discoverRepository(root);
    const configurationService = new ConfigurationService(
      new JsonConfigurationStore(),
      [],
      new JsonConfigurationHistoryStore()
    );
    const configuration = (await configurationService.resolve(repository.root)).configuration;
    const store = new JsonGraphStore(repository.root + "/.gctg/graph");
    const semanticCache = new JsonSemanticCache(repository.root + "/.gctg/cache/semantic");
    const fullIndexer = new RepositoryIndexer(
      repository.git,
      new TypeScriptSemanticAnalyzer(),
      store,
      semanticCache
    );
    const indexer = new IncrementalRepositoryIndexer(
      repository.git,
      fullIndexer,
      (repo, commit, analyzerVersion, fingerprint) => store.getSnapshot(repo, commit, analyzerVersion, fingerprint)
    );
    const indexLock = new IndexLock(repository.root + "/.gctg/index.lock");
    const operations = new OperationService();
    const operationHistory = new OperationHistoryService(
      repository.root,
      new JsonOperationHistoryStore()
    );
    const history = await operationHistory.load();
    operations.restore(history);
    const progress = new ProgressService();
    const recoveryJournal = new JsonRecoveryJournalStore();
    const recovery = new InterruptedOperationRecoveryService(repository.root, recoveryJournal, operations, operationHistory, async commit => {
      const release = await indexLock.acquire();
      try {
        return indexer.index({ repository: repository.root, commit, configuration, analyzerVersion: options.analyzerVersion ?? GCTG_VERSION });
      } finally {
        await release();
      }
    });
    return new ApplicationRuntime(
      repository,
      configuration,
      configurationService,
      store,
      semanticCache,
      indexer,
      indexLock,
      options.analyzerVersion ?? GCTG_VERSION,
      operations,
      operationHistory,
      progress,
      recovery,
      recoveryJournal
    );
  }

  async head(): Promise<string> {
    return this.git.getHead();
  }

  private async persistOperations(): Promise<void> {
    await this.operationHistory.record(this.operations.list());
  }

  async loadSnapshot(commit?: string): Promise<import("../domain/graph/model.js").GraphSnapshot | null> {
    const target = commit ?? await this.head();
    const fingerprintSnapshot = createSnapshot({
      analyzerVersion: this.analyzerVersion,
      repository: this.repository.root,
      commit: target,
      configuration: this.configuration,
      nodes: [],
      edges: []
    });
    return this.store.getSnapshot(
      this.repository.root,
      target,
      this.analyzerVersion,
      fingerprintSnapshot.configurationFingerprint
    );
  }

  async ensureSnapshot(commit?: string): Promise<import("../domain/graph/model.js").GraphSnapshot> {
    const target = commit ?? await this.head();
    const cached = await this.loadSnapshot(target);
    if (cached) return cached;
    const pending = this.ensurePromises.get(target);
    if (pending) return pending;
    const promise = this.index(target).then(result => result.snapshot).finally(() => {
      this.ensurePromises.delete(target);
    });
    this.ensurePromises.set(target, promise);
    return promise;
  }

  async index(commit?: string): Promise<IncrementalIndexResult> {
    const target = commit ?? await this.head();
    const operation = this.operations.begin("index", { commit: target });
    await this.persistOperations();
    this.operations.start(operation.id);
    await this.persistOperations();
    await this.recoveryJournal.save(this.repository.root, { schemaVersion: 1, operationId: operation.id, operationName: operation.name, commit: target, phase: "prepared", startedAt: operation.startedAt, updatedAt: new Date().toISOString(), metadata: operation.metadata });
    this.progress.start(operation.id, "acquire-lock");
    const release = await this.indexLock.acquire();
    await this.recoveryJournal.save(this.repository.root, { schemaVersion: 1, operationId: operation.id, operationName: operation.name, commit: target, phase: "locked", startedAt: operation.startedAt, updatedAt: new Date().toISOString(), metadata: operation.metadata });
    this.progress.update(operation.id, "analyze", 0, 1);
    try {
      await this.recoveryJournal.save(this.repository.root, { schemaVersion: 1, operationId: operation.id, operationName: operation.name, commit: target, phase: "analyzing", startedAt: operation.startedAt, updatedAt: new Date().toISOString(), metadata: operation.metadata });
      const result = await this.indexer.index({
        repository: this.repository.root,
        commit: target,
        configuration: this.configuration,
        analyzerVersion: this.analyzerVersion
      });
      this.progress.update(operation.id, "analyze", 1, 1);
      this.progress.update(operation.id, "complete", 1, 1);
      this.operations.succeed(operation.id);
      await this.persistOperations();
      await this.recoveryJournal.clear(this.repository.root);
      return result;
    } catch (error) {
      this.operations.fail(operation.id, error);
      await this.persistOperations();
      throw error;
    } finally {
      await release();
    }
  }

  async resolveConfiguration(overrides?: unknown) {
    return this.configurationService.resolve(this.repository.root, overrides);
  }

  async reloadConfiguration() {
    const resolved = await this.configurationService.resolve(this.repository.root);
    this.configuration = resolved.configuration;
    return resolved;
  }

  async configurationHistory() {
    return this.configurationService.history(this.repository.root);
  }

  async updateConfiguration(configuration: unknown) {
    const result = await this.configurationService.update(this.repository.root, configuration);
    this.configuration = result.configuration;
    return result;
  }

  async operationsHistory(query: OperationHistoryQuery = {}) {
    return this.operationHistory.query(query);
  }
}
