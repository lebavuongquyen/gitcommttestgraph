import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const docs=["API-REFERENCE-0.9.6.md","MCP-REFERENCE-0.9.6.md","CLI-REFERENCE-0.9.6.md","INTEGRATION-GUIDE-0.9.6.md","TROUBLESHOOTING-0.9.6.md","PERFORMANCE-GUIDE-0.9.6.md","SECURITY-MODEL-0.9.6.md","EXTENSION-GUIDE-0.9.6.md","SDK-PREVIEW-0.9.6.md"];

test("0.9.6 documentation set is complete",async()=>{for(const name of docs){const text=await readFile(new URL("../../docs/"+name,import.meta.url),"utf8");assert.ok(text.length>200,name);}});
test("0.9.6 README documents preview references",async()=>{const text=await readFile(new URL("../../README.md",import.meta.url),"utf8");assert.match(text,/SDK-PREVIEW-0\.9\.6\.md/);assert.match(text,/git-commit-test-graph\/api/);});
test("0.9.6 public API exports CI and diagnostics types",async()=>{const text=await readFile(new URL("../../src/public/index.ts",import.meta.url),"utf8");assert.match(text,/CiAnalysisResult/);assert.match(text,/OperationDiagnostics/);});
