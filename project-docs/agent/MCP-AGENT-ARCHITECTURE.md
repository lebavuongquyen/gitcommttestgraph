# MCP Agent Architecture

## Goal

Expose git-commit-test-graph as a deterministic software-engineering capability layer for AI agents.

The MCP server is an adapter around the existing graph and impact application services. MCP does not own graph truth, semantic analysis, persistence, or process policy.

## Agent tool surface

- repository_status: repository discovery and HEAD.
- commits: recent Git history.
- branches: branch refs and current branch metadata.
- branch_review: deterministic branch merge-readiness analysis.
- pull_request_review: GitHub PR metadata, review/check state, semantic change analysis and merge-readiness.
- graph_query: filtered graph nodes.
- impact_analyze: reverse semantic impact with evidence.
- test_impact: changed symbols to affected tests and commands.
- execution_plan: deterministic plan generation without execution.
- change_intelligence: compact one-call agent context bundle.
- execution_feedback: persisted runtime feedback.
- run_execution_plan: explicit side-effecting impacted-test execution.
- graph-snapshot resource: read-only historical graph snapshot.

## Agent loop

1. repository_status
2. pull_request_review when the agent is reviewing a GitHub PR
3. change_intelligence
4. inspect graph/impact evidence when needed
5. inspect test impact
6. build execution_plan
7. decide whether execution is justified
8. explicitly call run_execution_plan
9. inspect execution_feedback
10. report static evidence separately from runtime evidence

The agent must never infer PASS from static impact alone.

## Safety boundary

Read-only tools are the default.

run_execution_plan is the only MCP tool that executes commands. It uses the existing structured process runner, never shell interpolation, and persists the execution result separately from graph snapshots.

MCP must not mutate source code, Git history, package metadata, or external services.

## Determinism

All graph-derived MCP results use the existing deterministic index, graph diff, impact and execution-plan layers. MCP serialization is an adapter concern.

## Transport

The package exposes gctg-mcp over stdio for local MCP hosts. MCP protocol traffic uses stdout; server diagnostics use stderr.

The implementation targets the current MCP TypeScript server SDK and can later add Streamable HTTP as a separate transport without changing the application layer.

## Future agent capabilities

- change-intelligence resource subscriptions
- execution-result evidence queries
- test-gap prioritization
- multi-commit regression analysis
- agent task planning with explicit approval boundaries
- MCP client mode for delegating work to external specialist agents
- optional remote Streamable HTTP deployment with authentication
