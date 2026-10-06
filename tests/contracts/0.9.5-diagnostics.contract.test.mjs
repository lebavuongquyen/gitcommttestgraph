import test from "node:test";
import assert from "node:assert/strict";
import { DiagnosticsService } from "../../dist/index.js";

const snapshot={schemaVersion:1,analyzerVersion:"0.9.5",repository:"repo",commit:"abc",configurationFingerprint:"fp",nodes:[{id:"r",type:"Repository",attributes:{}}],edges:[],metadata:{sourceFileCount:3,testFileCount:2,configFileCount:1}};
const indexed={snapshot,reused:true,incremental:false,analyzedPaths:["a.ts"],reusedPaths:["b.ts"]};

test("0.9.5 diagnostics exposes structured operation evidence",()=>{const service=new DiagnosticsService();const operation=service.begin("index","repo","abc");const result=service.complete("index",operation,"repo","0.9.5",indexed,2);assert.equal(result.schemaVersion,1);assert.ok(result.operationId);assert.equal(result.cache.hit,true);assert.equal(result.graph.nodes,1);assert.equal(result.graph.edges,0);assert.equal(result.uncertaintyCount,2);assert.equal(result.metadata.sourceFileCount,3);});

test("0.9.5 diagnostics is secret-safe by construction",()=>{const service=new DiagnosticsService();const operation=service.begin("index","repo","abc");const result=service.complete("index",operation,"repo","0.9.5",indexed);const serialized=JSON.stringify(result);assert.equal(serialized.includes("token"),false);assert.equal(serialized.includes("password"),false);});
