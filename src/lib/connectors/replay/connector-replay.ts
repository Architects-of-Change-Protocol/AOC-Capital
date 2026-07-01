import { ConnectorReplay, ConnectorSystem } from "../types/connector-types";
export function buildConnectorReplay(connector: ConnectorSystem, from: string, to: string, eventsReplayed: number): ConnectorReplay { return { connector, from, to, eventsReplayed, integrity: eventsReplayed >= 0 ? "verified" : "partial" }; }
