import { z } from 'zod'
import { generateStudyPlan, saveStudyPlan } from '@/services/study-plan'
import { jsonError, jsonOk } from '@/utils/api-response'
import { optionalSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  topic: z.string().min(1).max(2000),
  level: z.string().max(64).optional(),
  hoursPerWeek: z.number().min(1).max(80).optional(),
  persist: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await optionalSessionUserId()

    const json = await req.json()
    const parsed = bodySchema.parse(json)
    const plan = await generateStudyPlan({
      topic: parsed.topic,
      level: parsed.level,
      hoursPerWeek: parsed.hoursPerWeek,
    })
    let saved: { id: string; createdAt: number } | null = null
    if (auth.userId && parsed.persist !== false) {
      const { supabase } = auth
      saved = await saveStudyPlan(supabase, auth.userId, plan)
    }
    return jsonOk({ plan, saved })
  } catch (e) {
    return jsonError(e)
  }
}
