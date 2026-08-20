import { z } from 'zod'
import { runChatWithMemory } from '@/services/chat'
import { completeChat } from '@/services/llm'
import { jsonError, jsonOk } from '@/utils/api-response'
import { newId } from '@/utils/id'
import { optionalSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(16000),
})

const bodySchema = z.object({
  message: z.string().min(1).max(16000),
  sessionId: z.string().uuid().optional(),
  storeMemory: z.boolean().optional(),
  guestId: z.string().optional(),
  recentMessages: z.array(messageSchema).optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await optionalSessionUserId()
    const json = await req.json()
    const parsed = bodySchema.parse(json)
    const sessionId = parsed.sessionId ?? newId()

    if (auth.userId) {
      const result = await runChatWithMemory(auth.supabase, {
        userId: auth.userId,
        sessionId,
        message: parsed.message,
        storeMemory: parsed.storeMemory ?? true,
      })
      return jsonOk(result)
    }

    const transcript = (parsed.recentMessages ?? [])
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    const system = `You are MentorMind, a concise AI learning mentor.

SESSION TRANSCRIPT:
${transcript || '(start of conversation)'}`

    const reply = await completeChat({
      system,
      user: parsed.message,
    })

    return jsonOk({
      reply,
      sessionId,
      hindsightUsed: 0,
    })
  } catch (e) {
    return jsonError(e)
  }
}
