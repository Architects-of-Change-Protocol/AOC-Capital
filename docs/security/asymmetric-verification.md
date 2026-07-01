# Asymmetric verification (Phase 6.1)

PMFreak now supports Ed25519 capability-claim signatures (`pmfreak-capability-claim-v1.2`) that can be verified independently with public keys.

- Ed25519 claims: independently verifiable via discovered public keys.
- HMAC claims: remain server-mediated.
- Verification endpoint remains available.
- Independent verification does not grant execution authorization.
- Not public federation, not DID/blockchain, not AOC Protocol yet.


## Phase 6.2 distributed trust coordination note
This release adds controlled revocation/distrust synchronization using signed trust events and a revocation registry. It is not public federation, blockchain, DID, or AOC Protocol. Verification and execution remain separate, and propagated revocation signals improve posture without global consensus.
