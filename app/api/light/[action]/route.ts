import { handleLocalLightRequest, type LocalLightAction } from '@/lib/light-local-proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ACTIONS = new Set<LocalLightAction>(['on', 'off', 'mode'])

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params
  if (!ACTIONS.has(action as LocalLightAction)) {
    return Response.json(
      {
        ok: false,
        skipped: true,
        action,
        error: 'Unsupported light action',
      },
      { status: 200 },
    )
  }

  return handleLocalLightRequest(action as LocalLightAction, request)
}
