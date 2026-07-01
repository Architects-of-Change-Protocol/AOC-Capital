# Access control matrix

- Current stage: **governed-execution aware** and **early capability-consumption system**.
- Approval-only state has been extended with single-use execution grants.
- Not protocol-ready: no AOC external capability federation, no multi-system trust exchange.

## High-risk route coverage
- `/api/copilot` (`ai.execute`): approval required path + grant consumption supported.
- `/api/governance/executions/consume`: grant validation/consumption authorization endpoint.
- Billing grant consumption integration is pending follow-up.


## Phase 5.3 delegated authority
- Adds PMFreak-native delegated capabilities with lineage, revocation, expiry, and max-use constraints.
- Explicitly *not* full AOC Protocol or decentralized federation.

## Phase 5.4 portable capability claim note
Signed capability claims supplement local authorization records. They do not replace local token consumption or governance checks. This is not AOC Protocol/federation yet.


## Phase 5.5 trust-domain note
Capability verification is now trust-domain-aware with issuer and key metadata checks. This is not public federation, DID, blockchain, or AOC Protocol yet; it is structural preparation for protocol-grade verification.

## Phase 6.0 controlled external verifier interoperability note
PMFreak supports controlled external verifier interoperability with discovery metadata + handshake runtime.
HMAC keys are not publicly exposed.
External verification currently relies on PMFreak verification endpoint or approved trust handshake.
Not public federation, DID/blockchain, or AOC Protocol yet.
