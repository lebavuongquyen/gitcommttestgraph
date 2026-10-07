# GCTG CLI Reference

This is the command-line reference for Git Commit Test Graph (GCTG) 0.10.x.

## Requirements

- Node.js 20 or newer
- Git available in PATH
- A Git repository when using repository commands

GCTG does not require a native executable. The CLI is exposed by the npm package as the `gctg` command and works on Windows, macOS, and Linux.

## Installation

### npm global install

```bash
npm install -g git-commit-test-graph
```

Then:

```bash
gctg --version
gctg --help
```

### pnpm global install

```bash
pnpm add -g git-commit-test-graph
```

Then:

```bash
gctg --version
gctg --help
```

### One-off execution

Without a global installation:

```bash
npx git-commit-test-graph --help
```

or:

```bash
pnpm dlx git-commit-test-graph --help
```

All four installation modes use the same `gctg` CLI implementation.

## Running GCTG

Run GCTG from the Git repository you want to analyze:

```bash
cd path/to/your-project
gctg status
```

GCTG uses the current working directory as the repository root.

## Global options

### `gctg --help`

Shows the command reference and exits successfully.

Aliases:

```text
gctg help
gctg -h
```

### `gctg --version`

Prints the installed GCTG version.

Alias:

```text
gctg -v
```

## Repository commands

### `gctg status`

Shows the repository root, current HEAD and workspace files.

Output is JSON.

### `gctg commits [limit]`

Lists recent commits. The default limit is 20.

### `gctg branches`

Lists branches and identifies the current branch.

### `gctg config`

Shows the effective GCTG configuration and its sources.

### `gctg index [commit]`

Indexes a commit. Defaults to HEAD.

The result includes whether an existing snapshot was reused, node/edge counts and snapshot metadata.

### `gctg graph [commit] [type]`

Prints the indexed graph.

If a node type is supplied, only nodes of that type are returned.

### `gctg diff <from> <to>`

Compares two semantic graph snapshots.

### `gctg tests [commit]`

Lists test-related graph nodes.

## Change and impact analysis

### `gctg impact <commit> <nodeId...>`

Analyzes downstream impact for one or more graph nodes.

### `gctg test-gaps [commit]`

Finds possible test-coverage relationships that GCTG could not establish.

Optional package filter:

```bash
gctg test-gaps HEAD --package package-name
```

This is static graph analysis, not runtime coverage.

### `gctg test-impact [commit]`

Analyzes tests related to changed symbols.

Optional package filter:

```bash
gctg test-impact HEAD --package package-name
```

### `gctg workflow [commit]`

Builds the machine-readable change-to-test workflow graph.

### `gctg change-intelligence COMMIT <commit>`

Analyzes semantic change intelligence for a commit.

### `gctg change-intelligence BRANCH <base> [head]`

Analyzes semantic change intelligence between branches.

### `gctg branch-review <base> [head]`

Reviews a branch against a base branch.

### `gctg pr-review <owner/repo> <number>`

Reviews a GitHub Pull Request.

For private repositories, configure `GITHUB_TOKEN`. The required PR base/head commits must be available to the local Git repository.

### `gctg historical-intelligence <from> [to] [--max-commits N]`

Analyzes bounded historical changes across commit snapshots.

### `gctg monorepo [commit]`

Analyzes repository package/workspace topology.

### `gctg ecosystem [commit]`

Analyzes the detected repository ecosystem.

## Test execution workflow

### `gctg execution-plan [commit] --format <format>`

Builds an execution plan.

Supported formats:

- `json`
- `yaml`
- `md`
- `mermaid`

Example:

```bash
gctg execution-plan HEAD --format md
```

### `gctg run-plan [commit]`

Runs the generated execution plan and records execution feedback.

### `gctg execution-feedback [commit]`

Reads the latest stored execution feedback.

### `gctg run <executable> [args...] --allow-execution`

Runs an explicitly approved process from the current repository.

The `--allow-execution` flag is mandatory.

## CI and diagnostics

### `gctg ci [COMMIT <commit>|BRANCH <base> [head]] --format <format>`

Runs CI-oriented change analysis.

Formats:

- `json`
- `sarif`
- `summary`

The command uses exit codes suitable for automation.

### `gctg diagnostics [commit]`

Produces machine-readable indexing diagnostics.

## GUI

### `gctg serve [port]`

Starts the local GCTG GUI/HTTP server.

Default port:

```text
3717
```

Example:

```bash
gctg serve 3717
```

Keep the terminal running while using the GUI.

## MCP

The MCP server is exposed separately:

```bash
gctg-mcp
```

The MCP surface reuses the same application capabilities as the GUI and CLI.

## Exit behavior

For automation:

- `0` means the command completed successfully.
- `1` means the command failed or the requested operation reported failure.
- `2` is used for invalid command/usage input.
- CI analysis may use its documented PASS/FAIL/UNKNOWN exit semantics.

## Safe first workflow

For a first repository:

```bash
gctg --version
gctg --help
gctg status
gctg commits 10
gctg index HEAD
gctg test-impact HEAD
gctg execution-plan HEAD --format md
gctg serve 3717
```

The GUI is recommended for first-time users. The CLI is intended for terminal workflows, scripting, CI and automation.
