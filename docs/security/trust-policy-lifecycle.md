# Verifier Trust Policy Lifecycle (Phase 6.3)

`verifier_trust_policies` define import rules and lifecycle:

- statuses: `active`, `suspended`, `revoked`, `expired`
- policy constraints: allowed events, trust level, signature/anchor/sequence requirements, max age
- explicit revocation support

Distrust propagation remains scoped and policy-bound.
