import { ConnectorRegistry } from "./connector-registry";
export class ConnectorManager { constructor(private registry: ConnectorRegistry) {} listConnectors() { return this.registry.list().map((a) => a.connector); } }
