import { BaseConnectorAdapter } from "./base-adapter";
export const slackAdapter = (governance: { tenantId: string; workspaceId: string; allowedDomains: string[]; visibility: "workspace"|"executive" }) => new BaseConnectorAdapter("slack", governance);
