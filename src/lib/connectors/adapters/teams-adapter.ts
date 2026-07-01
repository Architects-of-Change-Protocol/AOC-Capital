import { BaseConnectorAdapter } from "./base-adapter";
export const teamsAdapter = (governance: { tenantId: string; workspaceId: string; allowedDomains: string[]; visibility: "workspace"|"executive" }) => new BaseConnectorAdapter("teams", governance);
