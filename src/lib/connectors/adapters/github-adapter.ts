import { BaseConnectorAdapter } from "./base-adapter";
export const githubAdapter = (governance: { tenantId: string; workspaceId: string; allowedDomains: string[]; visibility: "workspace"|"executive" }) => new BaseConnectorAdapter("github", governance);
