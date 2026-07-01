import type { OperationalMemoryScope } from "../runtime-memory-types";
import { assertScopeIsolation } from "../runtime-memory-scoping";
export function assertContinuityGovernanceScope(scope: OperationalMemoryScope): void { assertScopeIsolation(scope, scope); }
