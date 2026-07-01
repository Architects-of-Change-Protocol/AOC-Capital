# Trust domains

Trust domains now support both legacy HMAC signing metadata and Ed25519 public verification metadata.

Asymmetric key metadata includes algorithm, key-use, status, validity windows, optional public PEM, and public JWK.
Private keys are loaded from env/secret references only and are never persisted in the database.

Independent verification validates signatures; authorization execution remains local governed-consumption logic.


## Phase 6.2 distributed trust coordination note
This release adds controlled revocation/distrust synchronization using signed trust events and a revocation registry. It is not public federation, blockchain, DID, or AOC Protocol. Verification and execution remain separate, and propagated revocation signals improve posture without global consensus.
