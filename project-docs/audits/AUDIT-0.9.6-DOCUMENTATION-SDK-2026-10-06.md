# Audit 0.9.6 — Documentation and SDK Preview

## Objective

Turn the 0.9.x public capability set into a coherent documentation and SDK-preview surface without adding new architecture.

## Findings

- Public API contracts existed but were not documented as a single consumer reference.
- MCP and CLI capabilities had grown across milestones without a unified reference.
- Integration, troubleshooting, performance, security and extension guidance were fragmented.
- CI and diagnostics types were not exported from the public API type surface.
- SDK preview compatibility rules were not explicit.

## Resolution

Added the complete 0.9.6 documentation set and exported CiAnalysisResult, CiFormat and OperationDiagnostics from the public API.

The SDK preview is intentionally limited to package subpath git-commit-test-graph/api. Internal modules remain unsupported.

## Documentation set

API reference, MCP reference, CLI reference, integration guide, troubleshooting guide, performance guide, security model, extension guide and SDK preview.

## Self-attack

- documentation completeness;
- README discoverability;
- public API export completeness;
- preview compatibility boundary.

Dedicated 0.9.6 documentation contracts: 3/3 PASS.

## Deferred

No new architecture capability is introduced. Compatibility and architecture completion remain 0.9.7 and the mandatory 0.9 → 0.10 re-audit.
