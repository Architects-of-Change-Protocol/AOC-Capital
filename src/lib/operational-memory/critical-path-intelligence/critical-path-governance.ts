import type { CriticalPathRequest } from "./critical-path-types";
export function assertCriticalPathIsolation(request: CriticalPathRequest): void {
  if (!request.scope.companyId) throw new Error("critical_path_scope_company_required");
}
