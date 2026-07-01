# Current State: Live Federation Ingestion

## Completed
- Live webhook ingestion runtime with replay protection.
- Canonical event normalization across jira/slack/github/calendar/notion/custom.
- Realtime signal routing surface.
- Pulse and survivability evaluation surfaces.
- Tenant-scoped federation event and pulse APIs.

## Constraints
- In-memory persistence only.
- Connector auth validation currently header/token-shape based.

## Expansion Path
- Add per-provider signature verification.
- Move replay and event ledgers to durable storage.
- Expand routing into dedicated runtime buses.
