# Enforcement Coverage (Phase 4.5)

- Privileged client creation is centralized through `createPrivilegedSupabaseClient` with fail-closed context requirements.
- Workspace member invite/snapshot helpers require governance permission checks and actor-scoped context.
- Billing webhook privileged writes are explicitly system-scoped.
- Telemetry persistence uses privileged context with recursion bypass guard.

- Replay-protection persistence for agent attestation is complete: nonce-based tracking in `agent_attestation_nonces` with service-role privileged access, race-condition handling (unique violation → replay_detected), and telemetry on replay attempts.

Known gap:
- Deterministic malformed-payload telemetry for attestation v2 is not complete.
