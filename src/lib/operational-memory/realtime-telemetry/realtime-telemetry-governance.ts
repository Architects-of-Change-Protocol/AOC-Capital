import type { RealtimeTelemetryRequest } from "./realtime-telemetry-types";
export const assertTelemetryGovernance = (request: RealtimeTelemetryRequest): void => {
  if (!request.scope.companyId) throw new Error("Telemetry governance violation: companyId is required.");
  if (request.scope.workspaceId === null) throw new Error("Telemetry governance violation: workspaceId is required for realtime telemetry.");
};
