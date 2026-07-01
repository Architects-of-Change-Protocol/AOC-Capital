import type { PredictiveOperationalRequest } from "./predictive-intelligence-types";
import { validateOperationalScope } from "../runtime-memory-scoping";
export function assertPredictiveGovernanceScope(request: PredictiveOperationalRequest) { validateOperationalScope(request.scope); }
