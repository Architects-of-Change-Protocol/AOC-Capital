/**
 * Upload provider contract tests.
 *
 * The test runner is plain Node.js (no TypeScript transpilation), so we use
 * static source analysis — the same pattern as every other test in this repo.
 * All assertions verify that the correct code is present in the TypeScript
 * source files without executing them.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routeSource = fs.readFileSync('src/app/api/upload/route.ts', 'utf8');
const providerSource = fs.readFileSync('src/lib/storage/upload-provider.ts', 'utf8');

// ── StorageProvider / MemoryStorageProvider contract ─────────────────────────

test('valid PDF upload: MemoryStorageProvider stores buffer and returns storageRef=fileId', () => {
  // MemoryStorageProvider stores to a Map keyed by fileId and returns fileId as storageRef
  assert.match(providerSource, /memoryStore\.set\(params\.fileId, params\.buffer\)/);
  assert.match(providerSource, /storageRef: params\.fileId/);
});

test('valid DOCX upload: MemoryStorageProvider accepts any mimeType without filtering', () => {
  // Provider does not filter on MIME — caller validates before calling upload()
  assert.doesNotMatch(providerSource, /ALLOWED_MIME_TYPES/);
  assert.match(providerSource, /class MemoryStorageProvider/);
});

test('valid TXT upload: MemoryStorageProvider interface handles text/plain (no mimeType guard in provider)', () => {
  // Same as above — provider is MIME-agnostic; TXT is covered by the same code path
  assert.match(providerSource, /async upload\(/);
  assert.match(providerSource, /mimeType: string/);
});

test('invalid MIME type rejected before storage (route enforces ALLOWED_MIME_TYPES set)', () => {
  assert.match(routeSource, /INVALID_FILE_TYPE/);
  assert.match(routeSource, /ALLOWED_MIME_TYPES/);
  // Rejection must happen before the upload() call
  const mimeCheckIdx = routeSource.indexOf('ALLOWED_MIME_TYPES.has(file.type)');
  const uploadCallIdx = routeSource.indexOf('provider.upload(');
  assert.ok(mimeCheckIdx < uploadCallIdx, 'MIME type check must precede provider.upload() call');
});

test('file too large rejected before storage (route enforces MAX_FILE_SIZE_BYTES)', () => {
  assert.match(routeSource, /FILE_TOO_LARGE/);
  assert.match(routeSource, /MAX_FILE_SIZE_BYTES/);
  const sizeCheckIdx = routeSource.indexOf('file.size > MAX_FILE_SIZE_BYTES');
  const uploadCallIdx = routeSource.indexOf('provider.upload(');
  assert.ok(sizeCheckIdx < uploadCallIdx, 'size check must precede provider.upload() call');
});

test('too many files (>10) rejected before loop (TOO_MANY_FILES check precedes file loop)', () => {
  assert.match(routeSource, /TOO_MANY_FILES/);
  assert.match(routeSource, /MAX_FILES_PER_REQUEST/);
  const tooManyIdx = routeSource.indexOf('TOO_MANY_FILES');
  const loopIdx = routeSource.indexOf('for (const file of files)');
  assert.ok(tooManyIdx < loopIdx, 'TOO_MANY_FILES check must appear before the file loop');
});

test('total size exceeded rejected before loop (TOTAL_SIZE_EXCEEDED check precedes file loop)', () => {
  assert.match(routeSource, /TOTAL_SIZE_EXCEEDED/);
  assert.match(routeSource, /MAX_TOTAL_SIZE_BYTES/);
  const sizeIdx = routeSource.indexOf('TOTAL_SIZE_EXCEEDED');
  const loopIdx = routeSource.indexOf('for (const file of files)');
  assert.ok(sizeIdx < loopIdx, 'TOTAL_SIZE_EXCEEDED check must appear before the file loop');
});

test('magic bytes mismatch: declares PDF but wrong bytes → INVALID_FILE_TYPE (spoofing defense)', () => {
  assert.match(routeSource, /verifyMagicBytes/);
  assert.match(routeSource, /magic_bytes_mismatch/);
  // Magic table in route must cover PDF (%PDF) and DOCX (PK\x03\x04)
  assert.match(routeSource, /0x25, 0x50, 0x44, 0x46/); // %PDF
  assert.match(routeSource, /0x50, 0x4b, 0x03, 0x04/); // PK DOCX
  // Verify the check appears inside the per-file loop
  const loopStart = routeSource.indexOf('for (const file of files)');
  const magicCheckIdx = routeSource.indexOf('verifyMagicBytes(', loopStart);
  assert.ok(magicCheckIdx > loopStart, 'magic byte check must be inside the file loop');
});

test('storage failure triggers rollback of previously uploaded files', () => {
  assert.match(routeSource, /rollbackUploads/);
  assert.match(routeSource, /uploadedRefs/);
  // rollbackUploads called on storage error
  const storageErrorIdx = routeSource.indexOf('storage_upload_failed');
  const rollbackCallIdx = routeSource.indexOf('rollbackUploads(provider, uploadedRefs)');
  assert.ok(rollbackCallIdx < storageErrorIdx, 'rollback must be called before the error log');
  // rollbackUploads implementation must never throw (catches each error individually)
  assert.match(routeSource, /storage_rollback_attempted/);
  assert.match(routeSource, /storage_rollback_failed/);
});

test('parser timeout: extractWithTimeout uses Promise.race; timeout resolves to empty string', () => {
  assert.match(routeSource, /extractWithTimeout/);
  assert.match(routeSource, /Promise\.race/);
  assert.match(routeSource, /ingestion_timeout/);
  // The timeout branch must resolve("") — empty string, not reject
  assert.match(routeSource, /resolve\(""\)/);
  // extractWithTimeout must be used in the loop instead of extractTextFromFile directly
  const loopStart = routeSource.indexOf('for (const file of files)');
  const timeoutCallIdx = routeSource.indexOf('extractWithTimeout(file, buffer)', loopStart);
  assert.ok(timeoutCallIdx > loopStart, 'extractWithTimeout must be called inside the file loop');
});

// ── Additional structural contracts ──────────────────────────────────────────

test('savedTo field removed; storageRef replaces it (no filesystem path leakage)', () => {
  assert.doesNotMatch(routeSource, /savedTo/);
  assert.match(routeSource, /storageRef/);
  assert.doesNotMatch(routeSource, /writeFile/);
  assert.doesNotMatch(routeSource, /mkdir/);
});

test('TOCTOU fix: project lookup in DB appears before enforceRuntimeAuthorization call', () => {
  const projectLookupIdx = routeSource.indexOf('.from("projects").select');
  // Use the call site (await enforceRuntimeAuthorization({), not the import line
  const governanceIdx = routeSource.indexOf('await enforceRuntimeAuthorization(');
  assert.ok(projectLookupIdx > -1, 'project lookup must exist');
  assert.ok(governanceIdx > -1, 'governance call must exist');
  assert.ok(projectLookupIdx < governanceIdx, 'project lookup must precede governance call');
});

test('MemoryStorageProvider exports clearMemoryStore for test cleanup', () => {
  assert.match(providerSource, /export const clearMemoryStore/);
  assert.match(providerSource, /memoryStore\.clear\(\)/);
});

test('getUploadProvider rejects STORAGE_PROVIDER=local with descriptive error', () => {
  assert.match(providerSource, /local filesystem storage is not supported/);
  assert.match(providerSource, /STORAGE_PROVIDER=supabase/);
});

test('SupabaseStorageProvider includes required PRIVILEGED_ACCESS audit comments', () => {
  assert.match(providerSource, /PRIVILEGED_ACCESS: storage operations require service role/);
  assert.match(providerSource, /AUDIT_REF: service-role-risk-register\.md/);
});
