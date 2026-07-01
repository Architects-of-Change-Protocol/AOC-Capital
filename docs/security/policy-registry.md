# Policy Registry v1

Registry is deterministic and code-defined in `GOVERNANCE_POLICY_REGISTRY`.

Each governed action maps to:
- required permission
- minimum role (optional)
- allowed actor types
- agent compatibility
- deny audit event type
- risk level
- scope requirement (workspace/project)

Included actions: `project.read`, `project.write`, `memory.read`, `memory.write`, `document.upload`, `billing.manage`, `members.manage`, `ai.execute`, `ai.manage`, `workspace.manage`, `executive.view`, `privileged.use`.


## Phase 5.1 note
- Approval-aware governance is now implemented as a minimal runtime layer; this is not AOC protocol integration yet.
