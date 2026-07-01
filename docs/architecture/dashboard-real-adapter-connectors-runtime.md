# Dashboard Real Adapter Connectors Runtime (Track 8.19)

## Purpose
Track 8.19 introduces production-oriented, injectable real connector adapters for Jira, Linear, Asana, Generic Webhook, and Atenea contract scaffolding.

## Execution boundary
These connectors only implement `DashboardLiveConnector` execution behavior and payload translation. Approval, authorization, lifecycle state transitions, and persistence stay in Tracks 8.13/8.15/8.17/8.18.

## Credential exclusion model
No credentials are hardcoded. No secrets are read from environment variables in this runtime.

## Connector injection model
Provider calls are made only through injected clients that satisfy explicit connector contracts in `types.ts`.

## Supported connectors
- Jira (`adapter: jira`)
- Linear (`adapter: linear`)
- Asana (`adapter: asana`)
- Generic Webhook (`adapter: email_queue`)
- Atenea contract connector (`adapter: atenea`)

## Provider payload mappings
Each connector maps `DashboardProjectedTaskPayload` to provider-specific payloads with deterministic priority mapping and metadata handling.

## Error normalization
All provider exceptions are normalized through `normalizeConnectorError()` into deterministic messages and retryability metadata.

## Atenea strategy
Atenea is contract-ready and safe-by-default: it supports dry-run without a client and returns deterministic failure when execute mode is requested without an injected client/method.

## Dry-run behavior
All connectors return deterministic simulated IDs (`simulated:<provider>:<lifecycle.id>`) in dry-run mode.

## Integration with Track 8.15
The connector result shape remains compatible with Track 8.15 live execution runtime expectations.

## Why no API routes yet
This track deliberately avoids API layer changes to keep execution contracts isolated and reusable for upcoming approval mutation and authorization middleware work.

## Future path
- Track 8.20: Approval Decision Mutation API
- Track 8.21: Authorization Middleware / API Enforcement
- Track 8.22: Distributed Runtime Recovery Coordination
- Track 8.23: Production Connector Secrets + OAuth
