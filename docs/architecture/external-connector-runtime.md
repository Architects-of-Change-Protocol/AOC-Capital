# External Connector Runtime & Operational Signal Federation

This runtime provides deterministic external signal federation with normalization, identity correlation, timeline fusion, replay scaffolding, and governance boundaries.

## Federation Philosophy
- No shallow ETL sync; every federated output includes source attribution, confidence, uncertainty, and lineage rationale.
- Cross-tenant safety is enforced via tenant/workspace governance boundaries.

## Core Modules
- Normalization: `src/lib/connectors/normalization/signal-normalization.ts`
- Federation: `src/lib/connectors/federation/signal-federation.ts`
- Identity correlation: `src/lib/connectors/identity/operational-identity-correlation.ts`
- Timeline federation: `src/lib/connectors/timelines/operational-timeline-federation.ts`
- Governance: `src/lib/connectors/governance/connector-governance.ts`
- Replay and resilience: `src/lib/connectors/replay/connector-replay.ts`, `src/lib/connectors/connector-resilience.ts`
