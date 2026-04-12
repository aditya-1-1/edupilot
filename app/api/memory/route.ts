import { z } from 'zod'
import { insertMemory, listMemories } from '@/memory/hindsight'
import { jsonError, jsonOk } from '@/utils/api-response'
import { newId } from '@/utils/id'
import { requireSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postSchema = z.object({
  content: z.string().min(1).max(32000),
  summary: z.string().max(2000).optional(),
  embeddingHint: z.string().max(2000).optional(),
  importance: z.number().min(0).max(1).optional(),
  sessionId: z.string().max(128).optional(),
})

export async function GET(req: Request) {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const userId = auth.userId
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? '50') || 50, 200)
    const { supabase } = auth
    const memories = await listMemories(supabase, userId, limit)
    return jsonOk({ memories })
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
    const id = newId()
    await insertMemory(supabase, {
      id,
      userId,
      content: parsed.content,
      summary: parsed.summary ?? null,
      embeddingHint: parsed.embeddingHint ?? null,
      importance: parsed.importance,
      sessionId: parsed.sessionId ?? null,
    })
    return jsonOk({ id })
  } catch (e) {
    return jsonError(e)
  }
}
