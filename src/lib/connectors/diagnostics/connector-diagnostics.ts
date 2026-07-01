import { ConnectorDiagnostic, ConnectorSystem } from "../types/connector-types";
export function connectorDiagnostic(connector: ConnectorSystem, reason: string, level: ConnectorDiagnostic["level"] = "info"): ConnectorDiagnostic {
  return { id: `${connector}-${Date.now()}`, connector, level, reason, message: `Connector ${connector} diagnostic: ${reason}`, confidence: 0.8, uncertainty: ["runtime dependent"], createdAt: new Date().toISOString() };
}
