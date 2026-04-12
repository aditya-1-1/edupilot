import type { SupabaseClient } from '@supabase/supabase-js'
import { completeJson } from '@/services/llm'
import { newId } from '@/utils/id'

export type StudyPlanPayload = {
  title: string
  durationWeeks: number
  goals: string[]
  weeklyOutline: { week: number; focus: string; tasks: string[] }[]
  resources: string[]
}

export async function generateStudyPlan(input: {
  topic: string
  level?: string
  hoursPerWeek?: number
}) {
  const level = input.level ?? 'intermediate'
  const hours = input.hoursPerWeek ?? 5
  return completeJson<StudyPlanPayload>({
    system: `You create structured study plans. Fields: title, durationWeeks (number), goals (string array), weeklyOutline (array of {week, focus, tasks}), resources (string array). Tailor to level ${level} and about ${hours} hours per week.`,
    user: `Topic: ${input.topic}`,
  })
}

export async function saveStudyPlan(supabase: SupabaseClient, userId: string, plan: StudyPlanPayload) {
  const id = newId()
  const now = Date.now()
  const { error } = await supabase.from('study_plans').insert({
    id,
    user_id: userId,
    title: plan.title,
    payload: JSON.stringify(plan),
    created_at: now,
  })
  if (error) throw new Error(error.message)
  return { id, createdAt: now }
}
