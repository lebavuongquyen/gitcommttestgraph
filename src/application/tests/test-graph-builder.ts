import { EdgeType, NodeType, type GraphEdge, type GraphNode } from "../../domain/graph/model.js";
import { Confidence } from "../../domain/evidence/model.js";
import { edgeId, stableId } from "../../domain/graph/ids.js";
import type { TestFrameworkAdapter, TestProjectContext } from "./test-registry.js";

export interface TestGraphInput {
  readonly files: readonly string[];
  readonly packageId?: string;
  readonly root: string;
  readonly commit: string;
  readonly packageScripts: Readonly<Record<string, string>>;
  readonly dependencies: Readonly<Record<string, string>>;
  readonly readFile: (path: string) => Promise<string>;
  readonly commandResolverId?: string;
}

export async function buildTestGraph(
  adapter: TestFrameworkAdapter,
  input: TestGraphInput
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const detection = await adapter.detect({
    root: input.root,
    files: input.files,
    packageScripts: input.packageScripts,
    dependencies: input.dependencies
  });
  if (!detection.detected) return { nodes: [], edges: [] };

  const rootPath = input.root;
  const projectId = stableId("test-project", adapter.id, input.packageId ?? rootPath);
  const project = {
    id: projectId,
    ...(input.packageId ? { packageId: input.packageId } : {}),
    framework: adapter.id,
    rootPath,
    configurationFiles: [],
    commandResolverId: input.commandResolverId ?? (input.packageScripts.test ? "npm" : "unknown")
  };
  const context: TestProjectContext = {
    root: input.root,
    files: input.files,
    packageScripts: input.packageScripts,
    dependencies: input.dependencies,
    project,
    readFile: input.readFile
  };
  const testCommand = await adapter.resolveCommand({ ...context, request: "project" });

  const projectNode: GraphNode = {
    id: projectId,
    type: NodeType.TEST_PROJECT,
    attributes: {
      framework: adapter.id,
      rootPath,
      ...(input.packageId ? { packageId: input.packageId } : {}),
      commandResolverId: project.commandResolverId,
      testCommand
    }
  };
  const nodes: GraphNode[] = [projectNode];
  const edges: GraphEdge[] = [];
  const testFiles = await adapter.discoverTests(context);
  for (const path of testFiles) {
    const fileId = stableId("file", path);
    const testFileId = stableId("test-file", projectId, path);
    nodes.push({
      id: testFileId,
      type: NodeType.TEST_FILE,
      attributes: { fileId, path, testProjectId: projectId, ...(input.packageId ? { packageId: input.packageId } : {}) }
    });
    edges.push(makeEdge(projectId, EdgeType.CONTAINS, testFileId, input.commit, path, "test-project-file"));
    const cases = await adapter.extractCases(context, path);
    for (const item of cases) {
      const caseId = stableId("test-case", testFileId, item.title, String(item.startLine), String(item.endLine));
      nodes.push({
        id: caseId,
        type: NodeType.TEST_CASE,
        attributes: { testFileId, title: item.title, startLine: item.startLine, endLine: item.endLine }
      });
      edges.push(makeEdge(testFileId, EdgeType.CONTAINS, caseId, input.commit, path, "test-file-case"));
    }
  }
  return { nodes, edges };
}

function makeEdge(source: string, type: EdgeType, target: string, commit: string, filePath: string, kind: string): GraphEdge {
  return {
    id: edgeId(source, type, target, commit),
    source,
    target,
    type,
    confidence: Confidence.EXACT,
    evidence: [{ kind, filePath }],
    sourceCommit: commit
  };
}
