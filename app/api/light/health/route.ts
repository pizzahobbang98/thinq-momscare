import { handleLocalLightHealthRequest } from '@/lib/light-local-proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return handleLocalLightHealthRequest()
}
