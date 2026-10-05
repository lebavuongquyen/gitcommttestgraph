import type { ExecutionPlan } from "../../domain/workflow/execution-plan.js";

export type ExecutionPlanFormat = "json" | "yaml" | "md" | "mermaid";

export function serializeExecutionPlan(plan: ExecutionPlan, format: ExecutionPlanFormat): string {
  switch (format) {
    case "json": return JSON.stringify(plan, null, 2);
    case "yaml": return toYaml(plan);
    case "md": return toMarkdown(plan);
    case "mermaid": return toMermaid(plan);
  }
}

function toYaml(plan: ExecutionPlan): string {
  const lines = ["schemaVersion: 1", "workflow: git-code-test-impact", "repository: " + JSON.stringify(plan.repository), "commit: " + JSON.stringify(plan.commit), "steps:"];
  for (const step of plan.steps) {
    lines.push("  - id: " + JSON.stringify(step.id), "    nodeId: " + JSON.stringify(step.nodeId), "    kind: test", "    status: " + step.status);
    if (step.command) lines.push("    command:", "      executable: " + JSON.stringify(step.command.executable), "      args: " + JSON.stringify(step.command.args), "      cwd: " + JSON.stringify(step.command.cwd));
    lines.push("    dependsOn: " + JSON.stringify(step.dependsOn), "    affectedTestCaseIds: " + JSON.stringify(step.affectedTestCaseIds), "    affectedSymbolIds: " + JSON.stringify(step.affectedSymbolIds));
  }
  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10);
}

function toMarkdown(plan: ExecutionPlan): string {
  const lines = ["# Execution Plan", "", "- Repository: " + plan.repository, "- Commit: " + plan.commit, "- Workflow: git-code-test-impact", "", "| Step | Status | Command | Depends On | Test Cases | Symbols |", "|---|---|---|---|---:|---:|"];
  for (const step of plan.steps) {
    const command = step.command ? [step.command.executable, ...step.command.args].join(" ") : "—";
    lines.push("| " + step.id + " | " + step.status + " | " + command + " | " + (step.dependsOn.length ? step.dependsOn.join(", ") : "—") + " | " + step.affectedTestCaseIds.length + " | " + step.affectedSymbolIds.length + " |");
  }
  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10);
}

function toMermaid(plan: ExecutionPlan): string {
  const lines = ["flowchart TD"];
  for (const step of plan.steps) {
    const label = step.command ? [step.command.executable, ...step.command.args].join(" ") : step.status;
    lines.push("  " + mermaidId(step.id) + "[test: " + label.replaceAll('"', "'") + "]");
  }
  for (const step of plan.steps) {
    for (const dependency of step.dependsOn) lines.push("  " + mermaidId(dependency) + " --> " + mermaidId(step.id));
  }
  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10);
}

function mermaidId(value: string) {
  return "n" + Buffer.from(value).toString("base64url").replaceAll("-", "_").replaceAll(".", "_");
}
