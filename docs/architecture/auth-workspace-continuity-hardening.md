# Auth + Workspace Continuity Hardening

## Continuity philosophy
PMFreak now applies deterministic continuity resolution for auth, workspace, and project context. Failures prefer safe redirects and explicit recovery markers over opaque runtime exceptions.

## Canonical resolution strategy
- `resolveCanonicalWorkspace(userId, preferredWorkspaceId)` validates membership and workspace status, never selecting archived/deleted workspaces.
- `resolveCanonicalProject(workspaceId, requestedProjectId)` validates workspace ownership of project ids and provides deterministic fallback.
- `assertRuntimeAuthContinuity()` validates runtime session presence/expiry before protected layout flow.

## Onboarding continuity model
Onboarding route resolves canonical workspace from optional request header and recovers to ensured workspace if stale/invalid.

## Protected route recovery model
Protected layout performs auth continuity assertion first, then canonical workspace resolution, then workspace bootstrap.

## Tenant isolation guarantees
Workspace and project resolution only use IDs tied to authenticated membership/workspace relations and avoid cross-tenant fallback.

## Redirect safety guarantees
Expired auth routes redirect to `/login?next=...`; invalid project ids recover to canonical project URL with `recoveredFrom` marker.

## Stale state recovery strategy
Workspace/project resolvers treat stale IDs as recoverable continuity issues and choose deterministic first valid records.

## Multi-tab consistency handling
Runtime session continuity checks are re-evaluated per request in server components/routes to avoid trusting stale tab-local assumptions.
