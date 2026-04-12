import { z } from 'zod'
import { listProgress, recordProgress } from '@/services/progress'
import { jsonError, jsonOk } from '@/utils/api-response'
import { requireSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postSchema = z.object({
  topic: z.string().min(1).max(500),
  scoreDelta: z.number().int().min(-1000).max(1000).optional(),
  minutesStudied: z.number().int().min(0).max(24 * 60).optional(),
  note: z.string().max(2000).optional(),
})

export async function GET(req: Request) {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const userId = auth.userId
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? '100') || 100, 500)
    const { supabase } = auth
    const events = await listProgress(supabase, userId, limit)
    return jsonOk({ events })
  } catch (e) {
    return jsonError(e)
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const json = await req.json()
    const parsed = postSchema.parse(json)
    const userId = auth.userId
    const { supabase } = auth
    const saved = await recordProgress(supabase, {
      userId,
      topic: parsed.topic,
      scoreDelta: parsed.scoreDelta,
      minutesStudied: parsed.minutesStudied,
      note: parsed.note,
    })
    return jsonOk({ saved })
  } catch (e) {
    return jsonError(e)
  }
}
