# Dashboard Authorization Enforcement Runtime (Track 8.21)

This runtime defines a deterministic API enforcement boundary over Track 8.17 role-aware authorization and Track 8.20 approval mutations.

- Injected actor resolver contract only; no auth guessing.
- Scope enforcement checks actor tenant/workspace against request/resource scope.
- Admin does not bypass scope conflicts.
- Capability enforcement delegates to role-authorization engines.
- Lifecycle enforcement supports execution, retry, and cancel checks.
- Approval mutation enforcement maps decision intent to required capability.
- Sensitive read and audit read checks require sensitive capability when inferred.
- Denial responses normalize into explicit status + HTTP mapping.
- No connector calls, no mutation writes, no lifecycle persistence writes.

## Future route wiring path

Track 8.22: Distributed Runtime Recovery Coordination  
Track 8.23: Production Connector Secrets + OAuth  
Track 8.24: Approval Mutation UI Controls  
Track 8.25: Full API Wiring
