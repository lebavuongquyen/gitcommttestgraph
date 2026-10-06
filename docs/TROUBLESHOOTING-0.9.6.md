# Troubleshooting — 0.9.6 Preview

## Index lock

If an operation reports a lock conflict, wait for the active operation. Stale lock recovery is built into the index lock.

## Missing Git object

Historical analysis fails explicitly when requested Git objects are unavailable. Do not substitute the working tree for historical content.

## Shallow clone

Limited ancestry is reported conservatively. Historical intelligence does not invent missing commits.

## UNKNOWN CI

Exit code 2 means evidence is insufficient. Treat it as a policy decision in CI rather than converting UNKNOWN to PASS.

## MCP execution

Execution requires explicit approval. Read-only analysis should be used first.

## Performance

Prefer incremental indexing and cached snapshots. The release performance gate covers historical reads and semantic cache behavior.
