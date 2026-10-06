import { z } from "zod";

export const PUBLIC_API_VERSION = "1.0.0" as const;

const evidenceSchema = z.object({
  kind: z.string(),
  filePath: z.string().optional(),
  startLine: z.number().int().nonnegative().optional(),
  endLine: z.number().int().nonnegative().optional(),
  text: z.string().optional(),
  resolver: z.string().optional(),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
}).passthrough();

const graphNodeSchema = z.object({ id: z.string(), type: z.string(), attributes: z.record(z.string(), z.unknown()) }).passthrough();
const graphEdgeSchema = z.object({ id: z.string(), source: z.string(), target: z.string(), type: z.string(), confidence: z.enum(["EXACT", "HIGH", "MEDIUM", "LOW"]), evidence: z.array(evidenceSchema), sourceCommit: z.string() }).passthrough();

export const graphSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  analyzerVersion: z.string(),
  repository: z.string(),
  commit: z.string(),
  configurationFingerprint: z.string(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  metadata: z.record(z.string(), z.unknown())
}).passthrough();

export const changeIntelligenceSchema = z.object({
  schemaVersion: z.literal(1),
  intelligence: z.object({
    schemaVersion: z.literal(1),
    source: z.unknown(),
    base: z.string(),
    head: z.string(),
    mergeBase: z.string(),
    changedPathCount: z.number().int().nonnegative(),
    changedPaths: z.array(z.unknown()),
    commits: z.array(z.string()),
    diff: z.unknown(),
    changedSymbolIds: z.array(z.string()),
    removedSymbolIds: z.array(z.string()),
    impact: z.array(z.unknown()),
    affectedSymbolIds: z.array(z.string()),
    testGaps: z.unknown(),
    testImpact: z.unknown(),
    executionPlan: z.unknown(),
    risk: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
    reasons: z.array(z.string()),
    uncertainty: z.array(z.object({ code: z.string(), message: z.string(), confidence: z.enum(["EXACT", "HIGH", "MEDIUM", "LOW"]) }).passthrough()),
    evidence: z.array(evidenceSchema)
  }).passthrough(),
  deterministic: z.literal(true)
}).passthrough();

export const impactSchema = z.object({ nodeId: z.string(), level: z.string(), path: z.array(z.unknown()), evidence: z.array(evidenceSchema) }).passthrough();
export const testImpactSchema = z.object({
  changedSymbols: z.number().int().nonnegative(),
  affectedSymbols: z.number().int().nonnegative(),
  impactedTestCases: z.number().int().nonnegative(),
  impactedTestFiles: z.number().int().nonnegative(),
  impactedTestProjects: z.number().int().nonnegative(),
  runnableCommands: z.array(z.object({ testProjectId: z.string(), executable: z.string(), args: z.array(z.string()), cwd: z.string() }).passthrough()),
  impacts: z.array(z.unknown())
}).passthrough();
export const executionPlanSchema = z.object({ schemaVersion: z.literal(1), workflow: z.string(), repository: z.string(), commit: z.string(), steps: z.array(z.unknown()) }).passthrough();
export const evidenceSchemaPublic = evidenceSchema;
export const publicErrorSchema = z.object({ error: z.object({ code: z.string(), message: z.string(), details: z.record(z.string(), z.unknown()).optional() }).passthrough() }).passthrough();

export const publicContractRegistry = Object.freeze({
  apiVersion: PUBLIC_API_VERSION,
  graphSnapshot: graphSnapshotSchema,
  changeIntelligence: changeIntelligenceSchema,
  impact: impactSchema,
  testImpact: testImpactSchema,
  executionPlan: executionPlanSchema,
  evidence: evidenceSchemaPublic,
  error: publicErrorSchema
});

export type PublicApiVersion = typeof PUBLIC_API_VERSION;
export type GraphSnapshotContract = z.infer<typeof graphSnapshotSchema>;
export type ChangeIntelligenceContract = z.infer<typeof changeIntelligenceSchema>;
export type ImpactContract = z.infer<typeof impactSchema>;
export type TestImpactContract = z.infer<typeof testImpactSchema>;
export type ExecutionPlanContract = z.infer<typeof executionPlanSchema>;
export type EvidenceContract = z.infer<typeof evidenceSchemaPublic>;
export type PublicErrorContract = z.infer<typeof publicErrorSchema>;

export function validatePublicContract(name: keyof typeof publicContractRegistry, value: unknown): unknown {
  if (name === "apiVersion") return PUBLIC_API_VERSION;
  return publicContractRegistry[name].parse(value);
}
