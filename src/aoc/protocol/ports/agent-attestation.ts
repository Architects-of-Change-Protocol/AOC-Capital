// AOC Protocol: AgentAttestationPort
// Future extraction boundary: replaces direct import of verifyAgentAttestation from PMFreak.
// Host provides agent token verification, signature checking, replay protection, and revocation.
// Do NOT import from host application modules in this file.

export interface AgentAttestationPort {
  verifyAttestation(input: {
    token: string;
    expectedAgentId: string;
    workspaceId: string;
    permission: string;
    projectId?: string;
  }): Promise<{ agentId: string; workspaceId: string }>;
}
