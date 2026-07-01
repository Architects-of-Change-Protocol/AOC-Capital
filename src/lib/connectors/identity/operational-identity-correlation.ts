import { ConnectorSignal, OperationalIdentityCorrelation } from "../types/connector-types";

export function correlateOperationalIdentities(signals: ConnectorSignal[]): OperationalIdentityCorrelation {
  const map = new Map<string, Set<string>>();
  for (const signal of signals) for (const hint of signal.actorHints) { if (!map.has(hint)) map.set(hint, new Set()); map.get(hint)?.add(signal.connector); }
  const identities = [...map.entries()].map(([alias, systems], idx) => ({ canonicalId: `actor-${idx + 1}`, displayName: alias, aliases: [alias], systems: [...systems] as never, confidence: 0.75 }));
  return { identities, rationale: "Alias-based deterministic stitching across connector actor hints.", confidence: identities.length ? 0.75 : 0, uncertainty: identities.length ? ["alias collisions possible"] : ["no actor hints"] };
}
