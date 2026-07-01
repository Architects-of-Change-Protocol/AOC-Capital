# Audit Event Inventory (v1)

- `capability_audit_events`: **user-visible audit** + **admin-visible audit** for capability lifecycle and policy events.
- `workspace_audit_events`: **user-visible audit** for membership/governance workspace actions.
- `security_events`: **admin-visible audit** and **security-only** metadata; only owner/admin should see technical details.
- `governance_audit_events`: **future protocol trace** for governance runtime; excluded from v1 timeline until workspace-safe mapping is added.
- `early_access_events`: **system/internal telemetry** (commercial onboarding telemetry); excluded from timeline.
- `first_user_telemetry_events`: **system/internal telemetry**; excluded from timeline.
- Policy evaluation events currently land in `capability_audit_events` (`policy_evaluated`, `policy_allowed`, `policy_denied`, `policy_required_approval`, `policy_expired_grant`, `policy_scope_mismatch`).

## Exposure Rules

- Members: only normalized business-level summaries.
- Owner/admin: plus expandable technical details.
- No raw secrets/tokens in timeline cards.
- No cross-tenant joins or frontend-only filtering.
