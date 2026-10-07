# Git Commit Test Graph

**Git Commit Test Graph (GCTG)** helps developers understand **what changed, what code is affected, which tests matter, and what should be run** in a Git repository.

You do not need to understand graphs, MCP, or TypeScript internals to start using it.

> **Start here:** [English Getting Started](docs/GETTING-STARTED.md) · [Hướng dẫn tiếng Việt](docs/GETTING-STARTED.vi.md)

## What problem does GCTG solve?

When a developer changes code, the usual questions are:

1. What exactly changed?
2. Which functions/classes/files are affected?
3. Which tests should I care about?
4. What should I run before creating a PR?
5. If a branch contains many commits, what is the real review risk?
6. If GCTG was interrupted while indexing, can I safely recover?

GCTG turns those questions into a visual and machine-readable workflow:

```
Git commit
   v
Code changes
   v
Semantic impact
   v
Affected tests
   v
Execution plan
   v
Review / verification
```

## Quick start - 5 minutes

### 1. Requirements

- Windows, macOS, or Linux
- Node.js 20 or newer
- A Git repository
- Git available in your terminal

Check:

```bash
node --version
git --version
```

### 2. Install and build GCTG

If you are working from this source repository:

```bash
npm install
npm run build
```

### 3. Go to the repository you want to analyze

Run GCTG from the target Git repository:

```bash
cd path/to/your-project
```

For example:

```bash
cd path/to/your-project
```

### 4. Check the repository

```gctg status```

This is the safest first command. It tells you whether GCTG can see the repository and its current state.

### 5. Start the GUI

```gctg serve 3717```

Open the local address printed in the terminal.

The GUI is the recommended way for a first-time user.

### 6. Select a commit

In the GUI:

1. Choose a recent commit.
2. Look at the center graph.
3. Click a changed or affected node.
4. Read the Inspector on the right.
5. Open **Test impact** to see related tests.
6. Open **Execution** to see the suggested test execution plan.

You can now use GCTG without learning the CLI.

## The mental model

You only need to remember five concepts:

| Concept | Meaning |
| --- | --- |
| **Commit** | A point in Git history that GCTG can analyze |
| **Changed** | Code directly changed by that commit |
| **Affected** | Code that may be impacted by the change |
| **Test impact** | Tests that are relevant to the changed/affected code |
| **Execution plan** | The ordered commands GCTG recommends running |

GCTG is an **analysis and engineering workbench**. It does not replace Git, your test runner, or your CI system.

## Common tasks

### "I just made a commit. What should I test?"

```bash
gctg test-impact HEAD
gctg execution-plan HEAD --format md
```

Or use the GUI and open **Test impact** and **Execution**.

### "Show me what changed"

```bash
gctg change-intelligence COMMIT HEAD
```

### "Which tests have gaps?"

```bash
gctg test-gaps HEAD
```

### "Review my branch"

```bash
gctg branches
gctg branch-review main HEAD
```

The GUI also has **base branch**, **head branch**, and **Review branch** controls.

### "Review a GitHub Pull Request"

```bash
gctg pr-review owner/repository 123
```

For private repositories, configure `GITHUB_TOKEN`.

The local repository must contain the PR base/head commits or refs before semantic indexing can analyze them.

### "I want an agent to use GCTG"

Use the MCP server:

```bash
gctg-mcp
```

MCP is intended for AI/software-engineering agents. A normal developer should start with the GUI.

## Recovery

GCTG keeps its own state under `.gctg/`.

Recovery features can:

- create and inspect GCTG backups;
- repair/rebuild recoverable GCTG state;
- detect an interrupted indexing operation;
- resume or safely roll back an interrupted operation.

These operations affect **GCTG-owned state only**. GCTG does not rewrite Git history.

The GUI exposes these under **Recovery**.

## CLI reference

The main commands are:

```text
gctg status
gctg config
gctg commits [limit]
gctg branches
gctg index [commit]
gctg graph [commit] [type]
gctg diff <from> <to>
gctg impact <commit> <nodeId...>
gctg tests [commit]
gctg test-gaps [commit]
gctg test-impact [commit]
gctg workflow [commit]
gctg execution-plan [commit] [--format json|yaml|md|mermaid]
gctg run-plan [commit]
gctg execution-feedback [commit]
gctg change-intelligence [COMMIT <commit>]
gctg branch-review <base> [head]
gctg pr-review <owner/repo> <number>
gctg ci [COMMIT <commit>|BRANCH <base> [head]]
gctg diagnostics [commit]
gctg serve [port]
```

For the complete beginner-friendly workflow, see [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md).

For the detailed CLI reference, see [docs/CLI-REFERENCE-0.9.6.md](docs/CLI-REFERENCE-0.9.6.md).

## GUI-first design

GCTG is designed around this order:

```
Feature
  v
Application / domain behavior
  v
Tests
  v
GUI
  v
MCP
  v
CLI / automation
```

The GUI and MCP use the same application capabilities. MCP is not a second implementation of the feature.

## Documentation map

Start with these documents:

- **[Getting Started](docs/GETTING-STARTED.md)** - for fresher/junior developers and first-time users.
- **[CLI Reference](docs/CLI-REFERENCE-0.9.6.md)** - command reference.
- **[Integration Guide](docs/INTEGRATION-GUIDE-0.9.6.md)** - CI, HTTP, MCP and SDK usage.
- **[SDK Preview](docs/SDK-PREVIEW-0.9.6.md)** - preview package/API integration reference.
- **[Versioning](docs/VERSIONING.md)** - release/version policy.
- **[0.10 recovery documents](docs/)** - detailed implementation and acceptance documents for recovery capabilities.

The older 0.9.6 documents describe the preview-era interfaces. The Getting Started guide is the recommended user entry point.

## Development

From the GCTG source repository:

```bash
npm install
npm run typecheck
npm run build
npm test
```

Node.js 20 or newer is required.

## Release discipline

Every published release must contain a complete feature or maintenance change, complete documentation, and a changelog entry. The release gate is mandatory. See [docs/VERSIONING.md](docs/VERSIONING.md).

## Safety boundary

GCTG analyzes Git history and repository files. Its recovery features operate only on GCTG-owned `.gctg` state and do not modify Git history.

AI is optional. The core graph and impact analysis are deterministic.

For programmatic consumers, the package also exposes the public API through the git-commit-test-graph/api entry point.

