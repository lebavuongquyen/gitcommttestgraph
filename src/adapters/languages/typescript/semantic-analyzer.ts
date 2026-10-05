import ts from "typescript";
import { stableId, edgeId } from "../../../domain/graph/ids.js";
import { Confidence } from "../../../domain/evidence/model.js";
import { EdgeType, NodeType, type GraphEdge, type GraphNode } from "../../../domain/graph/model.js";
import type { SemanticSourceAnalyzer, SourceAnalysis, SourceFileInput, SourceProjectInput } from "../../../application/ports/source-analyzer.js";
import { SymbolKind } from "../../../domain/symbol/model.js";
import { TypeScriptModuleResolver } from "./module-resolver.js";

export class TypeScriptSemanticAnalyzer implements SemanticSourceAnalyzer {
  analyzeProject(input: SourceProjectInput, commit: string): SourceAnalysis {
    const analyses = input.files.map(file => this.analyze(file, commit));
    const nodes = analyses.flatMap(item => item.nodes);
    const edges = analyses.flatMap(item => item.edges);
    const files = new Set(input.files.map(file => file.path.replaceAll("\\", "/")));
    const resolver = new TypeScriptModuleResolver();
    for (const file of input.files) {
      const analysis = analyses.find(item => item.nodes.some(node => node.attributes.path === file.path));
      if (!analysis) continue;
      for (const edge of analysis.edges.filter(edge => edge.type === EdgeType.IMPORTS)) {
        const specifier = String(edge.evidence[0]?.text ?? "");
        const resolved = resolver.resolve({ specifier, importer: file.path, extensions: [".ts",".tsx",".js",".jsx",".mjs",".cjs"], files, pathAliases: input.pathAliases, baseUrl: input.baseUrl });
        if (!resolved.target) continue;
        const targetFile = nodes.find(node => node.type === NodeType.FILE && node.attributes.path === resolved.target);
        if (!targetFile) continue;
        const index = edges.findIndex(candidate => candidate.id === edge.id);
        if (index >= 0) edges[index] = { ...edge, target: targetFile.id, confidence: Confidence.EXACT, evidence: [...edge.evidence, { kind: resolved.strategy, filePath: file.path, text: resolved.target }] };
      }
    }
    return { nodes, edges };
  }

  analyze(input: SourceFileInput, commit: string): SourceAnalysis {
    const scriptKind = scriptKindFor(input.path);
    const fileId = stableId("file", input.path, input.content);
    const nodes: GraphNode[] = [{
      id: fileId,
      type: NodeType.FILE,
      attributes: { path: input.path, packageId: input.packageId ?? null, contentHash: stableId("content", input.content), language: "typescript" }
    }];
    const edges: GraphEdge[] = [];
    const source = ts.createSourceFile(input.path, input.content, ts.ScriptTarget.Latest, true, scriptKind);
    const moduleNodeId = stableId("symbol", input.path, "module");
    nodes.push({ id: moduleNodeId, type: NodeType.SYMBOL, attributes: { fileId, kind: SymbolKind.MODULE, name: input.path, exported: true, startLine: 1, endLine: source.getLineStarts().length } });
    edges.push({ id: edgeId(fileId, EdgeType.CONTAINS, moduleNodeId, commit), source: fileId, target: moduleNodeId, type: EdgeType.CONTAINS, confidence: Confidence.EXACT, evidence: [{ kind: "ast-module", filePath: input.path }], sourceCommit: commit });

    const visit = (node: ts.Node) => {
      if (isSymbolDeclaration(node)) {
        const name = declarationName(node);
        if (name) {
          const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          const end = source.getLineAndCharacterOfPosition(node.end).line + 1;
          const symbolId = stableId("symbol", input.path, name, String(start), String(end));
          nodes.push({ id: symbolId, type: NodeType.SYMBOL, attributes: { fileId, kind: symbolKind(node), name, exported: hasExportModifier(node), startLine: start, endLine: end } });
          edges.push({ id: edgeId(fileId, EdgeType.CONTAINS, symbolId, commit), source: fileId, target: symbolId, type: EdgeType.CONTAINS, confidence: Confidence.EXACT, evidence: [{ kind: "ast-declaration", filePath: input.path, startLine: start, endLine: end, text: name }], sourceCommit: commit });
        }
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const target = node.moduleSpecifier.text;
        const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        const targetId = stableId("module-ref", target);
        edges.push({ id: edgeId(fileId, EdgeType.IMPORTS, targetId, commit), source: fileId, target: targetId, type: EdgeType.IMPORTS, confidence: Confidence.HIGH, evidence: [{ kind: "ast-import", filePath: input.path, startLine: start, endLine: start, text: target }], sourceCommit: commit });
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(source, visit);
    return { nodes, edges };
  }
}

function scriptKindFor(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function isSymbolDeclaration(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isVariableStatement(node) || ts.isMethodDeclaration(node);
}

function declarationName(node: ts.Node): string | null {
  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0];
    return node.declarationList.declarations.length === 1 && declaration && ts.isIdentifier(declaration.name) ? declaration.name.text : null;
  }
  const named = node as ts.Declaration & { name?: ts.Node };
  return named.name && ts.isIdentifier(named.name) ? named.name.text : null;
}

function symbolKind(node: ts.Node): SymbolKind {
  if (ts.isFunctionDeclaration(node)) return SymbolKind.FUNCTION;
  if (ts.isClassDeclaration(node)) return SymbolKind.CLASS;
  if (ts.isInterfaceDeclaration(node)) return SymbolKind.INTERFACE;
  if (ts.isTypeAliasDeclaration(node)) return SymbolKind.TYPE;
  if (ts.isEnumDeclaration(node)) return SymbolKind.ENUM;
  if (ts.isVariableStatement(node)) return SymbolKind.VARIABLE;
  if (ts.isMethodDeclaration(node)) return SymbolKind.METHOD;
  return SymbolKind.OTHER;
}

function hasExportModifier(node: ts.Node): boolean {
  return !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m: ts.ModifierLike) => m.kind === ts.SyntaxKind.ExportKeyword));
}
