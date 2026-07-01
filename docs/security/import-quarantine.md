# Import Quarantine (Phase 6.3)

Suspicious trust events are routed into `capability_trust_event_quarantine`.

- quarantine statuses: `pending`, `approved`, `rejected`
- suspicious imports do not mutate trust state while pending/rejected
- approval flow can later support manual review

This preserves controlled interoperability and strict verification/execution separation.
