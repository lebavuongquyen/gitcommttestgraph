# Extension Guide — 0.9.6 Preview

## Extension boundary

Add capabilities in this order:

1. domain model;
2. application service;
3. application tests;
4. GUI surface;
5. MCP adapter;
6. CLI/HTTP adapters where applicable;
7. public contract if externally consumed;
8. documentation and changelog;
9. quality/release gate.

## Do not

- duplicate domain logic in MCP/CLI/HTTP;
- import infrastructure from public SDK consumers;
- invent graph relationships without evidence;
- weaken execution approval boundaries;
- silently reinterpret existing public schema fields.

## Compatibility

0.9.x is additive. Major architectural changes are reserved for the post-0.9 re-audit and 1.0 planning.
