import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export const useOAuthRuntime = (connectorId?: string) =>
  useSWR(connectorId ? `/api/runtime/oauth?connectorId=${connectorId}` : null, fetcher);

export const useConnectorSession = (connectorId?: string) =>
  useSWR(connectorId ? `/api/runtime/connectors?connectorId=${connectorId}` : null, fetcher);

export const useAuthenticatedFederation = () =>
  useSWR("/api/runtime/federation", fetcher);

export const useLiveConnectorObservability = (connectorId?: string) =>
  useSWR(
    connectorId ? `/api/runtime/connectors?connectorId=${connectorId}&view=observability` : null,
    fetcher,
  );

export const useConnectorProvisioning = (connectorId?: string) =>
  useSWR(
    connectorId ? `/api/runtime/connectors?connectorId=${connectorId}&view=provisioning` : null,
    fetcher,
  );

export const useLiveConnectorTopology = () =>
  useSWR("/api/runtime/federation?view=topology", fetcher);

export const useConnectorHeartbeats = () =>
  useSWR("/api/runtime/connectors?view=heartbeats", fetcher);

export const useConnectorRecovery = (connectorId?: string) =>
  useSWR(
    connectorId ? `/api/runtime/connectors?connectorId=${connectorId}&view=recovery` : null,
    fetcher,
  );
