# Performance Guide — 0.9.6 Preview

## Main cost centers

- historical indexing
- semantic analysis
- test graph construction
- Git object reads

## Existing optimizations

- batched historical Git reads;
- semantic cache;
- incremental indexing;
- snapshot reuse;
- index locking for safe concurrent writers.

## Operational guidance

Keep active repositories indexed incrementally. Avoid requesting unnecessarily large historical windows. Use diagnostics to inspect duration, cache state, graph size and analyzed/reused paths.

The release performance gate includes 30, 120 and 300-file scenarios and historical workloads.
