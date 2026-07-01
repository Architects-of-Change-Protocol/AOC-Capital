import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();

  return Response.json({
    authenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          email: user.email,
          companyId: user.companyId,
          role: user.role,
        }
      : null,
  });
}
