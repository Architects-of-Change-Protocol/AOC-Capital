import { BaseConnectorAdapter } from "./base-adapter";
export const gmailAdapter = (governance: { tenantId: string; workspaceId: string; allowedDomains: string[]; visibility: "workspace"|"executive" }) => new BaseConnectorAdapter("gmail", governance);
