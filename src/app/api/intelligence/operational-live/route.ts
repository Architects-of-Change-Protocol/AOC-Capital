import { AccessDeniedError, requireProjectPermission } from "@/aoc/runtime-consumer";
import { denyFromAccessError } from "@/lib/security/deny-response";
import { buildMockOperationalIntelligence } from "@/lib/operational-intelligence";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? "";
  if (projectId) {
    try { await requireProjectPermission(projectId, "read"); } catch (error) { if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/intelligence/operational-live", message: "Invalid project context.", projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" }); throw error; }
  }

  const operational = buildMockOperationalIntelligence(projectId || null);

  return Response.json({ mode: "live_telemetry_mock", generatedAt: new Date().toISOString(), projectId: projectId || null, ...operational });
}
