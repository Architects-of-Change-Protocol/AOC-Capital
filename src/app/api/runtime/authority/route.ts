import { getAuthUser } from "@/lib/auth";
import { getRuntimeAuthorityView } from "@/lib/aoc/runtime-observability";
import { type OperationalDomain } from "@/lib/operational-memory";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? null;
  const sourceRef = searchParams.get("sourceRef")?.trim() ?? `user:${user.id}`;
  const domain = (searchParams.get("domain")?.trim() ?? "operational_memory") as OperationalDomain;

  const authorityView = await getRuntimeAuthorityView({ companyId: user.companyId, projectId, sourceRef, domain });
  return Response.json(authorityView);
}
