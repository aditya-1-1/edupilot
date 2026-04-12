import { z } from 'zod'
import { runChatWithMemory } from '@/services/chat'
import { jsonError, jsonOk } from '@/utils/api-response'
import { newId } from '@/utils/id'
import { optionalSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  message: z.string().min(1).max(16000),
  sessionId: z.string().uuid().optional(),
  storeMemory: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await optionalSessionUserId()

    const json = await req.json()
    const parsed = bodySchema.parse(json)
    const userId = auth.userId
    const sessionId = parsed.sessionId ?? newId()
    const { supabase } = auth
    // For guest users, don't store memory
    const storeMemory = userId ? (parsed.storeMemory ?? true) : false
    const result = await runChatWithMemory(supabase, {
      userId: userId || 'guest',
      sessionId,
      message: parsed.message,
      storeMemory,
    })
    return jsonOk(result)
  } catch (e) {
    return jsonError(e)
  }
}
