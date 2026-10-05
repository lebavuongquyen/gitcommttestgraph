import type { SemanticSourceAnalyzer, SourceAnalysis, SourceFileInput, SourceProjectInput } from "../../../application/ports/source-analyzer.js";
import { TypeScriptProjectAnalyzer } from "./semantic-project-analyzer.js";

export class TypeScriptSemanticAnalyzer implements SemanticSourceAnalyzer {
  private readonly projectAnalyzer = new TypeScriptProjectAnalyzer();

  analyzeProject(input: SourceProjectInput, commit: string): SourceAnalysis {
    return this.projectAnalyzer.analyzeProject(input, commit);
  }

  analyze(input: SourceFileInput, commit: string): SourceAnalysis {
    return this.projectAnalyzer.analyze([input], commit);
  }
}
