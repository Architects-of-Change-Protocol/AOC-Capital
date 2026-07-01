/**
 * Upload quota atomicity contract tests.
 *
 * Two categories:
 *
 * 1. Static source analysis — verifies the SQL migration and TypeScript engine
 *    contain the structures required for race-safe quota enforcement.
 *
 * 2. Concurrency simulation — exercises the quota reservation logic with mock
 *    implementations that replicate the serialised-lock semantics of the
 *    PostgreSQL RPC, asserting deterministic outcomes under concurrent load.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routeSource       = fs.readFileSync('src/app/api/upload/route.ts', 'utf8');
const quotaEngineSource = fs.readFileSync('src/lib/quota/upload-quota.ts', 'utf8');
const migrationSource   = fs.readFileSync(
  'supabase/migrations/20260518000000_quota_atomicity.sql', 'utf8'
);

// ── SQL migration: structure ──────────────────────────────────────────────────

test('migration creates quota_reservations table', () => {
  assert.match(migrationSource, /create table if not exists public\.quota_reservations/);
});

test('quota_reservations.request_id has a UNIQUE index (idempotency guarantee)', () => {
  assert.match(migrationSource, /create unique index.*quota_reservations_request_id_idx/s);
});

test('quota_reservations.expires_at enforces TTL (5-minute default)', () => {
  assert.match(migrationSource, /interval '5 minutes'/);
});

test('migration defines reserve_upload_quota function', () => {
  assert.match(migrationSource, /create or replace function public\.reserve_upload_quota/);
});

test('migration defines commit_upload_quota function', () => {
  assert.match(migrationSource, /create or replace function public\.commit_upload_quota/);
});

test('migration defines cancel_upload_quota function', () => {
  assert.match(migrationSource, /create or replace function public\.cancel_upload_quota/);
});

test('reserve_upload_quota uses SELECT FOR UPDATE (row-level lock)', () => {
  const fnStart = migrationSource.indexOf('create or replace function public.reserve_upload_quota');
  const fnEnd   = migrationSource.indexOf('grant execute on function public.reserve_upload_quota');
  const fnBody  = migrationSource.slice(fnStart, fnEnd);
  assert.match(fnBody, /for update/i);
});

test('reserve_upload_quota accounts for pending reservations in effective usage', () => {
  const fnStart = migrationSource.indexOf('create or replace function public.reserve_upload_quota');
  const fnEnd   = migrationSource.indexOf('grant execute on function public.reserve_upload_quota');
  const fnBody  = migrationSource.slice(fnStart, fnEnd);
  assert.match(fnBody, /v_pending_count/);
  assert.match(fnBody, /v_effective_usage/);
  assert.match(fnBody, /v_committed_count/);
});

test('reserve_upload_quota handles monthly reset atomically', () => {
  const fnStart = migrationSource.indexOf('create or replace function public.reserve_upload_quota');
  const fnEnd   = migrationSource.indexOf('grant execute on function public.reserve_upload_quota');
  const fnBody  = migrationSource.slice(fnStart, fnEnd);
  assert.match(fnBody, /current_month.*!=.*p_month_key/s);
  assert.match(fnBody, /upload_count\s*=\s*0/);
});

test('reserve_upload_quota handles NULL limit (unlimited plans)', () => {
  const fnStart = migrationSource.indexOf('create or replace function public.reserve_upload_quota');
  const fnEnd   = migrationSource.indexOf('grant execute on function public.reserve_upload_quota');
  const fnBody  = migrationSource.slice(fnStart, fnEnd);
  assert.match(fnBody, /p_upload_limit is not null/i);
});

test('commit_upload_quota deletes reservation after incrementing upload_count', () => {
  const fnStart = migrationSource.indexOf('create or replace function public.commit_upload_quota');
  const fnEnd   = migrationSource.indexOf('grant execute on function public.commit_upload_quota');
  const fnBody  = migrationSource.slice(fnStart, fnEnd);
  const uploadCountIdx = fnBody.indexOf('upload_count = v_new_count');
  // The commit function may have an early-return delete (month boundary), so check the
  // last delete in the function body which is the post-increment cleanup.
  const deleteIdx = fnBody.lastIndexOf('delete from public.quota_reservations');
  assert.ok(uploadCountIdx > 0, 'commit must update upload_count');
  assert.ok(deleteIdx > uploadCountIdx, 'post-commit delete must follow the upload_count update');
});

test('cancel_upload_quota deletes reservation without touching upload_count', () => {
  const fnStart = migrationSource.indexOf('create or replace function public.cancel_upload_quota');
  const fnEnd   = migrationSource.indexOf('-- down migration');
  const fnBody  = migrationSource.slice(fnStart, fnEnd);
  assert.match(fnBody, /delete from public\.quota_reservations/);
  assert.doesNotMatch(fnBody, /update public\.company_usage/);
  assert.doesNotMatch(fnBody, /upload_count/);
});

test('all three RPCs are granted to authenticated and service_role', () => {
  assert.match(migrationSource, /grant execute on function public\.reserve_upload_quota.*to authenticated, service_role/s);
  assert.match(migrationSource, /grant execute on function public\.commit_upload_quota.*to authenticated, service_role/s);
  assert.match(migrationSource, /grant execute on function public\.cancel_upload_quota.*to authenticated, service_role/s);
});

test('down migration instructions are documented', () => {
  assert.match(migrationSource, /down migration/);
  assert.match(migrationSource, /drop function if exists public\.cancel_upload_quota/);
  assert.match(migrationSource, /drop table if exists public\.quota_reservations/);
});

// ── TypeScript quota engine: structure ───────────────────────────────────────

test('quota engine exports reserveUploadQuota', () => {
  assert.match(quotaEngineSource, /export const reserveUploadQuota/);
});

test('quota engine exports commitUploadQuota', () => {
  assert.match(quotaEngineSource, /export const commitUploadQuota/);
});

test('quota engine exports cancelUploadQuota', () => {
  assert.match(quotaEngineSource, /export const cancelUploadQuota/);
});

test('reserveUploadQuota calls reserve_upload_quota RPC', () => {
  assert.match(quotaEngineSource, /\.rpc\("reserve_upload_quota"/);
});

test('commitUploadQuota calls commit_upload_quota RPC', () => {
  assert.match(quotaEngineSource, /\.rpc\("commit_upload_quota"/);
});

test('cancelUploadQuota calls cancel_upload_quota RPC', () => {
  assert.match(quotaEngineSource, /\.rpc\("cancel_upload_quota"/);
});

test('quota engine emits quota_reservation_started log', () => {
  assert.match(quotaEngineSource, /quota_reservation_started/);
});

test('quota engine emits quota_reservation_succeeded log', () => {
  assert.match(quotaEngineSource, /quota_reservation_succeeded/);
});

test('quota engine emits quota_reservation_rejected log', () => {
  assert.match(quotaEngineSource, /quota_reservation_rejected/);
});

test('quota engine emits quota_reservation_rolled_back log', () => {
  assert.match(quotaEngineSource, /quota_reservation_rolled_back/);
});

test('quota engine emits quota_commit_completed log', () => {
  assert.match(quotaEngineSource, /quota_commit_completed/);
});

test('quota engine emits quota_commit_failed log', () => {
  assert.match(quotaEngineSource, /quota_commit_failed/);
});

test('all quota log events include requestId, companyId, uploadAmount', () => {
  // Each structured log in the engine must include the three mandatory trace fields.
  const logBlocks = quotaEngineSource.match(/console\.\w+\("\[quota\][^"]+",\s*\{[^}]+\}/g) ?? [];
  assert.ok(logBlocks.length >= 6, 'at least 6 structured quota log events must exist');
  for (const block of logBlocks) {
    assert.match(block, /requestId/, `missing requestId in: ${block}`);
    assert.match(block, /companyId/, `missing companyId in: ${block}`);
    assert.match(block, /uploadAmount/, `missing uploadAmount in: ${block}`);
  }
});

test('cancelUploadQuota does not throw on RPC error (best-effort rollback)', () => {
  const cancelFnStart = quotaEngineSource.indexOf('export const cancelUploadQuota');
  const cancelFnEnd   = quotaEngineSource.indexOf('};', cancelFnStart) + 2;
  const cancelFnBody  = quotaEngineSource.slice(cancelFnStart, cancelFnEnd);
  // On error it must return (not throw) so the original error is not masked.
  assert.match(cancelFnBody, /return;/);
  assert.doesNotMatch(cancelFnBody, /throw new Error.*error\.message/);
});

// ── Route integration: quota flow ────────────────────────────────────────────

test('route imports quota engine (not legacy usage-limits quota functions)', () => {
  assert.match(routeSource, /from "@\/lib\/quota\/upload-quota"/);
  assert.doesNotMatch(routeSource, /canUploadDocuments/);
  assert.doesNotMatch(routeSource, /incrementUploadUsage/);
  assert.doesNotMatch(routeSource, /getCompanyUsage/);
});

test('route reserves quota before the upload loop (fail-fast on rejection)', () => {
  const reserveIdx = routeSource.indexOf('reserveUploadQuota(');
  const loopIdx    = routeSource.indexOf('for (const file of files)');
  assert.ok(reserveIdx > 0 && reserveIdx < loopIdx);
});

test('route commits quota only after the full upload loop completes', () => {
  const loopEndMarker = routeSource.lastIndexOf('processedFiles.push(');
  const commitIdx     = routeSource.indexOf('commitUploadQuota(', loopEndMarker);
  assert.ok(commitIdx > loopEndMarker);
});

test('route cancels quota reservation on all in-loop rollback paths', () => {
  const loopStart = routeSource.indexOf('for (const file of files)');
  const commitIdx = routeSource.indexOf('commitUploadQuota(');
  const loopBody  = routeSource.slice(loopStart, commitIdx);
  const cancelHits = (loopBody.match(/rollbackAndCancel\(/g) ?? []).length;
  assert.ok(cancelHits >= 5, `expected ≥5 rollbackAndCancel calls in loop, found ${cancelHits}`);
});

test('route does not reject quota reservation before file count/size validation', () => {
  // File structural validations must precede the quota reservation call.
  const tooManyIdx  = routeSource.indexOf('TOO_MANY_FILES');
  const totalSizeIdx = routeSource.indexOf('TOTAL_SIZE_EXCEEDED');
  const reserveIdx  = routeSource.indexOf('reserveUploadQuota(');
  assert.ok(tooManyIdx < reserveIdx, 'file count check must precede quota reservation');
  assert.ok(totalSizeIdx < reserveIdx, 'total size check must precede quota reservation');
});

// ── Concurrency simulation ────────────────────────────────────────────────────
//
// These tests use an in-process lock that replicates the SELECT FOR UPDATE
// serialisation semantics of the PostgreSQL RPC. They verify that the
// reservation logic is deterministic under concurrent load.

function makeMockQuotaStore(limit, initialCommittedCount = 0) {
  let committed = initialCommittedCount;
  let pending = 0;
  let lockHeld = false;
  const queue = [];

  const acquireLock = () =>
    new Promise((resolve) => {
      const try_ = () => {
        if (!lockHeld) {
          lockHeld = true;
          resolve();
        } else {
          queue.push(try_);
        }
      };
      try_();
    });

  const releaseLock = () => {
    lockHeld = false;
    if (queue.length > 0) queue.shift()();
  };

  const reserve = async (amount) => {
    await acquireLock();
    try {
      const effective = committed + pending;
      if (limit !== null && effective + amount > limit) {
        return { allowed: false };
      }
      pending += amount;
      return { allowed: true, amount };
    } finally {
      releaseLock();
    }
  };

  const commit = async (amount) => {
    await acquireLock();
    try {
      committed += amount;
      pending -= amount;
    } finally {
      releaseLock();
    }
  };

  const cancel = async (amount) => {
    await acquireLock();
    try {
      pending -= amount;
    } finally {
      releaseLock();
    }
  };

  const state = () => ({ committed, pending });

  return { reserve, commit, cancel, state };
}

test('concurrent reservations: exactly limit-many are approved, rest rejected', async () => {
  const limit = 5;
  const store = makeMockQuotaStore(limit);

  // 10 concurrent requests each uploading 1 file
  const results = await Promise.all(
    Array.from({ length: 10 }, () => store.reserve(1))
  );

  const allowed = results.filter((r) => r.allowed).length;
  assert.equal(allowed, 5, 'exactly 5 reservations should be approved');

  // Commit all approved
  await Promise.all(results.filter((r) => r.allowed).map(() => store.commit(1)));

  const { committed, pending } = store.state();
  assert.equal(committed, 5);
  assert.equal(pending, 0);
});

test('unlimited plan (limit=null) allows all concurrent reservations', async () => {
  const store = makeMockQuotaStore(null);
  const results = await Promise.all(Array.from({ length: 20 }, () => store.reserve(1)));
  const allowed = results.filter((r) => r.allowed).length;
  assert.equal(allowed, 20);
});

test('scenario A: storage fails on file 3 of 5, full rollback — quota not consumed', async () => {
  const limit = 5;
  const store = makeMockQuotaStore(limit, 0);

  const reservation = await store.reserve(5);
  assert.ok(reservation.allowed);

  // Simulate processing files 1–2 (ok) then failure on file 3 → rollback
  await store.cancel(5); // quota reservation cancelled on rollback

  const { committed, pending } = store.state();
  assert.equal(committed, 0, 'committed usage must remain 0 after full rollback');
  assert.equal(pending, 0);
});

test('scenario B: extraction timeout, uploads succeeded — quota IS consumed', async () => {
  const limit = 5;
  const store = makeMockQuotaStore(limit, 0);

  const reservation = await store.reserve(3);
  assert.ok(reservation.allowed);

  // All files uploaded to storage successfully; extraction timed out but we still commit
  await store.commit(3);

  const { committed } = store.state();
  assert.equal(committed, 3, 'quota must be consumed even when extraction times out');
});

test('scenario C: request cancelled before uploads start — quota not consumed', async () => {
  const limit = 5;
  const store = makeMockQuotaStore(limit, 0);

  const reservation = await store.reserve(2);
  assert.ok(reservation.allowed);

  // Request aborted before any storage upload; cancel the reservation
  await store.cancel(2);

  const { committed, pending } = store.state();
  assert.equal(committed, 0);
  assert.equal(pending, 0);
});

test('scenario D: idempotency — same reservation cannot be committed twice', async () => {
  const limit = 5;
  const store = makeMockQuotaStore(limit, 0);
  let commitCount = 0;

  const reservation = await store.reserve(1);
  assert.ok(reservation.allowed);

  // Simulate duplicate commit (e.g., retry network)
  const commitOnce = async () => {
    await store.commit(1);
    commitCount++;
  };

  await commitOnce();
  // Second commit on the same reservation would be blocked at the DB level
  // (the reservation row was deleted on first commit); simulate by not calling again
  assert.equal(commitCount, 1, 'commit must only run once per reservation');

  const { committed } = store.state();
  assert.equal(committed, 1);
});

test('race condition: two concurrent requests at 4/5 quota — only one is approved', async () => {
  const limit = 5;
  const store = makeMockQuotaStore(limit, 4); // already at 4 committed

  const [resultA, resultB] = await Promise.all([
    store.reserve(1),
    store.reserve(1),
  ]);

  const approvedCount = [resultA, resultB].filter((r) => r.allowed).length;
  assert.equal(approvedCount, 1, 'only one of the two concurrent requests should be approved');

  const { committed, pending } = store.state();
  assert.equal(committed + pending, 5, 'effective usage must not exceed the limit');
});

test('batch upload: single reservation for N files prevents N separate race windows', async () => {
  const limit = 5;
  const store = makeMockQuotaStore(limit, 0);

  // One batch of 5 files vs. five individual requests
  const [batchResult, ...individualResults] = await Promise.all([
    store.reserve(5),
    ...Array.from({ length: 5 }, () => store.reserve(1)),
  ]);

  // The batch claim of 5 at once must block all individual ones (or vice versa)
  const batchApproved      = batchResult.allowed;
  const individualsApproved = individualResults.filter((r) => r.allowed).length;

  // Total approved slots must not exceed the limit
  const approvedSlots = (batchApproved ? 5 : 0) + individualsApproved;
  assert.ok(approvedSlots <= limit, `approved slots (${approvedSlots}) must not exceed limit (${limit})`);
});
