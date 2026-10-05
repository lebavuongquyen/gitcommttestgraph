import ts from "typescript";
import { posix } from "node:path";
import { stableId, edgeId } from "../../../domain/graph/ids.js";
import { Confidence } from "../../../domain/evidence/model.js";
import { EdgeType, NodeType, type GraphEdge, type GraphNode } from "../../../domain/graph/model.js";
import { SymbolKind } from "../../../domain/symbol/model.js";
import type { SourceAnalysis, SourceFileInput } from "../../../application/ports/source-analyzer.js";

export class TypeScriptProjectAnalyzer {
  analyze(files: readonly SourceFileInput[], commit: string): SourceAnalysis {
    const normalized = files.map(file => ({ ...file, path: file.path.replaceAll("\\", "/") }));
    const fileNames = normalized.map(file => file.path);
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true,
      jsx: ts.JsxEmit.Preserve,
      noEmit: true
    };
    const host = ts.createCompilerHost(compilerOptions);
    const contents = new Map(normalized.map(file => [file.path, file.content]));
    host.fileExists = file => contents.has(file.replaceAll("\\", "/"));
    host.readFile = file => contents.get(file.replaceAll("\\", "/"));
    host.getSourceFile = (fileName, languageVersion) => {
      const path = fileName.replaceAll("\\", "/");
      const content = contents.get(path);
      return content === undefined ? undefined : ts.createSourceFile(path, content, languageVersion, true, scriptKind(path));
    };
    const program = ts.createProgram(fileNames, compilerOptions, host);
    const checker = program.getTypeChecker();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const symbols = new Map<ts.Symbol, string>();
    const symbolsByName = new Map<string, string[]>();
    const fileNodes = new Map<string, string>();

    for (const file of normalized) {
      const fileId = stableId("file", file.path, file.content);
      fileNodes.set(file.path, fileId);
      nodes.push({ id: fileId, type: NodeType.FILE, attributes: { path: file.path, packageId: file.packageId ?? null, contentHash: stableId("content", file.content), language: "typescript" } });
    }

    for (const file of normalized) {
      const source = program.getSourceFile(file.path);
      if (!source) continue;
      const fileId = fileNodes.get(file.path)!;
      const moduleSymbol = checker.getSymbolAtLocation(source);
      if (moduleSymbol) symbols.set(moduleSymbol, stableId("symbol", file.path, "module"));
      const visit = (node: ts.Node) => {
        if (isDeclaration(node)) {
          const symbol = checker.getSymbolAtLocation(declarationNameNode(node));
          const name = declarationName(node);
          if (symbol && name) {
            const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
            const end = source.getLineAndCharacterOfPosition(node.end).line + 1;
            const id = stableId("symbol", file.path, name, String(start), String(end));
            symbols.set(symbol, id);
            const named = symbolsByName.get(name) ?? [];
            named.push(id);
            symbolsByName.set(name, named);
            nodes.push({ id, type: NodeType.SYMBOL, attributes: { fileId, kind: symbolKind(node), name, exported: hasExportModifier(node), startLine: start, endLine: end } });
            edges.push(edge(fileId, EdgeType.CONTAINS, id, commit, file.path, start, end, "ast-declaration"));
          }
        }
        if (ts.isCallExpression(node)) {
          const target = checker.getSymbolAtLocation(node.expression);
          const targetId = target ? symbolIdFor(target, checker, symbols) : undefined;
          const fallbackTargetId = ts.isIdentifier(node.expression) && (symbolsByName.get(node.expression.text)?.length === 1) ? symbolsByName.get(node.expression.text)?.[0] : undefined;
          if (targetId ?? fallbackTargetId) edges.push(edgeNearest(node, EdgeType.CALLS, targetId ?? fallbackTargetId!, fileId, commit, source, targetId ? "typescript-typechecker-call" : "name-resolved-call"));
        }
        if (ts.isClassDeclaration(node) && node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            for (const expression of clause.types) {
              const target = checker.getSymbolAtLocation(expression.expression);
              const targetId = target ? symbols.get(target) : undefined;
              if (!targetId) continue;
              edges.push(edgeNearest(node, clause.token === ts.SyntaxKind.ExtendsKeyword ? EdgeType.EXTENDS : EdgeType.IMPLEMENTS, targetId, fileId, commit, source, "typescript-typechecker-heritage"));
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
          const targetPath = resolveImportPath(file.path, statement.moduleSpecifier.text, fileNodes);
          const targetFile = targetPath ? fileNodes.get(targetPath) : undefined;
          if (targetFile) edges.push(edge(fileId, EdgeType.IMPORTS, targetFile, commit, file.path, line(source, statement), line(source, statement), "path-resolved-import"));
        }
      }
      ts.forEachChild(source, visit);
    }
    return { nodes, edges };
  }
}

function edge(source: string, type: EdgeType, target: string, commit: string, path: string, startLine: number, endLine: number, kind: string): GraphEdge {
  return { id: edgeId(source, type, target, commit), source, target, type, confidence: Confidence.EXACT, evidence: [{ kind, filePath: path, startLine, endLine }], sourceCommit: commit };
}

function edgeNearest(node: ts.Node, type: EdgeType, target: string, source: string, commit: string, file: ts.SourceFile, kind: string): GraphEdge {
  const l = line(file, node);
  return edge(source, type, target, commit, file.fileName, l, l, kind);
}

function line(file: ts.SourceFile, node: ts.Node): number { return file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1; }
function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
function isDeclaration(node: ts.Node): boolean { return ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isVariableDeclaration(node) || ts.isMethodDeclaration(node); }
function declarationNameNode(node: ts.Node): ts.Node { if (ts.isVariableDeclaration(node)) return node.name; const named = node as ts.NamedDeclaration; return named.name!; }
function declarationName(node: ts.Node): string | null { const n = declarationNameNode(node); return ts.isIdentifier(n) ? n.text : null; }
function symbolKind(node: ts.Node): SymbolKind { if (ts.isFunctionDeclaration(node)) return SymbolKind.FUNCTION; if (ts.isClassDeclaration(node)) return SymbolKind.CLASS; if (ts.isInterfaceDeclaration(node)) return SymbolKind.INTERFACE; if (ts.isTypeAliasDeclaration(node)) return SymbolKind.TYPE; if (ts.isEnumDeclaration(node)) return SymbolKind.ENUM; if (ts.isVariableDeclaration(node)) return SymbolKind.VARIABLE; if (ts.isMethodDeclaration(node)) return SymbolKind.METHOD; return SymbolKind.OTHER; }
function hasExportModifier(node: ts.Node): boolean { return !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)); }

function symbolIdFor(symbol: ts.Symbol, checker: ts.TypeChecker, symbols: Map<ts.Symbol, string>): string | undefined {
  const direct = symbols.get(symbol);
  if (direct) return direct;
  if (symbol.flags & ts.SymbolFlags.Alias) {
    try { return symbols.get(checker.getAliasedSymbol(symbol)); } catch { return undefined; }
  }
  return undefined;
}

function resolveFileName(path: string, files: Map<string, string>): string {
  if (files.has(path)) return path;
  const candidates = path.endsWith(".js")
    ? [path.slice(0, -3) + ".ts", path.slice(0, -3) + ".tsx", path.slice(0, -3) + ".js", path.slice(0, -3) + ".jsx"]
    : [path];
  for (const candidate of candidates) if (files.has(candidate)) return candidate;
  return path;
}

function resolveImportPath(importer: string, specifier: string, files: Map<string, string>): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const rawBase = posix.normalize(posix.join(posix.dirname(importer), specifier));
  const base = rawBase.replace(/\.(?:m|c)?js$/i, "").replace(/\.tsx?$/i, "");
  for (const candidate of [base, base + ".ts", base + ".tsx", base + ".js", base + ".jsx", posix.join(base, "index.ts"), posix.join(base, "index.tsx"), posix.join(base, "index.js")]) {
    if (files.has(candidate)) return candidate;
  }
  return undefined;
}
