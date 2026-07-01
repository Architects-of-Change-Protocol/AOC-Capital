import { FederatedOperationalSignal, SignalFederationResult } from "../types/connector-types";

export function federateOperationalSignals(signals: FederatedOperationalSignal[]): SignalFederationResult {
  const confidence = signals.length ? Math.max(0.6, Math.min(0.95, signals.reduce((a, s) => a + s.confidence, 0) / signals.length)) : 0;
  return { signals, confidence, uncertainty: signals.length ? ["cross-system causality is probabilistic"] : ["no signals"], rationale: `Federated ${signals.length} normalized signals into a deterministic evidence set.` };
}
