# Governance runtime

## Enforced
- Runtime evaluates governed actions and creates approval requests when decisions require human/admin approval.
- `/api/copilot` now supports execution-grant consumption (`x-pmf-execution-grant`) to continue after prior approval.

## Prepared
- Additional governed route integration for billing and other high-risk operations.

## Not implemented
- Protocol-grade capability distribution and portable external grant verification.


## Phase 5.3 delegated authority
- Adds PMFreak-native delegated capabilities with lineage, revocation, expiry, and max-use constraints.
- Explicitly *not* full AOC Protocol or decentralized federation.

## Phase 5.4 portable capability claim note
Signed capability claims supplement local authorization records. They do not replace local token consumption or governance checks. This is not AOC Protocol/federation yet.


## Phase 5.5 trust-domain note
Capability verification is now trust-domain-aware with issuer and key metadata checks. This is not public federation, DID, blockchain, or AOC Protocol yet; it is structural preparation for protocol-grade verification.
