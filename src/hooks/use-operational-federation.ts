import useSWR from "swr";
const fetcher = (url: string) => fetch(url).then((r) => r.json());
export const useConnectorHealth = () => useSWR("/api/connectors/health", fetcher);
export const useFederatedSignals = () => useSWR("/api/connectors/signals", fetcher);
export const useOperationalFederation = () => useSWR("/api/connectors/federation", fetcher);
export const useConnectorReplay = () => useSWR("/api/connectors/replay", fetcher);
export const useSourceLineage = () => useSWR("/api/connectors/lineage", fetcher);
