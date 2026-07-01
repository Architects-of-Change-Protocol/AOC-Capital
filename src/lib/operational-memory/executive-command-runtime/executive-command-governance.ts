import type { ExecutiveCommandRequest } from "./executive-command-types";

export function assertExecutiveCommandScope(request: ExecutiveCommandRequest) {
  if (!request.scope?.companyId) throw new Error("executive_command_scope_requires_tenant");
  if (!request.scope?.workspaceId) throw new Error("executive_command_scope_requires_workspace");
}
