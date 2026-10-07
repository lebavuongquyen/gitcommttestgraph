# Getting Started with Git Commit Test Graph

## Who is this guide for?

This guide is for:

- Fresher developers
- Junior developers
- Developers seeing GCTG for the first time
- Team members who want to understand a change before running tests
- Developers who prefer a GUI instead of memorizing CLI commands

You do **not** need to know MCP, graph theory, compiler internals, or AI agents.

If you are unsure what to do, follow the **First Session** section from top to bottom.

---

## 1. What is GCTG?

Git Commit Test Graph (GCTG) is a developer tool that connects:

**Git → changed code → affected code → tests → execution plan**

Imagine you changed this:

```text
src/payment/CheckoutService.ts
        ↓
CheckoutService.calculateTotal()
        ↓
OrderService.createOrder()
        ↓
checkout tests
```

Instead of manually guessing which tests are relevant, GCTG builds a semantic graph and shows the relationship.

GCTG is useful for code review, test selection, impact analysis, branch review, and repository understanding.

### What GCTG is not

GCTG is not:

- Git itself
- A replacement for Jest, Vitest, PHPUnit, etc.
- Runtime code coverage
- A replacement for CI
- An AI coding agent

It can tell you **which tests appear relevant** and **which commands can be executed**, but that is different from saying a change is fully tested.

---

# 2. First Session: use the GUI

This is the recommended starting point.

## Step 1 — Make sure Node.js and Git are installed

Run:

```bash
node --version
git --version
```

Node.js 20 or newer is required.

---

## Step 2 — Build GCTG

If you are running GCTG from its source repository:

```bash
npm install
npm run build
```

After this, the CLI entry point is available through the repository's GCTG executable.

---

## Step 3 — Open the Git repository you want to analyze

GCTG analyzes the repository from your current working directory.

Example:

```bash
cd E:\10_Learning\Javascript\GitCommitterGraph
```

For another project, replace the path:

```bash
cd C:\Projects\my-app
```

Make sure that directory is a Git repository:

```bash
git status
```

---

## Step 4 — Check GCTG

Run:

```bash
gctg status
```

If the command reports that the repository is usable, continue.

If you get an error, see [Troubleshooting](#10-troubleshooting).

---

## Step 5 — Start the GUI

Run:

```bash
gctg serve 3717
```

The terminal prints the local address.

Open that address in your browser.

Keep the terminal running while using the GUI.

---

# 3. Understanding the GUI

The screen is divided into three main areas.

## Left — Recent commits

This is your Git history.

Choose the commit you want to understand.

For a first test, choose a recent commit that changed application code.

## Center — Graph

The center shows the useful change-impact neighborhood.

You may see:

- Git commit evidence
- Changed symbols
- Affected symbols
- Test nodes
- Relationships between them

The graph deliberately does not display every node in a large repository.

### Colors / visual meaning

The GUI distinguishes at least:

- **Changed** — directly associated with the selected change
- **Affected** — semantically impacted by the change
- **Test** — a test-related node

Click a node to inspect it.

## Right — Inspector

The right panel contains the information you need to decide what to do next.

Important sections include:

- Repository / ecosystem information
- Configuration
- Diagnostics
- Test gaps
- Change intelligence
- Branch review
- Pull Request intelligence
- Test impact
- Execution
- Recovery

If a panel says **Loading**, give the server a moment and use **Refresh** if needed.

---

# 4. Your first useful workflow

After opening the GUI, use this workflow:

```text
1. Select commit
      ↓
2. Look at Changed nodes
      ↓
3. Click an important node
      ↓
4. Read Affected nodes
      ↓
5. Open Test impact
      ↓
6. Open Execution
      ↓
7. Review the suggested commands
      ↓
8. Run impacted tests when appropriate
```

This is the core GCTG workflow.

---

# 5. "I changed code. Which tests should I run?"

There are two ways.

## GUI — recommended

1. Select the commit.
2. Find **Test impact** on the right.
3. Inspect the impacted tests.
4. Open **Execution**.
5. Review the execution plan.
6. Use **Run impacted tests** when you are ready.

The execution panel keeps runtime feedback so you can see whether a step passed, failed, or is still running.

## CLI

You can inspect the same information from a terminal:

```bash
gctg test-impact HEAD
gctg execution-plan HEAD --format md
```

---

# 6. "What exactly did this commit change?"

Start with:

```bash
gctg diff <from-commit> <to-commit>
```

For semantic change intelligence:

```bash
gctg change-intelligence COMMIT HEAD
```

A commit SHA can be replaced with a branch or another supported Git reference where appropriate.

---

# 7. "Does this change have test gaps?"

Run:

```bash
gctg test-gaps HEAD
```

Think of this as:

> "Which changed/affected areas do not have an obvious corresponding test relationship?"

This is **static analysis**, not runtime coverage.

A reported gap does not automatically mean the code is untested. It means GCTG could not establish the expected graph relationship.

---

# 8. "I have a feature branch. Is it safe to review?"

Use Branch Intelligence.

## GUI

1. Select the base branch.
2. Select the head branch.
3. Click **Review branch**.
4. Read the Branch review panel.

The review can show:

- merge-base information
- commit range
- changed symbols
- removed symbols
- affected symbols
- review risk
- uncertainty
- commit-level evidence

## CLI

```bash
gctg branches
gctg branch-review main HEAD
```

Replace `main` with your actual base branch.

---

# 9. "I have a GitHub Pull Request"

You can ask GCTG to analyze a PR:

```bash
gctg pr-review owner/repository 123
```

Example:

```bash
gctg pr-review acme/shop 42
```

For a private repository, configure:

```text
GITHUB_TOKEN
```

The local repository must contain the PR base/head commits or refs before semantic indexing can analyze them.

The GUI provides the same workflow through **owner/repo**, **PR #**, and **Review PR**.

---

# 10. Troubleshooting

## "gctg is not recognized"

If you are running directly from the source repository, make sure you built it:

```bash
npm install
npm run build
```

Then use the repository's CLI entry point or install/package GCTG according to your team's chosen distribution workflow.

## "This is not a Git repository"

Run:

```bash
git status
```

from the project you want to analyze.

If that fails, you are either in the wrong directory or the directory is not a Git repository.

## The GUI does not open

Run:

```bash
gctg serve 3717
```

Keep the terminal open.

Use the exact local address printed by GCTG.

If another process already uses the port, try another one:

```bash
gctg serve 3718
```

## The graph is empty

First:

1. Select a commit.
2. Confirm the repository has source files.
3. Run indexing if required:

```bash
gctg index HEAD
```

4. Refresh the GUI.

## A test is not shown

Remember that GCTG performs semantic/static analysis.

A test may not appear if the repository structure, naming, configuration, or semantic relationship does not provide enough evidence.

Check:

```bash
gctg tests HEAD
gctg test-impact HEAD
```

## An operation was interrupted

Open **Recovery** in the GUI.

You may see:

- **Resume interrupted**
- **Rollback interrupted**

Use **Resume interrupted** when you want GCTG to deterministically continue the recorded indexing operation.

Use **Rollback interrupted** when you want to clear the interrupted GCTG operation state.

Both actions require confirmation.

GCTG recovery modifies only GCTG-owned state under `.gctg/`; it does not rewrite Git history.

---

# 11. What is the .gctg folder?

GCTG stores its own state under:

```text
.gctg/
```

This is separate from Git history.

The folder can contain graph snapshots, semantic cache data, results, configuration, operations and recovery state.

Do not manually edit these files unless you understand the relevant GCTG documentation.

Recovery features are provided for controlled backup, repair and interrupted-operation handling.

---

# 12. CLI cheat sheet

If you remember only these commands, you can already use GCTG effectively:

| I want to... | Command |
| --- | --- |
| Check the repository | `gctg status` |
| See recent commits | `gctg commits` |
| Index a commit | `gctg index HEAD` |
| See the graph | `gctg graph HEAD` |
| See a diff | `gctg diff <from> <to>` |
| Find affected tests | `gctg test-impact HEAD` |
| Find possible test gaps | `gctg test-gaps HEAD` |
| See an execution plan | `gctg execution-plan HEAD --format md` |
| Run the plan | `gctg run-plan HEAD` |
| See execution feedback | `gctg execution-feedback HEAD` |
| Review a branch | `gctg branch-review main HEAD` |
| Review a GitHub PR | `gctg pr-review owner/repo 123` |
| Start GUI | `gctg serve 3717` |
| Start MCP server | `gctg-mcp` |

---

# 13. What should I learn next?

You can stop here if your goal is simply to use GCTG.

When you want more:

### Developer

Read:

- CLI Reference
- API Reference
- Integration Guide

### CI / DevOps

Read:

- Integration Guide
- CI command documentation
- Security model

### AI agent / MCP developer

Read:

- MCP Reference
- Integration Guide
- SDK Preview

### GCTG contributor

Read:

- Architecture documentation
- Extension Guide
- Versioning policy
- 0.10 feature documents

---

# 14. The one-minute explanation for a new teammate

If you need to explain GCTG to someone else:

> **GCTG looks at Git changes, understands the code relationships around those changes, connects them to relevant tests, and shows what should be reviewed or run. Start with the GUI by running `gctg serve 3717`.**

That is enough to get started.
