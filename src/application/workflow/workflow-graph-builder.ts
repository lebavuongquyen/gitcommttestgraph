import type { GraphNode } from "../../domain/graph/model.js";
import type { WorkflowBuildInput, WorkflowEdge, WorkflowGraph, WorkflowNode } from "../../domain/workflow/model.js";

export function buildWorkflowGraph(input: WorkflowBuildInput): WorkflowGraph {
  const sourceNodes = new Map(input.nodes.map(node => [node.id, node]));
  const nodes = new Map<string, WorkflowNode>();
  const edges = new Map<string, WorkflowEdge>();

  add(nodes, { id: "commit:" + input.commit, kind: "commit", label: input.commit, attributes: { repository: input.repository, commit: input.commit } });

  for (const id of input.changedSymbolIds) {
    const node = sourceNodes.get(id);
    if (!node) continue;
    addSymbol(nodes, node);
    edge(edges, "commit:" + input.commit, "symbol:" + id, "CHANGED");
  }

  for (const id of input.affectedSymbolIds) {
    const node = sourceNodes.get(id);
    if (!node) continue;
    addSymbol(nodes, node);
    for (const changedId of input.changedSymbolIds) {
      if (changedId !== id) edge(edges, "symbol:" + changedId, "symbol:" + id, "AFFECTS");
    }
  }

  for (const impact of input.impacts) {
    const project = sourceNodes.get(impact.testProjectId);
    const file = sourceNodes.get(impact.testFileId);
    const testCase = sourceNodes.get(impact.testCaseId);
    if (!project || !file || !testCase) continue;
    addTestNode(nodes, project, "test-project");
    addTestNode(nodes, file, "test-file");
    addTestNode(nodes, testCase, "test-case");
    edge(edges, "test-project:" + project.id, "test-file:" + file.id, "CONTAINS");
    edge(edges, "test-file:" + file.id, "test-case:" + testCase.id, "CONTAINS");
    for (const symbolId of impact.affectedSymbolIds) {
      if (sourceNodes.has(symbolId)) {
        addSymbol(nodes, sourceNodes.get(symbolId)!);
        edge(edges, "symbol:" + symbolId, "test-case:" + testCase.id, "TESTS");
      }
    }
    if (impact.testCommand) {
      const commandId = commandNodeId(impact.testProjectId, impact.testCommand);
      add(nodes, { id: commandId, kind: "command", label: formatCommand(impact.testCommand), attributes: impact.testCommand });
      edge(edges, "test-project:" + project.id, commandId, "RUNS");
    }
  }

  return {
    schemaVersion: 1,
    workflow: "git-code-test-impact",
    repository: input.repository,
    commit: input.commit,
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id))
  };
}

function addSymbol(nodes: Map<string, WorkflowNode>, node: GraphNode) {
  add(nodes, { id: "symbol:" + node.id, kind: "symbol", label: String(node.attributes.name ?? node.attributes.symbolName ?? node.id), attributes: { sourceNodeId: node.id, ...node.attributes } });
}

function addTestNode(nodes: Map<string, WorkflowNode>, node: GraphNode, kind: "test-project" | "test-file" | "test-case") {
  add(nodes, { id: kind + ":" + node.id, kind, label: String(node.attributes.title ?? node.attributes.path ?? node.attributes.name ?? node.id), attributes: { sourceNodeId: node.id, ...node.attributes } });
}

function add(map: Map<string, WorkflowNode>, node: WorkflowNode) { if (!map.has(node.id)) map.set(node.id, node); }

function edge(map: Map<string, WorkflowEdge>, source: string, target: string, relation: WorkflowEdge["relation"]) {
  const id = [source, relation, target].join(":");
  if (!map.has(id)) map.set(id, { id, source, target, relation });
}

function commandNodeId(projectId: string, command: { executable: string; args: readonly string[]; cwd: string }) {
  return "command:" + projectId + ":" + Buffer.from(JSON.stringify(command)).toString("base64url");
}

function formatCommand(command: { executable: string; args: readonly string[] }) { return [command.executable, ...command.args].join(" "); }
