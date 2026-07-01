# API v1 Structure

## Versioning strategy
- New stable developer-facing routes live under `/api/v1/*`.
- Existing `/api/sdk/*` routes remain for compatibility; v1 routes are introduced first, then SDK migration follows.

## Naming rules
- Collections are plural nouns.
- Resource IDs are path segments.
- Action endpoints are used only for non-CRUD transitions (`approve`, `deny`, `revoke`, `evaluate`).

## Standard response model
Success:
- `ok: true`
- `data`
- `meta.requestId`
- `meta.version`

Error:
- `ok: false`
- `error.code`, `error.message`, optional `reason/details`
- `meta.requestId`
- `meta.version`

## Pagination model
- Query: `limit`, `cursor`
- Limits: default 50, max 100
- Response: `pagination.limit`, `pagination.nextCursor`

## Auth and tenant headers
- `Authorization: Bearer <token>`
- `x-pmf-workspace-id` (supported for SDK compatibility)
- `x-request-id` accepted and echoed
- `x-request-id` always returned in response headers

## Migration notes
- SDK client now targets `/api/v1/*` for capabilities, grants, policies, agents, and audit timeline.
- `/api/sdk/*` remains operational and can be deprecated in a later release.
