# MCP Reference — 0.9.6 Preview

The MCP server adapts verified application capabilities. It does not implement separate business logic.

## Read-only tools

- configuration
- change_intelligence
- monorepo_intelligence
- historical_intelligence
- diagnostics
- ci_analysis
- repository_ecosystem
- repository_status
- commits
- branches
- branch_review
- pull_request_review
- graph_query
- impact_analyze
- test_impact
- execution_plan
- execution_feedback
- agent_analyze_change
- agent_task_result

## Side-effecting tools

- run_execution_plan — requires explicit approved=true.
- agent_execute_task — execution is governed by the task policy.

## Rule

MCP is an adapter over application services. A new capability must exist and pass application tests before MCP exposure.
