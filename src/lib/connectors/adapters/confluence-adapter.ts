import { BaseConnectorAdapter } from "./base-adapter";
export const confluenceAdapter = (governance: { tenantId: string; workspaceId: string; allowedDomains: string[]; visibility: "workspace"|"executive" }) => new BaseConnectorAdapter("confluence", governance);
