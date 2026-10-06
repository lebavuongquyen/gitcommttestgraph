import type { ApplicationRuntime } from "../../runtime/application-runtime.js";

export type HealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY";

export interface HealthCheck {
  readonly name: string;
  readonly status: HealthStatus;
  readonly detail: string;
}

export interface HealthReport {
  readonly status: HealthStatus;
  readonly checks: readonly HealthCheck[];
}

export class HealthService {
  async check(runtime: ApplicationRuntime): Promise<HealthReport> {
    const checks: HealthCheck[] = [];

    try {
      const head = await runtime.git.getHead();
      checks.push({ name: "git", status: "HEALTHY", detail: head });
    } catch (error) {
      checks.push({ name: "git", status: "UNHEALTHY", detail: error instanceof Error ? error.message : String(error) });
    }

    try {
      const snapshots = await runtime.store.listSnapshots();
      checks.push({ name: "storage", status: "HEALTHY", detail: String(snapshots.length) + " snapshots" });
    } catch (error) {
      checks.push({ name: "storage", status: "UNHEALTHY", detail: error instanceof Error ? error.message : String(error) });
    }

    const failed = runtime.operations.list().filter(operation => operation.state === "failed").length;
    checks.push({
      name: "operations",
      status: failed === 0 ? "HEALTHY" : "DEGRADED",
      detail: failed === 0 ? "no failed operations" : String(failed) + " failed operation(s)"
    });

    const status = checks.some(check => check.status === "UNHEALTHY")
      ? "UNHEALTHY"
      : checks.some(check => check.status === "DEGRADED")
        ? "DEGRADED"
        : "HEALTHY";

    return { status, checks };
  }
}
