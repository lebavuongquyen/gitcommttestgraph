import { discoverRepository, type RepositoryDiscovery } from "../adapters/git/repository-discovery.js";
import { TypeScriptProjectAnalyzer } from "../adapters/languages/typescript/semantic-analyzer.js";
import { ConfigurationService } from "../application/configuration/configuration-service.js";
import { RepositoryIndexer } from "../application/indexing/index-repository.js";
import { IncrementalRepositoryIndexer, type IncrementalIndexResult } from "../application/indexing/incremental-indexer.js";
import { JsonConfigurationStore } from "../infrastructure/configuration/json-configuration-store.js";
import { IndexLock } from "../infrastructure/persistence/index-lock.js";
import { JsonGraphStore } from "../infrastructure/persistence/json-graph-store.js";
import { JsonSemanticCache } from "../infrastructure/persistence/json-semantic-cache.js";
import { GCTG_VERSION } from "../version.js";

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

  private readonly indexer: IncrementalRepositoryIndexer;
  private readonly indexLock: IndexLock;

  private constructor(
    repository: RepositoryDiscovery,
    configuration: Awaited<ReturnType<ConfigurationService["resolve"]>>["configuration"],
    configurationService: ConfigurationService,
    store: JsonGraphStore,
    semanticCache: JsonSemanticCache,
    indexer: IncrementalRepositoryIndexer,
    indexLock: IndexLock,
    analyzerVersion: string
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
  }

  static async create(root: string, options: ApplicationRuntimeOptions = {}): Promise<ApplicationRuntime> {
    const repository = await discoverRepository(root);
    const configurationService = new ConfigurationService(new JsonConfigurationStore());
    const configuration = (await configurationService.resolve(repository.root)).configuration;
    const store = new JsonGraphStore(repository.root + "/.gctg/graph");
    const semanticCache = new JsonSemanticCache(repository.root + "/.gctg/cache/semantic");
    const fullIndexer = new RepositoryIndexer(
      repository.git,
      new TypeScriptProjectAnalyzer(),
      store,
      semanticCache
    );
    const indexer = new IncrementalRepositoryIndexer(
      repository.git,
      fullIndexer,
      (repo, commit, analyzerVersion, fingerprint) => store.getSnapshot(repo, commit, analyzerVersion, fingerprint)
    );
    const indexLock = new IndexLock(repository.root + "/.gctg/index.lock");
    return new ApplicationRuntime(
      repository,
      configuration,
      configurationService,
      store,
      semanticCache,
      indexer,
      indexLock,
      options.analyzerVersion ?? GCTG_VERSION
    );
  }

  async head(): Promise<string> {
    return this.git.getHead();
  }

  async index(commit?: string): Promise<IncrementalIndexResult> {
    const target = commit ?? await this.head();
    const release = await this.indexLock.acquire();
    try {
      return await this.indexer.index({
        repository: this.repository.root,
        commit: target,
        configuration: this.configuration,
        analyzerVersion: this.analyzerVersion
      });
    } finally {
      await release();
    }
  }

  async resolveConfiguration(overrides?: unknown) {
    return this.configurationService.resolve(this.repository.root, overrides);
  }

  async updateConfiguration(configuration: unknown) {
    const result = await this.configurationService.update(this.repository.root, configuration);
    this.configuration = result.configuration;
    return result;
  }
}
