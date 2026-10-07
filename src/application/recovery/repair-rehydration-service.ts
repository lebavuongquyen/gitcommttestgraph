import type { SnapshotConsistencyIssue } from "../ports/snapshot-consistency.js";
import type { RecoveryRepairPlan, RecoveryRepairService } from "../ports/recovery-repair.js";
import type { ApplicationRuntime } from "../../runtime/application-runtime.js";

export class RepairRehydrationService implements RecoveryRepairService {
  constructor(private readonly runtime: ApplicationRuntime) {}

  async plan(repositoryRoot: string): Promise<RecoveryRepairPlan> {
    const issues = await this.runtime.store.checkConsistency();
    const actions = [];
    const blockedReasons: string[] = [];
    const manifestRepairable = issues.length > 0 && issues.every(issue => issue.kind === "orphan_object" || (issue.kind === "manifest" && issue.detail === "Manifest is missing."));
    const hasBlocking = issues.some(issue => ["duplicate_identity", "missing_object", "corrupt_object"].includes(issue.kind) || (issue.kind === "manifest" && issue.detail !== "Manifest is missing."));
    const orphanOnly = manifestRepairable;

    if (orphanOnly) {
      actions.push({ kind: "rebuild_manifest" as const, reason: "All discovered physical snapshots are valid and only unreferenced objects were found." });
    }

    const head = await this.runtime.head();
    const headRecords = await this.runtime.store.listSnapshots();
    const headPresent = headRecords.some(record => record.repository === repositoryRoot && record.commit === head);
    if (!headPresent) {
      actions.push({ kind: "rehydrate_head" as const, reason: "HEAD has no usable physical snapshot; Git can deterministically regenerate the graph snapshot." });
    }

    if (hasBlocking) {
      blockedReasons.push("Existing manifest, duplicate-identity, missing-object or corrupt-object evidence must be resolved before automatic repair.");
    }
    if (issues.length === 0 && headPresent) {
      return { safe: true, healthyBefore: true, issues, actions: [], blockedReasons: [] };
    }
    const safe = blockedReasons.length === 0 && actions.length > 0;
    return { safe, healthyBefore: issues.length === 0, issues, actions, blockedReasons };
  }

  async apply(repositoryRoot: string): Promise<RecoveryRepairPlan> {
    const plan = await this.plan(repositoryRoot);
    if (!plan.safe) throw new Error("Recovery repair is blocked: " + (plan.blockedReasons.join(" ") || "no safe repair action is available."));

    for (const action of plan.actions) {
      if (action.kind === "rebuild_manifest") await this.runtime.store.rebuildManifestFromPhysicalSnapshots();
      if (action.kind === "rehydrate_head") await this.runtime.index(await this.runtime.head());
    }
    const after = await this.plan(repositoryRoot);
    if (!after.healthyBefore) throw new Error("Recovery repair completed with unresolved consistency issues.");
    return after;
  }
}
