import { EdgeType, type GraphEdge, type GraphNode } from "../../domain/graph/model.js";
import type { Evidence } from "../../domain/evidence/model.js";
import type { TestImpact } from "../../domain/impact/test-impact.js";
import type { ExecutionCommand, ExecutionPlan, ExecutionStep, ExecutionStepStatus } from "../../domain/workflow/execution-plan.js";

export interface ExecutionPlanInput {
  readonly repository: string;
  readonly commit: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly impacts: readonly TestImpact[];
}

export function buildExecutionPlan(input: ExecutionPlanInput): ExecutionPlan {
  const nodes = new Map(input.nodes.map(node => [node.id, node]));
  const grouped = new Map<string, TestImpact[]>();
  for (const impact of input.impacts) {
    const list = grouped.get(impact.testProjectId) ?? [];
    list.push(impact);
    grouped.set(impact.testProjectId, list);
  }
  const projectIds = [...grouped.keys()].sort((a, b) => compareProjects(a, b, nodes));
  const orderedProjectIds = topologicalProjectOrder(projectIds, nodes, input.edges);
  const steps = orderedProjectIds.map(projectId => {
    const impacts = grouped.get(projectId)!.slice().sort(compareImpacts);
    const command = impacts.find(item => item.testCommand)?.testCommand;
    const status: ExecutionStepStatus = command ? "RUNNABLE" : "IMPACTED_NO_COMMAND";
    const project = nodes.get(projectId);
    const dependsOn = orderedProjectIds.filter(other => other !== projectId && dependsOnProject(project, nodes.get(other), input.edges)).map(stepId);
    return {
      id: stepId(projectId),
      nodeId: projectId,
      kind: "test" as const,
      status,
      ...(command ? { command: normalizeCommand(command) } : {}),
      dependsOn,
      affectedTestCaseIds: [...new Set(impacts.map(item => item.testCaseId))].sort(),
      affectedSymbolIds: [...new Set(impacts.flatMap(item => item.affectedSymbolIds))].sort(),
      evidence: mergeEvidence(impacts.flatMap(item => item.evidence))
    } satisfies ExecutionStep;
  });
  return { schemaVersion: 1, workflow: "git-code-test-impact", repository: input.repository, commit: input.commit, steps };
}

function stepId(projectId: string) { return "execution:test:" + projectId; }

function compareProjects(a: string, b: string, nodes: Map<string, GraphNode>) {
  const an = String(nodes.get(a)?.attributes.name ?? a);
  const bn = String(nodes.get(b)?.attributes.name ?? b);
  return an.localeCompare(bn) || a.localeCompare(b);
}

function compareImpacts(a: TestImpact, b: TestImpact) {
  return a.testCaseId.localeCompare(b.testCaseId) || a.testFileId.localeCompare(b.testFileId);
}

function normalizeCommand(command: NonNullable<TestImpact["testCommand"]>): ExecutionCommand {
  return { executable: command.executable, args: [...command.args], cwd: command.cwd };
}

function dependsOnProject(project: GraphNode | undefined, other: GraphNode | undefined, edges: readonly GraphEdge[]) {
  if (!project || !other) return false;
  const packageId = String(project.attributes.packageId ?? "");
  const otherPackageId = String(other.attributes.packageId ?? "");
  if (!packageId || !otherPackageId || packageId === otherPackageId) return false;
  const dependencyEdges = edges.filter(edge => edge.type === EdgeType.DEPENDS_ON && edge.source === packageId && edge.target === otherPackageId);
  return dependencyEdges.length > 0;
}

function topologicalProjectOrder(projectIds: readonly string[], nodes: Map<string, GraphNode>, edges: readonly GraphEdge[]) {
  const remaining = new Set(projectIds);
  const result: string[] = [];
  while (remaining.size) {
    const ready = [...remaining].filter(id => [...remaining].every(other => other === id || !dependsOnProject(nodes.get(id), nodes.get(other), edges))).sort((a, b) => compareProjects(a, b, nodes));
    if (!ready.length) {
      result.push(...[...remaining].sort((a, b) => compareProjects(a, b, nodes)));
      break;
    }
    for (const id of ready) {
      remaining.delete(id);
      result.push(id);
    }
  }
  return result;
}

function mergeEvidence(items: readonly Evidence[]) {
  const map = new Map<string, Evidence>();
  for (const item of items) map.set(JSON.stringify(item), item);
  return [...map.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
