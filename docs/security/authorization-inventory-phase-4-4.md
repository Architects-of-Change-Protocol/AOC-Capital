# Authorization Inventory (Phase 4.4)

## Classification
- **Public**: `/api/login`, `/api/early-access/accept`, auth callback/reset/logout routes.
- **Authenticated**: `/api/projects`, `/api/projects/[id]`, `/api/portfolio`, `/api/upload`, `/api/onboarding`, `/api/getting-started`, most `/api/ai/*`, `/api/intelligence/*`, `/api/operational-memory`, `/api/input-hub`, protected app routes under `src/app/(protected)`.
- **Workspace-member required**: `/api/projects`, `/api/getting-started`, `/api/onboarding`, `/api/intelligence/*`, `/api/operational-memory`, project pages/actions in protected project routes.
- **Owner/admin required**: team invitation server action, billing portal/checkout governance routes, governance approval/admin mutations.
- **System/webhook-only**: `/api/billing/webhook`, trust import handshakes and verifier ingress endpoints requiring handshake token/secret.
- **Capability-governed candidate**: `/api/copilot`, `/api/governance/*`, `/api/ai/*`, delegated authority and governed execution routes.

## Notes
- Middleware (`src/proxy.ts`) remains UX-first and is not treated as authorization enforcement.
- Server-side guard helpers in `src/lib/security/server-authorization.ts` centralize authn/authz checks for route handlers and server actions.
