import { ConnectorAdapter } from "../types/connector-types";
export class ConnectorRegistry { private adapters = new Map<string, ConnectorAdapter>(); register(adapter: ConnectorAdapter) { this.adapters.set(adapter.connector, adapter); } list() { return [...this.adapters.values()]; } get(connector: string) { return this.adapters.get(connector); } }
