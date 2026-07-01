# Capability claims

Supported versions:
- `pmfreak-capability-claim-v1`
- `pmfreak-capability-claim-v1.1`
- `pmfreak-capability-claim-v1.2`

`v1.2` adds asymmetric Ed25519 proof support with independent verification.
Proof shape:
- `algorithm`: `HMAC-SHA256 | Ed25519`
- `keyId`
- `trustDomain`
- `issuedAt`
- `signature`

HMAC remains server-mediated. Independent verification does not imply execution authorization.
Not public federation, DID/blockchain, or AOC Protocol yet.


## Phase 6.2 distributed trust coordination note
This release adds controlled revocation/distrust synchronization using signed trust events and a revocation registry. It is not public federation, blockchain, DID, or AOC Protocol. Verification and execution remain separate, and propagated revocation signals improve posture without global consensus.
