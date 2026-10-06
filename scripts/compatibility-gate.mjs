import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root=process.cwd();
const pkg=JSON.parse(await readFile(join(root,"package.json"),"utf8"));
const cli=await readFile(join(root,"bin","gctg.mjs"),"utf8");
const contracts=await import(pathToFileURL(join(root,"dist","public","contracts.js")).href);
const api=await import(pathToFileURL(join(root,"dist","public","index.js")).href);
const declarations=await readFile(join(root,"dist","public","index.d.ts"),"utf8");

function assert(condition,message){if(!condition)throw new Error(message);console.log("PASS "+message);}

assert(pkg.version==="0.9.7","package is 0.9.7");
assert(contracts.PUBLIC_API_VERSION==="1.0.0","public API version remains 1.0.0");
const names=["graphSnapshot","changeIntelligence","impact","testImpact","executionPlan","historicalIntelligence","ciAnalysis","diagnostics","evidence","error"];
for(const name of names)assert(name in contracts.publicContractRegistry,"contract remains: "+name);
for(const command of ["config","ecosystem","monorepo","historical-intelligence","ci","diagnostics","change-intelligence","impact","test-impact","test-gaps","workflow","execution-plan","run-plan","execution-feedback"]){
  assert(cli.includes('command === "'+command+'"'),"CLI remains: "+command);
}
assert(typeof api.HistoricalIntelligenceService==="function","public historical service remains exported");
assert(typeof api.analyzeMonorepo==="function","public monorepo service remains exported");
assert(typeof api.analyzeRepositoryEcosystem==="function","public ecosystem service remains exported");
assert(declarations.includes("CiAnalysisResult"),"public CI type remains exported");
assert(declarations.includes("OperationDiagnostics"),"public diagnostics type remains exported");
console.log("Compatibility Gate passed for 0.9.7");
