import { z } from 'zod'
import { generateWeeklyPlanFromProfile, saveWeeklyStudyPlan } from '@/services/study-plan-weekly'
import { jsonError, jsonOk } from '@/utils/api-response'
import { optionalSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  persist: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await optionalSessionUserId()

    if (!auth.userId) {
      // For guests, return a message
      return jsonOk({
        plan: null,
        contextSummary: "Sign in to generate personalized weekly study plans based on your progress and goals.",
        saved: null
      })
    }

    const json = await req.json().catch(() => ({}))
    const parsed = bodySchema.parse(json)
    const userId = auth.userId
    const { supabase } = auth
    const { plan, contextSummary } = await generateWeeklyPlanFromProfile(supabase, userId)
    let saved: { id: string; createdAt: number; title: string } | null = null
    if (parsed.persist !== false) {
      saved = await saveWeeklyStudyPlan(supabase, userId, plan)
    }
    return jsonOk({ plan, contextSummary, saved })
  } catch (e) {
    return jsonError(e)
  }
}
