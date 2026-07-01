import { getAuthUser } from "@/lib/auth";
import { readProjectMemory } from "@/lib/project-memory";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const memory = await readProjectMemory(user.companyId);
  const projects = memory.map((item) => ({ id: item.id, projectName: item.projectName, uploadDate: item.uploadDate }));
  return Response.json({ projects });
}
