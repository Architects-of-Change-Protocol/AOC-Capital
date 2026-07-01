import { ConnectorAdapter, ConnectorDiagnostic, ConnectorReplay, ConnectorSignal, ConnectorSynchronizationState, ConnectorSystem } from "../types/connector-types";

export class BaseConnectorAdapter implements ConnectorAdapter {
  constructor(public connector: ConnectorSystem, private governance: ConnectorSignal["governance"]) {}
  async ingest(): Promise<ConnectorSignal[]> { return [{ id: `${this.connector}-${Date.now()}`, connector: this.connector, type: "activity", severity: "medium", occurredAt: new Date().toISOString(), actorHints: ["unknown@actor"], payload: { synthetic: true }, governance: this.governance }]; }
  async replay(from: string, to: string): Promise<ConnectorReplay> { return { connector: this.connector, from, to, eventsReplayed: 1, integrity: "verified" }; }
  async sync(): Promise<ConnectorSynchronizationState> { const now = new Date(); return { connector: this.connector, lastSyncAt: now.toISOString(), nextSyncAt: new Date(now.getTime() + 300000).toISOString(), intervalSeconds: 300, driftSeconds: 0, inFlight: false }; }
  async diagnostics(): Promise<ConnectorDiagnostic[]> { return [{ id: `${this.connector}-diag`, connector: this.connector, level: "info", message: "connector operational", reason: "heartbeat_ok", confidence: 0.9, uncertainty: [], createdAt: new Date().toISOString() }]; }
}
