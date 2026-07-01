# Distributed Trust Coordination (Phase 6.2)

PMFreak now supports **controlled distributed trust coordination** for revocation and distrust propagation across approved verifier boundaries.

## Explicit boundaries
- Not public federation.
- Not blockchain.
- Not DID.
- Not AOC Protocol yet.
- Verification remains separate from execution.

## Scope
- Signed trust-event ledger.
- Revocation registry consulted by verification.
- Controlled trust-event export/import via handshake-gated endpoints.
- Trust-graph projection for `trusts/distrusts/verifies/revoked`.
- Independent verifier trust-posture update hooks.

Revocation propagation improves local trust posture but is not global consensus.
