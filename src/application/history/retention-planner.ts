import type { GctgConfiguration } from "../../domain/configuration/model.js";

export interface RetentionCandidate {
  readonly commit: string;
  readonly timestamp: string;
  readonly sizeBytes: number;
  readonly protected: boolean;
  readonly protectionReasons: readonly string[];
  readonly deletedAt?: string;
}

export type RetentionDecision = "ELIGIBLE" | "PROTECTED";

export interface RetentionPlanItem {
  readonly commit: string;
  readonly decision: RetentionDecision;
  readonly reasons: readonly string[];
  readonly sizeBytes: number;
}

export interface RetentionPlan {
  readonly items: readonly RetentionPlanItem[];
  readonly eligible: readonly RetentionPlanItem[];
  readonly protected: readonly RetentionPlanItem[];
  readonly totalSizeBytes: number;
  readonly projectedSizeBytes: number;
}

export function planRetention(
  configuration: GctgConfiguration,
  candidates: readonly RetentionCandidate[],
  now: string
): RetentionPlan {
  const unique = [...new Map(candidates.map(candidate => [candidate.commit, candidate])).values()]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.commit.localeCompare(b.commit));

  const items: RetentionPlanItem[] = unique.map(candidate => {
    const reasons = [...candidate.protectionReasons];
    if (!configuration.historyRetention.enabled) reasons.push("history retention is disabled");
    if (candidate.protected) reasons.push("protected by reachability or explicit evidence");
    if (!candidate.deletedAt) reasons.push("no branch deletion proof");
    else {
      const deletedAge = ageDays(candidate.deletedAt, now);
      if (deletedAge < configuration.historyRetention.deletedBranchGracePeriodDays) {
        reasons.push("deleted-branch grace period has not expired");
      }
    }

    const eligible = configuration.historyRetention.enabled
      && !candidate.protected
      && !!candidate.deletedAt
      && ageDays(candidate.deletedAt, now) >= configuration.historyRetention.deletedBranchGracePeriodDays;

    return {
      commit: candidate.commit,
      decision: eligible ? "ELIGIBLE" : "PROTECTED",
      reasons: eligible ? ["grace period expired and deletion proof exists"] : reasons,
      sizeBytes: candidate.sizeBytes
    };
  });

  const eligible = items.filter(item => item.decision === "ELIGIBLE");
  const totalSizeBytes = unique.reduce((sum, item) => sum + item.sizeBytes, 0);
  const eligibleSizeBytes = eligible.reduce((sum, item) => sum + item.sizeBytes, 0);
  const protectedCount = items.length - eligible.length;
  const protectedSizeBytes = totalSizeBytes - eligibleSizeBytes;
  const maxSnapshots = configuration.storage.maxSnapshots;
  const maxSizeBytes = configuration.storage.maxSizeMb === null ? null : configuration.storage.maxSizeMb * 1024 * 1024;
  const quotaPressure = (maxSnapshots !== null && items.length > maxSnapshots)
    || (maxSizeBytes !== null && totalSizeBytes > maxSizeBytes);
  const projectedCount = protectedCount;
  const projectedSize = protectedSizeBytes;
  const finalItems = quotaPressure
    ? items.map(item => item.decision === "ELIGIBLE"
      ? { ...item, reasons: [...item.reasons, "quota pressure requires evaluating this eligible item"] }
      : item)
    : items;

  return {
    items: finalItems,
    eligible: finalItems.filter(item => item.decision === "ELIGIBLE"),
    protected: finalItems.filter(item => item.decision === "PROTECTED"),
    totalSizeBytes: unique.reduce((sum, item) => sum + item.sizeBytes, 0),
    projectedSizeBytes: projectedSize
  };
}

function ageDays(from: string, to: string): number {
  const milliseconds = Date.parse(to) - Date.parse(from);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return 0;
  return milliseconds / 86400000;
}
