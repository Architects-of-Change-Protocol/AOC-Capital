import { ConnectorRuntime, ConnectorSignal, FederatedOperationalSignal } from "../types/connector-types";
import { ConnectorRegistry } from "./connector-registry";
import { normalizeConnectorSignal } from "../normalization/signal-normalization";
import { federateOperationalSignals } from "../federation/signal-federation";

export class ExternalConnectorRuntime implements ConnectorRuntime {
  constructor(private registry: ConnectorRegistry) {}
  async ingestAll(): Promise<ConnectorSignal[]> { const all = await Promise.all(this.registry.list().map((a) => a.ingest())); return all.flat(); }
  normalize(signals: ConnectorSignal[]) { return signals.map(normalizeConnectorSignal); }
  federate(signals: FederatedOperationalSignal[]) { return federateOperationalSignals(signals); }
}
