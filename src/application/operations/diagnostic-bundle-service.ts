import type { ApplicationRuntime } from "../../runtime/application-runtime.js";
import { explainConfiguration } from "../configuration/configuration-explanation.js";
import { SnapshotAccountingService, type SnapshotAccounting } from "../history/snapshot-accounting-service.js";
import { HealthService, type HealthReport } from "./health-service.js";
import type { OperationRecord } from "../../domain/operation.js";
import { sanitizeErrorMessage } from "../../domain/security/policy.js";
import { GCTG_VERSION } from "../../version.js";

export interface DiagnosticBundle {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly reproducibility: {
    readonly gctgVersion: string;
    readonly nodeVersion: string;
    readonly platform: string;
    readonly architecture: string;
    readonly gitHead: string;
  };
  readonly health: HealthReport;
  readonly operations: readonly OperationRecord[];
  readonly configuration: ReturnType<typeof explainConfiguration>;
  readonly storage:
    | { readonly available: true; readonly accounting: SnapshotAccounting }
    | { readonly available: false; readonly error: string };
}

export async function buildDiagnosticBundle(runtime: ApplicationRuntime): Promise<DiagnosticBundle> {
  const [head, resolved, health, operations] = await Promise.all([
    runtime.head(),
    runtime.resolveConfiguration(),
    new HealthService().check(runtime),
    runtime.operationsHistory({ limit: 100 })
  ]);

  let storage: DiagnosticBundle["storage"];
  try {
    storage = {
      available: true,
      accounting: await new SnapshotAccountingService(runtime.store).account(runtime.configuration)
    };
  } catch (error) {
    storage = {
      available: false,
      error: sanitizeErrorMessage(error)
    };
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    reproducibility: {
      gctgVersion: GCTG_VERSION,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      gitHead: head
    },
    health,
    operations,
    configuration: explainConfiguration(resolved),
    storage
  };
}
