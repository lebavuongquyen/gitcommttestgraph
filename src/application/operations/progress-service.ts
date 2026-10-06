import type { ProgressSnapshot, ProgressStage } from "../../domain/progress.js";

export class ProgressService {
  private readonly stages = new Map<string, ProgressStage[]>();

  start(operationId: string, name: string, total: number | null = null): ProgressStage {
    const stage = { operationId, name, completed: 0, total, timestamp: new Date().toISOString() };
    this.add(stage);
    return stage;
  }

  update(operationId: string, name: string, completed: number | null, total: number | null): ProgressStage {
    const stage = { operationId, name, completed, total, timestamp: new Date().toISOString() };
    this.add(stage);
    return stage;
  }

  snapshot(operationId: string): ProgressSnapshot {
    return { operationId, stages: [...(this.stages.get(operationId) ?? [])] };
  }

  private add(stage: ProgressStage): void {
    const values = this.stages.get(stage.operationId) ?? [];
    values.push(stage);
    this.stages.set(stage.operationId, values);
  }
}
