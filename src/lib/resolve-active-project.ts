// Canonical active project resolver for server-side protected pages.
//
// Priority order:
//  1. Explicit projectId from URL searchParams, validated against the workspace's project list.
//  2. Most-recently-created valid project (projects are expected to arrive ordered desc by created_at).
//  3. Empty result if no projects exist yet (triggers the no-project guarded state).
//
// The caller supplies the already-fetched projects list (filtered by workspace_id), so this
// function never makes a DB call and cannot leak cross-workspace projects.
// An invalid/unauthorized requestedId returns { invalidId: true } — callers must NOT silently
// fall back to another project without surfacing an explicit guarded state.

export type ResolvedProject = { id: string; name: string };

export type ActiveProjectResult =
  | { project: ResolvedProject; invalidId: false; empty: false }
  | { project: null; invalidId: false; empty: true }
  | { project: null; invalidId: true; empty: false; requestedId: string };

export function resolveActiveProject(
  projects: ResolvedProject[],
  requestedId: string | undefined | null,
): ActiveProjectResult {
  if (projects.length === 0) {
    return { project: null, invalidId: false, empty: true };
  }

  if (requestedId) {
    const match = projects.find((p) => p.id === requestedId);
    if (match) return { project: match, invalidId: false, empty: false };
    // requestedId was supplied but is not in this workspace — do not silently fall back.
    return { project: null, invalidId: true, empty: false, requestedId };
  }

  return { project: projects[0], invalidId: false, empty: false };
}
