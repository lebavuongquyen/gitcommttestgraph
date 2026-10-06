# CLI Reference — 0.9.6 Preview

The CLI is machine-readable by default for analysis commands.

## Core commands

- `gctg status`
- `gctg config`
- `gctg ecosystem [commit]`
- `gctg monorepo [commit] [changedNodeId...]`
- `gctg historical-intelligence <from> [to] --max-commits N`
- `gctg ci [COMMIT <commit>|BRANCH <base> [head]] --format json|sarif|summary`
- `gctg diagnostics [commit]`
- `gctg change-intelligence [COMMIT <commit>|BRANCH <base> [head]]`
- `gctg impact <commit> <nodeId...>`
- `gctg test-impact [commit] [--package name]`
- `gctg test-gaps [commit] [--package name]`
- `gctg workflow [commit]`
- `gctg execution-plan [commit] --format json|yaml|md|mermaid`
- `gctg run-plan [commit]`
- `gctg execution-feedback [commit]`
- `gctg tests [commit]`
- `gctg serve [port]`

Execution commands retain explicit approval boundaries.
