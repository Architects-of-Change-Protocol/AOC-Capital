# External verifier interoperability

External verifiers can fetch issuer metadata and key metadata, then verify Ed25519 claims offline.

Flow:
1. GET issuer metadata.
2. GET issuer keys.
3. Verify claim signature locally with Ed25519 public key.
4. Apply local trust-domain policy.

HMAC claims still require PMFreak-mediated verification.
This phase is not public federation/DID/blockchain/AOC Protocol.


## Phase 6.2 distributed trust coordination note
This release adds controlled revocation/distrust synchronization using signed trust events and a revocation registry. It is not public federation, blockchain, DID, or AOC Protocol. Verification and execution remain separate, and propagated revocation signals improve posture without global consensus.
