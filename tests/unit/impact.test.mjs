import assert from "node:assert/strict";
import test from "node:test";
import { createSnapshot, EdgeType, NodeType, Confidence, ImpactEngine, diffSnapshots } from "../../dist/index.js";

const node=(id,type)=>({id,type,attributes:{}});

test("impact follows reverse dependency edges and preserves evidence", () => {
  const snapshot=createSnapshot({
    analyzerVersion:"0.2.0",repository:"repo",commit:"c2",configuration:{},
    nodes:[node("changed",NodeType.SYMBOL),node("caller",NodeType.SYMBOL),node("test",NodeType.TEST_CASE)],
    edges:[
      {id:"e1",source:"caller",target:"changed",type:EdgeType.CALLS,confidence:Confidence.EXACT,evidence:[{kind:"call",filePath:"src/a.ts",startLine:4}],sourceCommit:"c2"},
      {id:"e2",source:"test",target:"caller",type:EdgeType.TESTS,confidence:Confidence.HIGH,evidence:[{kind:"test",filePath:"test/a.ts",startLine:2}],sourceCommit:"c2"}
    ]
  });
  const results=new ImpactEngine().analyze(snapshot,{changedNodeIds:["changed"],targetTypes:[NodeType.TEST_CASE]});
  assert.equal(results.length,1);
  assert.equal(results[0].nodeId,"test");
  assert.equal(results[0].confidence,Confidence.HIGH);
  assert.equal(results[0].evidence.length,2);
});

test("graph diff distinguishes semantic node changes", () => {
  const a=createSnapshot({analyzerVersion:"0.2.0",repository:"repo",commit:"a",configuration:{},nodes:[node("x",NodeType.FILE)],edges:[]});
  const b=createSnapshot({analyzerVersion:"0.2.0",repository:"repo",commit:"b",configuration:{},nodes:[{...node("x",NodeType.FILE),attributes:{value:1}},node("y",NodeType.FILE)],edges:[]});
  const d=diffSnapshots(a,b);
  assert.deepEqual(d.addedNodes,["y"]);
  assert.deepEqual(d.changedNodes,["x"]);
});
