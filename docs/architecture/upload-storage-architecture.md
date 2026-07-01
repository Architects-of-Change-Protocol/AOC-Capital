# Upload Storage Architecture

## Overview

Document uploads in PMFreak flow through a `StorageProvider` abstraction layer
that decouples the upload API route from any specific storage backend.

---

## StorageProvider Interface

```typescript
interface StorageProvider {
  upload(params: {
    fileId: string;       // UUID — caller provides via randomUUID()
    projectId: string;
    companyId: string;
    buffer: Buffer;
    mimeType: string;
    originalName: string;
  }): Promise<{ storageRef: string }>;

  delete(storageRef: string): Promise<void>;
}
```

`storageRef` is an opaque string returned by the provider. Callers store it but
do not interpret its structure. The route returns `storageRef` to API consumers
(replacing the old `savedTo` field which leaked filesystem paths).

---

## Available Implementations

### SupabaseStorageProvider (production default)

- **When active**: `STORAGE_PROVIDER=supabase` or env var unset (default)
- **Bucket**: `pmfreak-documents` (override with `SUPABASE_STORAGE_BUCKET`)
- **Storage path**: `{companyId}/{projectId}/{fileId}-{sanitized_name}`
- **Client**: uses `createPrivilegedSupabaseClient` with service role key
  (no user-scoped RLS on storage — access controlled entirely at the API layer)
- **Upload options**: `upsert: false` — duplicate `fileId` will error rather
  than silently overwrite

### MemoryStorageProvider (test environments only)

- **When active**: `STORAGE_PROVIDER=memory`
- Stores `Buffer` objects in a module-scope `Map<string, Buffer>`
- Returns `fileId` as `storageRef`
- Exports `clearMemoryStore()` for test cleanup between cases
- Never instantiated in production (guarded by env check)

---

## Enabling Supabase Storage

1. Ensure the bucket exists by running the migration:
   ```
   supabase/migrations/20260515200000_storage_bucket_setup.sql
   ```
   The migration is idempotent (`ON CONFLICT DO NOTHING`).

2. Set environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   # Optional — defaults to "pmfreak-documents"
   SUPABASE_STORAGE_BUCKET=pmfreak-documents
   ```

3. Leave `STORAGE_PROVIDER` unset (or set to `supabase`).

---

## File Path Convention

```
{companyId}/{projectId}/{fileId}-{sanitized_originalName}
```

- `companyId` and `projectId` are UUID strings from the database
- `fileId` is a `randomUUID()` value generated per file per request
- `sanitized_originalName` replaces any character outside `[a-zA-Z0-9._-]`
  with `_` to prevent path traversal and shell injection

Example:
```
a1b2c3d4-0000-0000-0000-111111111111/
  e5f6a7b8-0000-0000-0000-222222222222/
    9c8d7e6f-0000-0000-0000-333333333333-project_plan_Q2.pdf
```

---

## Rollback Behavior on Partial Failure

If any file in a multi-file upload batch fails at the storage layer, previously
uploaded files in the same request are rolled back:

1. `rollbackUploads(provider, uploadedRefs)` iterates over all `storageRef`
   values that succeeded before the failure.
2. Each `provider.delete(ref)` call is wrapped individually — a delete failure
   logs `storage_rollback_failed` but does **not** throw, so one failed delete
   cannot mask others.
3. After rollback the route returns `500 INGESTION_FAILED`.

Callers should treat a `500` response as a complete failure — no partial
uploads are retained.

---

## Why Local Filesystem Was Removed

The original implementation wrote files to `process.cwd()/uploads/` using
Node.js `fs/promises`. This broke under:

- **Vercel serverless**: functions run in ephemeral containers; only `/tmp`
  is writable and is discarded after the invocation.
- **Horizontal scale**: multiple instances cannot share a local directory,
  so files written by one instance are invisible to others.
- **Container churn**: a rolling deploy or crash discards all locally written
  files with no warning.

Supabase Storage is a durable, replicated object store that survives all three
scenarios. The `MemoryStorageProvider` covers unit tests where Supabase
credentials are unavailable.

The `STORAGE_PROVIDER=local` value is explicitly rejected with an error to
prevent accidental misconfiguration in deployed environments.

---

## Residual Risks

| Risk | Mitigation | Status |
|---|---|---|
| Supabase Storage outage | Error surfaced to API caller as `500 INGESTION_FAILED` | Open — no retry or dead-letter queue |
| Orphan objects after app crash mid-upload | Rollback only runs if the process reaches the error handler | Partial — catastrophic crashes bypass rollback |
| Storage bucket RLS bypass via service role | All service-role usage logged via `logSecurityEvent` in `createPrivilegedSupabaseClient` | Mitigated |
| `storageRef` enumeration | Paths include UUID `fileId` — not guessable | Mitigated |
