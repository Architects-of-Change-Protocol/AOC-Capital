import { BaseConnectorAdapter } from "./base-adapter";
export const notionAdapter = (governance: { tenantId: string; workspaceId: string; allowedDomains: string[]; visibility: "workspace"|"executive" }) => new BaseConnectorAdapter("notion", governance);
