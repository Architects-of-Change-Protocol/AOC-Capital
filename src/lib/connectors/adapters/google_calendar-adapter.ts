import { BaseConnectorAdapter } from "./base-adapter";
export const google_calendarAdapter = (governance: { tenantId: string; workspaceId: string; allowedDomains: string[]; visibility: "workspace"|"executive" }) => new BaseConnectorAdapter("google_calendar", governance);
