import type { OperationalMemoryScope } from "../runtime-memory-types";
export const buildRealtimeTelemetryContextKey = (scope: OperationalMemoryScope): string => `${scope.companyId}:${scope.workspaceId ?? "global"}:${scope.projectId ?? "portfolio"}`;
