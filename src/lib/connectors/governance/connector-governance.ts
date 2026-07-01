import { ConnectorGovernanceBoundary, ConnectorSignal } from "../types/connector-types";
export function enforceGovernanceBoundary(signal: ConnectorSignal, boundary: ConnectorGovernanceBoundary): ConnectorSignal | null {
  if (signal.governance.tenantId !== boundary.tenantId || signal.governance.workspaceId !== boundary.workspaceId) return null;
  return { ...signal, governance: boundary };
}
