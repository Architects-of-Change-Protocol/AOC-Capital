/**
 * Upload hardening contract tests.
 *
 * Static source-analysis pattern — same approach as the rest of this test suite.
 * All assertions verify that the correct code is present in the TypeScript source
 * without executing it (no transpiler, no Supabase, no auth required).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routeSource = fs.readFileSync('src/app/api/upload/route.ts', 'utf8');
const providerSource = fs.readFileSync('src/lib/storage/upload-provider.ts', 'utf8');

// ── Filename validation ────────────────────────────────────────────────────────

test('validateFileName function is present and used in the file loop', () => {
  assert.match(routeSource, /const validateFileName/);
  const loopStart = routeSource.indexOf('for (const file of files)');
  const nameCheckIdx = routeSource.indexOf('validateFileName(file.name)', loopStart);
  assert.ok(nameCheckIdx > loopStart, 'validateFileName must be called inside the file loop');
});

test('validateFileName rejects empty filenames', () => {
  assert.match(routeSource, /empty_filename/);
  assert.match(routeSource, /name\.trim\(\)\.length === 0/);
});

test('validateFileName rejects filenames exceeding 255 characters', () => {
  assert.match(routeSource, /filename_too_long/);
  assert.match(routeSource, /name\.length > 255/);
});

test('validateFileName rejects path traversal sequences', () => {
  assert.match(routeSource, /path_traversal/);
  assert.match(routeSource, /name\.includes\("\.\.\/"\)/);
  assert.match(routeSource, /name\.includes\("\.\.\\\\"\)/);
});

test('validateFileName rejects path separator characters', () => {
  assert.match(routeSource, /path_separator/);
  assert.match(routeSource, /name\.includes\("\/"\)/);
  assert.match(routeSource, /name\.includes\("\\\\"\)/);
});

test('validateFileName rejects control characters including null bytes', () => {
  assert.match(routeSource, /control_characters/);
  // Source contains the literal text \x00-\x1f inside a regex — one backslash each
  assert.match(routeSource, /\\x00-\\x1f/);
});

test('validateFileName rejects invisible Unicode (zero-width, directional override, BOM)', () => {
  assert.match(routeSource, /invisible_unicode/);
});

test('DANGEROUS_FILENAME error code returned for bad filenames', () => {
  assert.match(routeSource, /DANGEROUS_FILENAME/);
  assert.match(routeSource, /dangerous_filename/);
});

// ── Extension / MIME consistency ──────────────────────────────────────────────

test('EXTENSION_TO_MIME map covers all three allowed types', () => {
  assert.match(routeSource, /EXTENSION_TO_MIME/);
  assert.match(routeSource, /\.pdf.*application\/pdf/s);
  assert.match(routeSource, /\.docx.*wordprocessingml\.document/s);
  assert.match(routeSource, /\.txt.*text\/plain/s);
});

test('validateExtensionMime function is present and used in the file loop', () => {
  assert.match(routeSource, /const validateExtensionMime/);
  const loopStart = routeSource.indexOf('for (const file of files)');
  const extCheckIdx = routeSource.indexOf('validateExtensionMime(file.name, file.type)', loopStart);
  assert.ok(extCheckIdx > loopStart, 'validateExtensionMime must be called inside the file loop');
});

test('INVALID_EXTENSION error code returned for extension/MIME mismatch', () => {
  assert.match(routeSource, /INVALID_EXTENSION/);
  assert.match(routeSource, /invalid_extension/);
});

test('extension check precedes magic bytes check (fast fail ordering)', () => {
  const loopStart = routeSource.indexOf('for (const file of files)');
  const extIdx = routeSource.indexOf('validateExtensionMime(', loopStart);
  const magicIdx = routeSource.indexOf('verifyMagicBytes(', loopStart);
  assert.ok(extIdx < magicIdx, 'extension check must precede magic bytes check');
});

// ── ENV-configurable limits ───────────────────────────────────────────────────

test('MAX_FILE_SIZE_BYTES reads UPLOAD_MAX_FILE_SIZE_BYTES env var', () => {
  assert.match(routeSource, /UPLOAD_MAX_FILE_SIZE_BYTES/);
  assert.match(routeSource, /10 \* 1024 \* 1024/); // default fallback
});

test('MAX_FILES_PER_REQUEST reads UPLOAD_MAX_FILES_PER_REQUEST env var', () => {
  assert.match(routeSource, /UPLOAD_MAX_FILES_PER_REQUEST/);
});

test('MAX_TOTAL_SIZE_BYTES reads UPLOAD_MAX_TOTAL_SIZE_BYTES env var', () => {
  assert.match(routeSource, /UPLOAD_MAX_TOTAL_SIZE_BYTES/);
  assert.match(routeSource, /25 \* 1024 \* 1024/); // default fallback
});

test('EXTRACTION_TIMEOUT_MS reads UPLOAD_EXTRACTION_TIMEOUT_MS env var', () => {
  assert.match(routeSource, /UPLOAD_EXTRACTION_TIMEOUT_MS/);
  assert.match(routeSource, /5000/); // default fallback
});

// ── requestId traceability ────────────────────────────────────────────────────

test('requestId generated at the start of POST handler', () => {
  const postIdx = routeSource.indexOf('export async function POST');
  const requestIdIdx = routeSource.indexOf('const requestId = randomUUID()', postIdx);
  assert.ok(requestIdIdx > postIdx, 'requestId must be generated inside POST');
});

test('requestId is included in upload_started log', () => {
  const startedIdx = routeSource.indexOf('upload_started');
  const blockEnd = routeSource.indexOf('});', startedIdx);
  const slice = routeSource.slice(startedIdx, blockEnd);
  assert.match(slice, /requestId/);
});

test('requestId is included in ingestion_completed log', () => {
  const completedIdx = routeSource.indexOf('ingestion_completed');
  const blockEnd = routeSource.indexOf('});', completedIdx);
  const slice = routeSource.slice(completedIdx, blockEnd);
  assert.match(slice, /requestId/);
});

test('requestId is returned in the success response body', () => {
  assert.match(routeSource, /requestId,/);
  assert.match(routeSource, /UploadSuccessResponse/);
  // requestId must be part of the UploadSuccessResponse type
  const typeIdx = routeSource.indexOf('type UploadSuccessResponse');
  const typeEnd = routeSource.indexOf('};', typeIdx);
  const typeBlock = routeSource.slice(typeIdx, typeEnd);
  assert.match(typeBlock, /requestId: string/);
});

// ── Per-file observability events ─────────────────────────────────────────────

test('file_storage_uploaded event is emitted after successful storage upload', () => {
  assert.match(routeSource, /file_storage_uploaded/);
  const storageUploadIdx = routeSource.indexOf('file_storage_uploaded');
  const providerUploadIdx = routeSource.indexOf('provider.upload(');
  assert.ok(storageUploadIdx > providerUploadIdx, 'file_storage_uploaded must come after provider.upload()');
});

test('file_extraction_completed event is emitted for successful extraction', () => {
  assert.match(routeSource, /file_extraction_completed/);
});

test('file_extraction_failed event is emitted for timeout or error', () => {
  assert.match(routeSource, /file_extraction_failed/);
});

test('file_validation_failed reason codes cover all new validations', () => {
  assert.match(routeSource, /file_validation_failed/);
  assert.match(routeSource, /dangerous_filename/);
  assert.match(routeSource, /invalid_extension/);
  assert.match(routeSource, /magic_bytes_mismatch/);
  assert.match(routeSource, /invalid_file_type/);
  assert.match(routeSource, /file_too_large/);
});

test('rollback_started and rollback_completed events bracket the rollback loop', () => {
  assert.match(routeSource, /rollback_started/);
  assert.match(routeSource, /rollback_completed/);
  const startIdx = routeSource.indexOf('rollback_started');
  const endIdx = routeSource.indexOf('rollback_completed');
  assert.ok(startIdx < endIdx, 'rollback_started must precede rollback_completed');
});

test('upload_failed reason codes cover early-exit paths', () => {
  assert.match(routeSource, /auth_failed/);
  assert.match(routeSource, /malformed_multipart/);
  assert.match(routeSource, /missing_project/);
  assert.match(routeSource, /invalid_project/);
  assert.match(routeSource, /governance_denied/);
  assert.match(routeSource, /missing_files/);
  assert.match(routeSource, /too_many_files/);
  assert.match(routeSource, /total_size_exceeded/);
  assert.match(routeSource, /quota_exceeded/);
  assert.match(routeSource, /storage_upload_failed/);
});

// ── ExtractionStatus on processed files ──────────────────────────────────────

test('ExtractionStatus type is declared and covers all states', () => {
  assert.match(routeSource, /type ExtractionStatus/);
  assert.match(routeSource, /"completed" \| "timeout" \| "failed"/);
});

test('extractionStatus field is present on ExtractedFile type', () => {
  const typeIdx = routeSource.indexOf('type ExtractedFile');
  const typeEnd = routeSource.indexOf('};', typeIdx);
  const block = routeSource.slice(typeIdx, typeEnd);
  assert.match(block, /extractionStatus: ExtractionStatus/);
});

test('extractWithTimeout returns status alongside text', () => {
  assert.match(routeSource, /const \{ text: extractedText, status: extractionStatus \}/);
});

test('extraction status is persisted onto the processed file entry', () => {
  assert.match(routeSource, /extractionStatus,/);
});

// ── Atomic quota enforcement ──────────────────────────────────────────────────

test('quota enforcement uses atomic RPC reservation (race condition resolved)', () => {
  assert.match(routeSource, /reserveUploadQuota/);
  assert.match(routeSource, /commitUploadQuota/);
  assert.match(routeSource, /cancelUploadQuota/);
  assert.doesNotMatch(routeSource, /canUploadDocuments/);
  assert.doesNotMatch(routeSource, /incrementUploadUsage/);
});

test('quota reservation occurs before file upload loop (fail-fast ordering)', () => {
  const reserveIdx = routeSource.indexOf('reserveUploadQuota(');
  const loopIdx = routeSource.indexOf('for (const file of files)');
  assert.ok(reserveIdx > 0, 'reserveUploadQuota must be present');
  assert.ok(reserveIdx < loopIdx, 'reserveUploadQuota must precede the file upload loop');
});

test('quota commit occurs after the file upload loop completes successfully', () => {
  const loopEnd = routeSource.lastIndexOf('processedFiles.push(');
  const commitIdx = routeSource.indexOf('commitUploadQuota(', loopEnd);
  assert.ok(commitIdx > loopEnd, 'commitUploadQuota must come after the file loop');
});

test('rollback paths inside file loop cancel the quota reservation', () => {
  const loopStart = routeSource.indexOf('for (const file of files)');
  const loopBody = routeSource.slice(loopStart, routeSource.indexOf('commitUploadQuota('));
  const cancelCount = (loopBody.match(/rollbackAndCancel\(/g) ?? []).length;
  assert.ok(cancelCount >= 5, `all rollback paths in file loop must call rollbackAndCancel (found ${cancelCount})`);
  assert.doesNotMatch(loopBody, /rollbackUploads\(provider/, 'raw rollbackUploads must not be called directly inside file loop');
});

// ── Supabase provider hardening ───────────────────────────────────────────────

test('SupabaseStorageProvider upload includes explicit cacheControl', () => {
  assert.match(providerSource, /cacheControl:/);
});

test('SupabaseStorageProvider upload keeps upsert: false', () => {
  assert.match(providerSource, /upsert: false/);
});

test('SupabaseStorageProvider delete documents idempotence', () => {
  assert.match(providerSource, /idempotent/);
});

test('optional bucket verification is gated by UPLOAD_VERIFY_BUCKET env flag', () => {
  assert.match(providerSource, /UPLOAD_VERIFY_BUCKET/);
  assert.match(providerSource, /getBucket\(BUCKET\)/);
});

test('storage path uses companyId/projectId/fileId scoping (tenant isolation)', () => {
  assert.match(providerSource, /\$\{params\.companyId\}\/\$\{params\.projectId\}\/\$\{params\.fileId\}/);
});

test('SUPABASE_STORAGE_BUCKET env var overrides default bucket name', () => {
  assert.match(providerSource, /SUPABASE_STORAGE_BUCKET/);
  assert.match(providerSource, /pmfreak-documents/);
});

// ── No sensitive data in logs ─────────────────────────────────────────────────

test('extractedText is not passed to any console log call', () => {
  // extractedText should only be stored in the processedFiles array, not logged
  const extractedTextLogs = routeSource.match(/console\.[a-z]+\([^)]*extractedText[^)]*\)/g);
  assert.equal(extractedTextLogs, null, 'extractedText must not appear in any console log call');
});

test('original file names in logs use safeFileName (sanitized), not file.name directly', () => {
  // Verify that safeFileName is used in the file context object for logs
  assert.match(routeSource, /safeFileName: sanitizeFileName\(file\.name\)/);
  // fileCtx must use safeFileName, not fileName from file.name
  assert.match(routeSource, /const fileCtx = \{ requestId, fileId, safeFileName/);
});
