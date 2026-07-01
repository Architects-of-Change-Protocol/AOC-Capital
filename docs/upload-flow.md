# Upload Flow

Endpoint: `POST /api/upload`  
Implementation: `src/app/api/upload/route.ts`  
Storage provider: `src/lib/storage/upload-provider.ts`

## Limits

| Parameter | Default | ENV override |
|-----------|---------|-------------|
| Max files per request | 10 | `UPLOAD_MAX_FILES_PER_REQUEST` |
| Max size per file | 10 MB | `UPLOAD_MAX_FILE_SIZE_BYTES` |
| Max total size per request | 25 MB | `UPLOAD_MAX_TOTAL_SIZE_BYTES` |
| Extraction timeout | 5000 ms | `UPLOAD_EXTRACTION_TIMEOUT_MS` |

ENV values must be positive integers. Malformed values fall back to defaults.

## Allowed File Types

| Extension | MIME type |
|-----------|-----------|
| `.pdf` | `application/pdf` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.txt` | `text/plain` |

Validation layers applied in order:
1. Filename safety (path traversal, control chars, invisible Unicode, length)
2. Extension/MIME consistency (`.pdf` must declare PDF MIME, etc.)
3. MIME type allowlist
4. File size
5. Magic bytes (PDF: `%PDF`, DOCX: `PK\x03\x04`)

## Behaviour on Partial Failure

All uploads in a request are treated as an atomic unit.

- If any file fails **before** storage upload: no storage changes, request rejected.
- If any file fails **after** storage upload: all previously uploaded files for this request are deleted (rollback). Rollback errors are logged but do not change the error response.
- Rollback is idempotent: deleting an already-absent object from Supabase Storage does not error.

## Extraction Behaviour

Each file is assigned an `extractionStatus`:

| Status | Meaning |
|--------|---------|
| `completed` | Text extracted successfully |
| `timeout` | Extraction exceeded `UPLOAD_EXTRACTION_TIMEOUT_MS`; `extractedText` is `""` |
| `failed` | Parser threw an error; `extractedText` is `""` |

A timeout or failure does not cause the upload to fail — the file is stored and the ingestion proceeds with empty text for that file. The status is recorded in the response (`files[].extractionStatus`) and in logs.

## Request Traceability

Every request is assigned a `requestId` (UUID v4) logged on every event and returned in the success response. Per-file events include `fileId`, `safeFileName`, `mimeType`, `size`, `storageRef`.

### Log Events

| Event | Level | When |
|-------|-------|------|
| `upload_started` | info | After all pre-loop validation passes |
| `file_validation_failed` | warn | Per-file validation rejects a file |
| `file_storage_uploaded` | info | File stored successfully |
| `file_extraction_completed` | info | Text extracted successfully |
| `file_extraction_failed` | warn | Extraction timed out or errored |
| `rollback_started` / `rollback_completed` | info | Rollback of previously uploaded files |
| `storage_rollback_attempted` / `storage_rollback_failed` | info/error | Per-file rollback attempt |
| `ingestion_completed` | info | Entire request succeeded |
| `upload_failed` | warn | Any early-exit error path |

No file content or `extractedText` is logged.

## `storageRef` and Operational Memory

Each uploaded file has a `storageRef` (e.g., `{companyId}/{projectId}/{fileId}-{safeName}`) that is:
- Scoped by tenant/project for isolation
- Non-guessable (UUID component)
- Stable for audit and retrieval
- Stored in the file's `storageRef` field in the API response

`storageRef` is the key for future retrieval, signed URL generation, or deletion.  
Operational memory extraction (`appendOperationalMemory`) runs after all files are uploaded using the combined extracted text.

## Supabase Storage

Bucket: `pmfreak-documents` (configurable via `SUPABASE_STORAGE_BUCKET`).

Migration: `supabase/migrations/20260515200000_storage_bucket_setup.sql`

**To verify bucket is applied in the remote Supabase project:**
```bash
supabase db diff --use-migra
# or check the Supabase dashboard → Storage → Buckets
```

Optional runtime bucket check (dev/staging only):
```
UPLOAD_VERIFY_BUCKET=true
```
This adds a `getBucket()` call before upload. Do not enable in production hot paths.

**Upload options enforced by the provider:**
- `contentType`: explicit, passed from validated MIME type
- `cacheControl: "no-store"`: private documents must not be cached by proxies
- `upsert: false`: duplicate uploads are rejected, not silently overwritten

## Changing the Storage Provider

`getUploadProvider()` in `src/lib/storage/upload-provider.ts` returns a `StorageProvider`:

```typescript
export interface StorageProvider {
  upload(params: { fileId, projectId, companyId, buffer, mimeType, originalName }): Promise<{ storageRef: string }>;
  delete(storageRef: string): Promise<void>;
}
```

To add a new provider (S3, local sovereign, enterprise vault):
1. Implement `StorageProvider`.
2. Add a new branch in `getUploadProvider()` keyed on `process.env.STORAGE_PROVIDER`.
3. The route requires no changes.

Set `STORAGE_PROVIDER=memory` in tests to use the in-process store (no external dependency).

## Known Residual Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Quota check race condition (`canUploadDocuments` → `incrementUploadUsage` are not atomic) | Medium | Concurrent requests can each pass the quota check before either increments. Requires a DB-level atomic RPC (row lock + increment). Currently tracked as a known gap. |
| Extraction timeout does not distinguish slow parsers from silent failure | Low | `extractionStatus` field exposes timeout vs failure; text is empty in both cases |
| Supabase bucket migration must be applied manually | Low | Verify with `supabase db diff` before deploying to a new environment |

## Safe Deployment Checklist

1. Verify Supabase bucket migration is applied: `SELECT id FROM storage.buckets WHERE id = 'pmfreak-documents';`
2. Run the test suite: `node --test tests/upload-*.test.mjs`
3. Deploy the route and provider changes
4. Upload a real PDF and verify `storageRef` appears in the response
5. Check logs for `upload_started` → `file_storage_uploaded` → `file_extraction_completed` → `ingestion_completed`
6. Rollback plan: revert `src/app/api/upload/route.ts` and `src/lib/storage/upload-provider.ts` to the previous commit; no DB migration rollback needed (bucket stays, code changes are backward-compatible)
