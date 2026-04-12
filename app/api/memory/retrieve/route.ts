import { z } from 'zod'
import { retrieveHindsightMemories } from '@/memory/hindsight'
import { jsonError, jsonOk } from '@/utils/api-response'
import { requireSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  query: z.string().min(1).max(8000),
  limit: z.number().min(1).max(50).optional(),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = bodySchema.parse(json)
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const userId = auth.userId
    const { supabase } = auth
    const memories = await retrieveHindsightMemories(supabase, userId, parsed.query, parsed.limit ?? 8)
    return jsonOk({ memories })
  } catch (e) {
    return jsonError(e)
  }
}
