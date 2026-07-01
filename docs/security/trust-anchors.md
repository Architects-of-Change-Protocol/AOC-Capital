# Trust Anchors (Phase 6.3)

PMFreak now uses explicit `capability_trust_anchors` records per trust domain.

- Anchors are local trust decisions.
- Anchor status (`active`, `suspended`, `revoked`) gates verification/import.
- Suspended/revoked anchors fail validation.
- No global auto-trust of external verifiers.

Still controlled interoperability only; not federation, blockchain consensus, DID infra, or AOC Protocol.
