import assert from "node:assert/strict";
import test from "node:test";
import { runCli, withHttpServer, mcpRequest } from "./helpers.mjs";
const root=new URL("../../",import.meta.url).pathname.replace(/^\//,"").replaceAll("/","\\");
test("0.9.5 CLI exposes diagnostics",async()=>{const r=await runCli(root,["diagnostics","HEAD"]);assert.equal(r.code,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.schemaVersion,1);assert.ok(v.operationId);});
test("0.9.5 HTTP exposes diagnostics",async()=>{await withHttpServer(root,37989,async base=>{const r=await fetch(base+"/api/diagnostics?commit=HEAD");assert.equal(r.status,200);const v=await r.json();assert.equal(v.schemaVersion,1);assert.ok(v.graph);});});
test("0.9.5 MCP exposes diagnostics",async()=>{const {responses}=await mcpRequest(root,[{method:"initialize",params:{protocolVersion:"2025-06-18",capabilities:{},clientInfo:{name:"0.9.5-contract",version:"1.0.0"}}},{method:"notifications/initialized",params:{}},{method:"tools/list",params:{}},{method:"tools/call",params:{name:"diagnostics",arguments:{commit:"HEAD"}}}]);assert.ok(responses[2].result.tools.some(x=>x.name==="diagnostics"));assert.equal(responses[3].error,undefined);const v=JSON.parse(responses[3].result.content[0].text);assert.equal(v.schemaVersion,1);});
test("0.9.5 GUI exposes diagnostics",async()=>{await withHttpServer(root,37990,async base=>{const r=await fetch(base+"/");const html=await r.text();assert.equal(r.status,200);assert.match(html,/diagnostics/);assert.match(html,/api\/diagnostics/);});});
