import test from "node:test";
import assert from "node:assert/strict";
import { InterruptedOperationRecoveryService } from "../../dist/application/recovery/interrupted-operation-recovery-service.js";

function setup(state) {
  const calls = [];
  const journal = {
    async load() { return state; },
    async save() {},
    async clear() { calls.push("clear"); }
  };
  const records = new Map(state ? [[state.operationId, { id: state.operationId, name: state.operationName, state: "running", startedAt: state.startedAt, metadata: {} }]] : []);
  const operations = {
    get(id) { return records.get(id); },
    begin(name, metadata) { const r={id:"resume-1",name,state:"queued",startedAt:new Date().toISOString(),metadata};records.set(r.id,r);return r; },
    start(id){records.set(id,{...records.get(id),state:"running"});},
    succeed(id){records.set(id,{...records.get(id),state:"succeeded"});},
    cancel(id){records.set(id,{...records.get(id),state:"cancelled"});},
    recover(id){records.set(id,{...records.get(id),state:"recovered"});},
    list(){return [...records.values()];},
    fail(){}
  };
  const history = { async record(){ calls.push("history"); } };
  const service = new InterruptedOperationRecoveryService("/repo", journal, operations, history, async commit => { calls.push("resume:"+commit); });
  return { service, calls };
}

test("RCV04 reports no interrupted operation without a journal", async () => {
  const { service } = setup(null);
  assert.deepEqual(await service.status(), { status: "none", journal: null });
});

test("RCV04 resumes an interrupted operation idempotently and clears journal", async () => {
  const state={schemaVersion:1,operationId:"op-1",operationName:"index",commit:"abc",phase:"analyzing",startedAt:"2026-10-07T00:00:00.000Z",updatedAt:"2026-10-07T00:01:00.000Z",metadata:{}};
  const { service, calls } = setup(state);
  const result=await service.resume();
  assert.equal(result.status,"resumed");
  assert.deepEqual(calls.filter(x=>x.startsWith("resume:")),["resume:abc"]);
  assert.ok(calls.includes("clear"));
});

test("RCV04 rollback clears interrupted journal and stale lock", async () => {
  const state={schemaVersion:1,operationId:"op-1",operationName:"index",commit:"abc",phase:"locked",startedAt:"2026-10-07T00:00:00.000Z",updatedAt:"2026-10-07T00:01:00.000Z",metadata:{}};
  const { service, calls } = setup(state);
  const result=await service.rollback();
  assert.equal(result.status,"rolled_back");
  assert.ok(calls.includes("clear"));
});
