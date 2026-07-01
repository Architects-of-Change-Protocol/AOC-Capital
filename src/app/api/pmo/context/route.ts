import { getAuthUser } from "@/lib/auth";
import { resolveCanonicalWorkspace } from "@/lib/workspaces/canonical-workspace-resolver";
import { loadPmoTenant } from "@/lib/pmo/load-pmo-tenant";
import { resolveEnabledDomains } from "@/lib/pmo/agent-domain-map";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const resolution = await resolveCanonicalWorkspace(user.id);
  if (!resolution.workspaceId) {
    return Response.json({ found: false });
  }

  const result = await loadPmoTenant(resolution.workspaceId);
  if (!result.found) return Response.json({ found: false });

  const { tenant } = result;
  return Response.json({
    found: true,
    pmoName: tenant.identity.pmoName,
    organizationName: tenant.identity.organizationName,
    pmoType: tenant.identity.pmoType,
    operatingModel: tenant.identity.operatingModel,
    methodology: tenant.governance.methodology,
    reportingCadence: tenant.governance.reportingCadence,
    projectScale: tenant.governance.projectScale,
    vaultProvider: tenant.vault.provider,
    enabledDomains: resolveEnabledDomains(tenant.agents),
    strategicObjective: tenant.contextSeed.strategicObjective,
    deliveryChallenges: tenant.contextSeed.deliveryChallenges,
    successDefinition: tenant.contextSeed.successDefinition,
  });
}
