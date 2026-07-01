import type { AocActorContext } from "@/aoc/protocol/actor-model";
import type { AuthUserContext } from "@/lib/auth";

export type { AocActorContext };

export function resolveUserAocActorContext(
  user: AuthUserContext,
  opts?: { workspaceId?: string; projectId?: string; roles?: string[]; permissions?: string[] }
): AocActorContext {
  return {
    actorId: user.id,
    actorType: "user",
    workspaceId: opts?.workspaceId,
    projectId: opts?.projectId,
    roles: opts?.roles,
    permissions: opts?.permissions,
  };
}

export function resolveAgentAocActorContext(
  agentId: string,
  opts?: { workspaceId?: string; projectId?: string; scopes?: string[] }
): AocActorContext {
  return {
    actorId: agentId,
    actorType: "ai_agent",
    workspaceId: opts?.workspaceId,
    projectId: opts?.projectId,
    permissions: opts?.scopes,
  };
}

export function createSystemAocActorContext(
  purpose: string,
  opts?: { workspaceId?: string; projectId?: string }
): AocActorContext {
  return {
    actorId: `system:${purpose}`,
    actorType: "system",
    workspaceId: opts?.workspaceId,
    projectId: opts?.projectId,
  };
}
