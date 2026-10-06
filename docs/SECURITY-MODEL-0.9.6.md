# Security Model — 0.9.6 Preview

GCTG follows fail-closed security boundaries.

- Git references and repository identifiers are validated.
- Sensitive child-process environment variables are not inherited by default.
- HTTP request bodies are bounded.
- Internal HTTP failures are sanitized.
- Execution requires explicit approval.
- MCP execution requires approved=true.
- CLI execution requires --allow-execution.
- Diagnostics do not copy credentials or command output.
- Unknown environments are not converted into positive intelligence.

Security gates are part of the release gate for every supported 0.9.x release.
