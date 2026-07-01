import { getAuthUser } from "@/lib/auth";
import { getCompanySubscription } from "@/lib/billing";
import { enforceRuntimeAuthorization } from "@/aoc/runtime-consumer";
import { denyResponse } from "@/lib/security/deny-response";
import { getStripeServerClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return denyResponse({ status: 401, routeId: "/api/billing/create-portal-session", message: "Unauthorized", reason: "unauthorized" });
  }
  const workspaceId = request.headers.get("x-pmf-workspace-id");
  if (!workspaceId) return denyResponse({ status: 403, routeId: "/api/billing/create-portal-session", message: "Workspace context required.", reason: "workspace_missing", eventType: "billing_governance_denied", actorUserId: user.id });
  const governance = await enforceRuntimeAuthorization({
    actorType: "user",
    actorUserId: user.id,
    workspaceId,
    action: "billing.manage",
    routeId: "/api/billing/create-portal-session",
    requestedPermission: "manage_billing",
    resourceType: "billing",
  });
  if (governance.response) return governance.response;

  const subscription = await getCompanySubscription(user.companyId);

  if (!subscription.stripeCustomerId) {
    return Response.json({ error: "No Stripe customer found for this company." }, { status: 400 });
  }

  try {
    const stripe = getStripeServerClient();
    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${origin}/billing`,
    });

    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "Unable to create Stripe billing portal session." }, { status: 502 });
  }
}
