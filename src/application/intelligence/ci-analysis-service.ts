import type { ChangeIntelligenceResult } from "../../domain/change-intelligence.js";
import type { CiAnalysisResult, CiFormat } from "../../domain/ci.js";

export class CiAnalysisService {
  analyze(intelligence: ChangeIntelligenceResult): CiAnalysisResult {
    const x = intelligence.intelligence;
    const status: CiAnalysisResult["status"] = x.risk === "HIGH" ? "FAIL" : x.risk === "UNKNOWN" ? "UNKNOWN" : "PASS";
    return { schemaVersion: 1, repository: x.source.repository, commit: x.head, status, exitCode: status === "FAIL" ? 1 : status === "UNKNOWN" ? 2 : 0, risk: x.risk, reasons: [...x.reasons].sort(), uncertainty: x.uncertainty.map(item => ({ code: item.code, message: item.message })).sort((a,b) => a.code.localeCompare(b.code)), changedPathCount: x.changedPathCount, changedSymbolCount: x.changedSymbolIds.length, impactedTestCases: x.testImpact.impactedTestCases, intelligence, deterministic: true };
  }
  serialize(result: CiAnalysisResult, format: CiFormat): string {
    if (format === "json") return JSON.stringify(result, null, 2);
    if (format === "summary") return ["GCTG CI: " + result.status, "Repository: " + result.repository, "Commit: " + result.commit, "Risk: " + result.risk, "Changed paths: " + result.changedPathCount, "Changed symbols: " + result.changedSymbolCount, "Impacted tests: " + result.impactedTestCases, ...(result.reasons.length ? ["Reasons: " + result.reasons.join("; ")] : [])].join("\n") + "\n";
    const rules = result.reasons.map((message, index) => ({ ruleId: "GCTG-" + String(index + 1).padStart(3, "0"), level: result.status === "FAIL" ? "error" : "warning", message: { text: message }, locations: [{ physicalLocation: { artifactLocation: { uri: result.repository }, region: { startLine: 1 } } }] }));
    return JSON.stringify({ version: "2.1.0", $schema: "https://json.schemastore.org/sarif-2.1.0.json", runs: [{ tool: { driver: { name: "git-commit-test-graph", version: "0.9.4" } }, results: rules }] }, null, 2);
  }
}
