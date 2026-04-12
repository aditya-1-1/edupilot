import { z } from 'zod'
import { generateQuiz, saveQuiz } from '@/services/quiz'
import { jsonError, jsonOk } from '@/utils/api-response'
import { requireSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  topic: z.string().min(1).max(2000),
  numQuestions: z.number().min(1).max(20).optional(),
  difficulty: z.string().max(64).optional(),
  persist: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const json = await req.json()
    const parsed = bodySchema.parse(json)
    const quiz = await generateQuiz({
      topic: parsed.topic,
      numQuestions: parsed.numQuestions,
      difficulty: parsed.difficulty,
    })
    const userId = auth.userId
    let saved: { id: string; createdAt: number } | null = null
    if (parsed.persist !== false) {
      const { supabase } = auth
      saved = await saveQuiz(supabase, userId, quiz)
    }
    return jsonOk({ quiz, saved })
  } catch (e) {
    return jsonError(e)
  }
}
