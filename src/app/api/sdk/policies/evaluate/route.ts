import { evaluatePolicyDecision } from "@/lib/security/policy-engine";
import { getAuthUser } from "@/lib/auth";
import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";
import type { AocActorContext } from "@/aoc/protocol/actor-model";

export async function POST(request: Request) {
  ensurePmfreakAocAdaptersRegistered();
  const body = await request.json();

  let actor: AocActorContext;
  if (body.actor && body.actor.actorId && body.actor.actorType) {
    actor = body.actor as AocActorContext;
  } else {
    const user = await getAuthUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    actor = { actorId: user.id, actorType: "user", workspaceId: body.workspaceId };
  }

  const result = await evaluatePolicyDecision({ ...body, actor });
  return Response.json({
    ...result,
    decisionSource: "policy-simulation",
    authoritative: false,
    productionAuthority: "enterprise-runtime",
  });
}
