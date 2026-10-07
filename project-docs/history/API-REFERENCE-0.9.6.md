# API Reference — 0.9.6 Preview

Stable programmatic entrypoint: package subpath `git-commit-test-graph/api`.

Public API version: 1.0.0.

## Contract families

- graphSnapshot
- changeIntelligence
- impact
- testImpact
- executionPlan
- historicalIntelligence
- ciAnalysis
- diagnostics
- evidence
- error

Runtime validation is available through the public contract registry. Unknown schema versions fail closed. New fields are additive-compatible; existing fields are not silently reinterpreted.

## Primary capabilities

- analyzeRepositoryEcosystem(snapshot)
- analyzeMonorepo(snapshot, changedNodeIds)
- HistoricalIntelligenceService.analyze(input)

CI and diagnostics are exposed through their typed contracts and operational surfaces. The preview SDK intentionally does not expose infrastructure internals.
