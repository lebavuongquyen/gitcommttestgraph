import type { GraphStore } from "../ports/graph-store.js";
import type { GraphSnapshot } from "../../domain/graph/model.js";
import { ImpactEngine, type ImpactRequest } from "../impact/impact-engine.js";

export class ImpactQueryService {
  constructor(private readonly store: GraphStore, private readonly engine = new ImpactEngine()) {}

  async getImpact(repository: string, commit: string, analyzerVersion: string, configurationFingerprint: string, request: ImpactRequest) {
    const snapshot = await this.store.getSnapshot(repository, commit, analyzerVersion, configurationFingerprint);
    if (!snapshot) throw new Error("Graph snapshot not found");
    return this.engine.analyze(snapshot, request);
  }

  analyze(snapshot: GraphSnapshot, request: ImpactRequest) {
    return this.engine.analyze(snapshot, request);
  }
}
