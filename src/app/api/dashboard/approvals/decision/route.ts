import { validateApprovalMutationRequest } from '@/lib/dashboard/approval-mutations'

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON request body.' }, { status: 400 })
  }

  const validation = validateApprovalMutationRequest(body)
  if (!validation.valid) {
    return Response.json(
      { ok: false, error: 'Invalid approval mutation request.', errors: validation.errors, warnings: validation.warnings },
      { status: 400 },
    )
  }

  // TODO: Wire actor resolution through existing PMFreak auth context.
  return Response.json(
    {
      ok: false,
      error: 'Approval mutation API route is runtime-ready but store/auth wiring is not configured.',
    },
    { status: 501 },
  )
}
