import { getAuthUser } from "@/lib/auth";
import { buildChangeDetectionSnapshot } from "@/lib/change-detection";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const snapshot = await buildChangeDetectionSnapshot(user.companyId, projectId);
  return Response.json(snapshot);
}
