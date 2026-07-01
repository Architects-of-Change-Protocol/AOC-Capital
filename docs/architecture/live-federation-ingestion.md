# Live Federation Ingestion

PMFreak now maintains a realtime operational bloodstream through a deterministic ingestion runtime.

## Semantics
- Replay-safe ingress keyed by workspace + connector + nonce.
- Deterministic normalization (stable hash and canonical shape).
- Tenant-scoped event persistence with lineage metadata.
- Routed operational signals only; no direct cognition mutation.

## Survivability & Pulse Cognition
- Pulse tracks density, latency, drift, liveness, and mutation velocity.
- Survivability identifies starvation, stale federation, degradation, and event-class collapse.
