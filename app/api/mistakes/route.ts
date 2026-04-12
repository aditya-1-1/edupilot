import { z } from 'zod'
import { listMistakes, recordMistake } from '@/services/mistakes'
import { jsonError, jsonOk } from '@/utils/api-response'
import { requireSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postSchema = z.object({
  language: z.string().min(1).max(64),
  mistakeType: z.string().min(1).max(200),
  snippet: z.string().max(8000).optional(),
  context: z.string().max(8000).optional(),
  resolved: z.boolean().optional(),
  topic: z.string().max(200).optional(),
  problemId: z.string().max(128).optional(),
})

export async function GET(req: Request) {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const userId = auth.userId
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? '100') || 100, 500)
    const { supabase } = auth
    const mistakes = await listMistakes(supabase, userId, limit)
    return jsonOk({ mistakes })
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
    const saved = await recordMistake(supabase, {
      userId,
      language: parsed.language,
      mistakeType: parsed.mistakeType,
      snippet: parsed.snippet,
      context: parsed.context,
      resolved: parsed.resolved,
      topic: parsed.topic,
      problemId: parsed.problemId,
    })
    return jsonOk({ saved })
  } catch (e) {
    return jsonError(e)
  }
}
