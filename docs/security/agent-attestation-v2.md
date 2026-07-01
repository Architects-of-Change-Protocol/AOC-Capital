# Agent Attestation v2 + Governance Runtime Integration

## Enforced now
- HMAC token signature, expiry, workspace/agent binding checks.
- Revocation check against `ai_agent_permissions`.
- Runtime policy evaluation for action + scope compatibility.

## Governance integration
- `ai.execute` action requires attestation and agent scope in governance runtime.
- Denials now include explainable decision traces (e.g., scope mismatch, missing scope, binding mismatch).

## Not implemented yet
- Key rotation orchestration.
- Third-party attestation issuers.
- Cross-runtime trust federation.
