import { BaseConnectorAdapter } from "./base-adapter";
export const jiraAdapter = (governance: { tenantId: string; workspaceId: string; allowedDomains: string[]; visibility: "workspace"|"executive" }) => new BaseConnectorAdapter("jira", governance);
