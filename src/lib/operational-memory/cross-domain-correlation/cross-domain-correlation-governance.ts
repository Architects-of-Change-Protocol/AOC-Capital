import { assertScopeIsolation } from "../runtime-memory-scoping";
import type { CrossDomainCorrelationRequest } from "./cross-domain-correlation-types";

export const GOVERNANCE_HINTS = ["governance","approval","compliance","scope ambiguity","process instability"];

export function assertCrossDomainGovernanceScope(request: CrossDomainCorrelationRequest): void {
  assertScopeIsolation(request.scope, request.scope);
}
