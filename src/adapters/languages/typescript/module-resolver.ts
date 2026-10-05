import ts from "typescript";
import type { ModuleResolutionRequest, ModuleResolutionResult } from "../../../domain/graph/resolution.js";

export class TypeScriptModuleResolver {
  resolve(request: ModuleResolutionRequest): ModuleResolutionResult {
    const compilerOptions: ts.CompilerOptions = {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      baseUrl: request.baseUrl,
      paths: request.pathAliases as ts.MapLike<string[]>
    };
    const host: ts.ModuleResolutionHost = {
      fileExists: file => request.files.has(normalize(file)),
      readFile: () => undefined
    };
    const result = ts.resolveModuleName(request.specifier, request.importer, compilerOptions, host).resolvedModule;
    if (!result) return { target: null, confidence: "LOW", strategy: "typescript" };
    return {
      target: normalize(result.resolvedFileName),
      confidence: "EXACT",
      strategy: "typescript-module-resolution"
    };
  }
}

function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}
