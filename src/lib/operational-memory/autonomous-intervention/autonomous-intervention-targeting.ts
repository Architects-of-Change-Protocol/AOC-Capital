import type { AutonomousInterventionContext, InterventionTarget } from "./autonomous-intervention-types";
export function buildInterventionTarget(context: AutonomousInterventionContext, domain: InterventionTarget["domain"], stakeholderRole?: string): InterventionTarget {
  return { domain, stakeholderRole, targetReference: `${context.request.scope.companyId}/${context.request.scope.workspaceId}/${context.request.scope.projectId}`, scopeEvidence: ["tenant_workspace_project_scope_validated"] };
}
