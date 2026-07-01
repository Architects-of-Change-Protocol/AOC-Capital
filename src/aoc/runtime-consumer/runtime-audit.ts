export function buildRuntimeAuditMetadata(input: {
  routeId?: string;
  workspaceId?: string | null;
  projectId?: string | null;
  decisionId?: string | null;
  failClosed: boolean;
}) {
  return {
    authoritySource: "runtime-consumer",
    delegatedTo: "enterprise-runtime",
    failClosed: input.failClosed,
    routeId: input.routeId ?? null,
    workspaceId: input.workspaceId ?? null,
    projectId: input.projectId ?? null,
    decisionId: input.decisionId ?? null,
  };
}
