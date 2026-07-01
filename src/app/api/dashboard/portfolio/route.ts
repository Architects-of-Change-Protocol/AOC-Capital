import { getAuthUser } from '@/lib/auth'
import { runDashboardApiRuntime } from '@/lib/dashboard/api-runtime'

export async function GET() {
  const user = await getAuthUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = runDashboardApiRuntime({
    tenantId: user.companyId,
    userId: user.id,
    includeMetadata: true,
  })

  return Response.json(result)
}
