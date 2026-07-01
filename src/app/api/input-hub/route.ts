import { getAuthUser } from "@/lib/auth";
import { routeOperationalInput } from "@/lib/input-routing";
import { listOperationalMemory } from "@/lib/operational-memory";
import type { InputHubMode } from "@/lib/operational-classifier";
import { AccessDeniedError, requireProjectPermission } from "@/aoc/runtime-consumer";
import { denyFromAccessError, denyResponse } from "@/lib/security/deny-response";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/input-hub", message: "Unauthorized", reason: "unauthorized" });
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (projectId?.trim()) {
    try {
      await requireProjectPermission(projectId.trim(), "read");
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return denyFromAccessError(error, { status: 403, routeId: "/api/input-hub", message: "Invalid project context.", actorUserId: user.id, projectId: projectId.trim(), requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" });
      }
      throw error;
    }
  }
  const records = await listOperationalMemory(user.companyId, projectId);
  return Response.json({ records: records.slice(0, 12) });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/input-hub", message: "Unauthorized", reason: "unauthorized" });

  const body = (await request.json()) as {
    projectId?: string | null;
    mode?: InputHubMode;
    title?: string;
    text?: string;
    contextNote?: string;
    fileName?: string;
    mimeType?: string;
  };

  if (!body.mode || !body.title || !body.text) {
    return Response.json({ error: "mode, title, text required" }, { status: 400 });
  }
  if (body.projectId?.trim()) {
    try {
      await requireProjectPermission(body.projectId.trim(), "write_memory");
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return denyFromAccessError(error, { status: 403, routeId: "/api/input-hub", message: "Invalid project context.", actorUserId: user.id, projectId: body.projectId.trim(), requestedPermission: "write_memory", deniedPermission: "write_memory", eventType: "project_scope_violation" });
      }
      throw error;
    }
  }

  const result = await routeOperationalInput({
    companyId: user.companyId,
    projectId: body.projectId ?? null,
    mode: body.mode,
    title: body.title,
    text: body.text,
    sourceRef: `${user.id}:${body.mode}`,
    contextNote: body.contextNote,
    fileName: body.fileName,
    mimeType: body.mimeType,
  });

  return Response.json({ result }, { status: 201 });
}
