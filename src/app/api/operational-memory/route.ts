import { getAuthUser } from "@/lib/auth";
import { denyResponse } from "@/lib/security/deny-response";
import { authorizeRuntimeAction } from "@/aoc/runtime-consumer";
import { buildEnterpriseRuntimeRequest } from "@/aoc/runtime-consumer";
import {
  appendOperationalMemory,
  extractOperationalMemoryCandidates,
  getOperationalMemory,
  MEMORY_TYPES,
  type MemoryType,
  type MemorySourceType,
} from "@/lib/operational-memory-v1";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/operational-memory", message: "Unauthorized", reason: "unauthorized" });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? null;
  if (projectId) {
    const decision = await authorizeRuntimeAction(
      buildEnterpriseRuntimeRequest({ user, action: "memory.read", routeId: "/api/operational-memory", workspaceId: user.companyId, projectId, resourceType: "project", resourceId: projectId }),
    );
    if (!decision.allowed) return denyResponse({ status: 403, routeId: "/api/operational-memory", message: "Invalid project context.", reason: decision.reason, actorUserId: user.id, projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" });
  }
  const unresolvedOnly = searchParams.get("unresolvedOnly") === "true";
  const type = searchParams.get("memoryType")?.trim() as MemoryType | undefined;

  const records = await getOperationalMemory({
    companyId: user.companyId,
    projectId,
    unresolvedOnly,
    memoryTypes: type && MEMORY_TYPES.includes(type) ? [type] : undefined,
    limit: 50,
  });

  return Response.json({ records });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/operational-memory", message: "Unauthorized", reason: "unauthorized" });

  const body = (await request.json()) as {
    projectId?: string | null;
    text?: string;
    sourceType?: MemorySourceType;
    sourceReference?: string;
  };

  if (!body.text?.trim()) return Response.json({ error: "text required" }, { status: 400 });
  if (body.projectId?.trim()) {
    const projectId = body.projectId.trim();
    const decision = await authorizeRuntimeAction(
      buildEnterpriseRuntimeRequest({ user, action: "memory.write", routeId: "/api/operational-memory", workspaceId: user.companyId, projectId, resourceType: "project", resourceId: projectId }),
    );
    if (!decision.allowed) return denyResponse({ status: 403, routeId: "/api/operational-memory", message: "Invalid project context.", reason: decision.reason, actorUserId: user.id, projectId, requestedPermission: "write_memory", deniedPermission: "write_memory", eventType: "project_scope_violation" });
  }

  const candidates = extractOperationalMemoryCandidates({
    text: body.text,
    sourceType: body.sourceType ?? "manual",
    sourceReference: body.sourceReference ?? "manual-entry",
  });

  const inserted = await appendOperationalMemory({
    companyId: user.companyId,
    projectId: body.projectId?.trim() || null,
    entries: candidates,
  });

  return Response.json({ insertedCount: inserted.length, records: inserted }, { status: 201 });
}
