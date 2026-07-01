import { getAuthUser } from "@/lib/auth";
import { getCompanySubscription } from "@/lib/billing";
import { canCreatePmoWorkspace, canInviteTeamMembers, canUseAdvancedAi, getPlanCapabilities, getSeatLimit, getUploadLimit } from "@/lib/feature-gates";
import { denyResponse } from "@/lib/security/deny-response";
import { getCompanyUsage } from "@/lib/usage-limits";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/billing/state", message: "Unauthorized", reason: "unauthorized" });

  const subscription = await getCompanySubscription(user.companyId);
  const usage = await getCompanyUsage(user.companyId);
  const capabilities = getPlanCapabilities(subscription.plan);

  const [pmoWorkspaceGate, inviteGate, advancedAiGate] = await Promise.all([
    canCreatePmoWorkspace(user.id),
    canInviteTeamMembers(user.id),
    canUseAdvancedAi(user.id),
  ]);

  return Response.json({
    subscription,
    usage,
    limits: {
      uploadLimit: getUploadLimit(subscription.plan),
      seatLimit: getSeatLimit(subscription.plan),
      canRunAiAnalysis: capabilities.ai_analysis,
      canExportReports: capabilities.exports,
      canUsePortfolioMemory: capabilities.organizational_memory,
      canCreatePmoWorkspace: pmoWorkspaceGate.ok,
      canInviteTeamMembers: inviteGate.ok,
      canUseAdvancedAi: advancedAiGate.ok,
    },
  });
}
