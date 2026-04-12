import { buildMemoryTimeline } from '@/services/timeline'
import { jsonError, jsonOk } from '@/utils/api-response'
import { requireSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const userId = auth.userId
    const { supabase } = auth
    const items = await buildMemoryTimeline(supabase, userId)
    return jsonOk({ items })
  } catch (e) {
    return jsonError(e)
  }
}
