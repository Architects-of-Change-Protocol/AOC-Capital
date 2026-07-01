# Governed execution

## Enforced now
- Approved governance decisions can issue a short-lived, single-use execution grant in `governance_execution_grants`.
- Raw grant token is generated once and only token hash (`sha256`) is stored.
- Consumption path validates actor/scope/action/permission/resource bindings and atomically moves status from `active` to `consumed`.

## Prepared
- Expiration/revocation status model and telemetry events for invalid, replay, and scope mismatch scenarios.

## Not implemented yet
- Full AOC protocol capability token exchange, delegated cross-system capability portability, and external policy synchronization.

## Why this is not full AOC capability-token infra
- This layer is route-local authorization consumption tied to approval requests; it is not a generalized protocol token lifecycle with external trust federation.


## Phase 5.3 delegated authority
- Adds PMFreak-native delegated capabilities with lineage, revocation, expiry, and max-use constraints.
- Explicitly *not* full AOC Protocol or decentralized federation.

## Phase 5.4 portable capability claim note
Signed capability claims supplement local authorization records. They do not replace local token consumption or governance checks. This is not AOC Protocol/federation yet.
