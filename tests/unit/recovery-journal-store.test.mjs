import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonRecoveryJournalStore } from "../../dist/infrastructure/persistence/json-recovery-journal-store.js";

test("RCV04 journal persists atomically and reloads", async () => {
  const root=await mkdtemp(join(tmpdir(),"gctg-rcv04-"));
  const store=new JsonRecoveryJournalStore();
  const state={schemaVersion:1,operationId:"op",operationName:"index",commit:"abc",phase:"analyzing",startedAt:"2026-10-07T00:00:00.000Z",updatedAt:"2026-10-07T00:01:00.000Z",metadata:{commit:"abc"}};
  await store.save(root,state);
  assert.deepEqual(await store.load(root),state);
  assert.equal(await readFile(join(root,".gctg","recovery.json.tmp"),"utf8").catch(()=>null),null);
  await store.clear(root);
  assert.equal(await store.load(root),null);
});
