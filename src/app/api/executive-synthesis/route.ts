import { getAuthUser } from "@/lib/auth";
import { buildExecutiveSynthesis } from "@/lib/executive-synthesis";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const synthesis = await buildExecutiveSynthesis(user.companyId, projectId);
  return Response.json(synthesis);
}
