// AOC Protocol: AccessVerificationPort
// Future extraction boundary: replaces direct imports from PMFreak access-guards.
// Host provides identity resolution, workspace membership checks, and agent scope verification.
// AocAccessDeniedError is the protocol-neutral error type; the adapter wraps host errors into it.
// Do NOT import from host application modules in this file.

export class AocAccessDeniedError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "AocAccessDeniedError";
  }
}

export interface AccessVerificationPort {
  requireWorkspaceMembership(workspaceId: string): Promise<{ role: string }>;
  requireProjectPermission(
    projectId: string,
    permission: string
  ): Promise<{ role: string; workspaceId: string }>;
  requireGovernancePermission(
    workspaceId: string,
    permission: string
  ): Promise<{ role: string }>;
  requireAgentScope(input: {
    workspaceId: string;
    agentId: string;
    permission: string;
    projectId?: string;
  }): Promise<{ workspaceId: string; agentId: string; permission: string }>;
}
