# Agent Task Protocol

## Purpose

The Agent Task Protocol turns graph, impact, test-gap, execution-plan and runtime evidence into a deterministic lifecycle for software-engineering agents.

The protocol is layered above the graph core. It does not modify source files, Git history, package metadata or external systems.

## Lifecycle

`ANALYZING -> AWAITING_EXECUTION_APPROVAL -> EXECUTING -> COMPLETED`

A task can complete as `INCONCLUSIVE` without runtime execution. Static analysis must never be reported as runtime PASS.

## Policy

- `allowExecution=false` is the safe default.
- `requireAllImpactedTests` controls whether every runnable impacted test must pass before SAFE.
- `failOnUnknown` turns UNKNOWN coverage into an UNSAFE condition.
- `failOnNoCommand` turns impacted projects without commands into an UNSAFE condition.
- `maxExecutionSteps` bounds execution.

## MCP tools

### agent_analyze_change

Read-only. Builds a task from a commit and returns:
- changed symbols
- graph diff
- test gaps
- test impact
- execution plan
- decision
- reasons
- uncertainty

### agent_execute_task

Side-effecting. Requires the stored task policy to explicitly set `allowExecution=true`. It executes only the generated structured execution plan.

### agent_task_result

Read-only. Retrieves the current task state held by the MCP server process.

## Decision semantics

- SAFE: policy conditions are satisfied and required runtime evidence passed.
- UNSAFE: a policy failure or runtime failure/blocking evidence exists.
- INCONCLUSIVE: additional evidence is required, most commonly because runtime execution was not authorized.

## Safety boundary

The agent task service never edits source code and never creates Git commits. Test execution is the only side-effecting operation exposed by this protocol.

The protocol deliberately separates analysis from execution so an AI agent can inspect a plan before crossing the execution boundary.
