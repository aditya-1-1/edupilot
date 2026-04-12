import type { SupabaseClient } from '@supabase/supabase-js'
import { getAnalytics } from '@/services/analytics'
import { completeJson } from '@/services/llm'
import { newId } from '@/utils/id'

export type WeeklyPlanFormat = {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

const DAYS: (keyof WeeklyPlanFormat)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function normalizePlan(raw: WeeklyPlanFormat): WeeklyPlanFormat {
  const out = { ...raw }
  for (const k of DAYS) {
    const v = out[k]
    out[k] = typeof v === 'string' && v.trim() ? v.trim() : 'Review'
  }
  if (!/quiz/i.test(out.saturday)) {
    out.saturday = out.saturday ? `${out.saturday} · Quiz` : 'Mixed Quiz'
  }
  if (!/rest/i.test(out.sunday)) {
    out.sunday = 'Rest'
  }
  return out
}

export async function generateWeeklyPlanFromProfile(supabase: SupabaseClient, userId: string) {
  const a = await getAnalytics(supabase, userId)

  const { data: mistakeRows, error: me } = await supabase
    .from('coding_mistakes')
    .select('mistake_type, language')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (me) throw new Error(me.message)

  const mistakeSummary = (mistakeRows ?? []).map((m) => `${m.language}: ${m.mistake_type}`).slice(0, 15)

  const { data: goalRows, error: ge } = await supabase
    .from('memory_extractions')
    .select('payload')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(40)

  if (ge) throw new Error(ge.message)

  const goalLines: string[] = []
  for (const row of goalRows ?? []) {
    try {
      const p = JSON.parse(row.payload as string) as { goals?: string[] }
      if (p.goals?.length) goalLines.push(...p.goals)
    } catch {
      /* skip */
    }
  }

  const context = {
    weakTopics: a.weakTopics,
    strongTopics: a.strongTopics,
    totalStudyMinutes: a.totalStudyMinutes,
    averageQuizScore: a.averageQuizScore,
    averageProgressDelta: a.averageProgressDelta,
    mistakeCount: a.mistakeCount,
    topicPerformance: a.topicPerformance.slice(0, 12),
    recentMistakePatterns: mistakeSummary,
    statedGoals: [...new Set(goalLines)].slice(0, 20),
  }

  const raw = await completeJson<WeeklyPlanFormat>({
    system: `You create a ONE-WEEK study schedule as JSON only.
Keys must be exactly: monday, tuesday, wednesday, thursday, friday, saturday, sunday.
Each value is a short label (topic focus) like "Recursion" or "Arrays + practice".
Rules:
- Monday–Friday: distribute weak topics and fill gaps using topic performance; avoid repeating the same label twice unless needed.
- Friday: prefer "Revision" or mixed review of the week.
- Saturday: MUST include the word "Quiz" in the value (e.g. "Mixed Quiz" or "Topic Quiz").
- Sunday: MUST include the word "Rest" (e.g. "Rest" or "Rest · light notes").
Keep labels concise (max ~4 words).`,
    user: `Learner data:\n${JSON.stringify(context, null, 2)}`,
  })

  const plan = normalizePlan(raw)
  return { plan, contextSummary: context }
}

export async function saveWeeklyStudyPlan(supabase: SupabaseClient, userId: string, plan: WeeklyPlanFormat) {
  const id = newId()
  const now = Date.now()
  const title = `Weekly plan · ${new Date(now).toLocaleDateString()}`
  const payload = JSON.stringify({ type: 'weekly_v1', days: plan })
  const { error } = await supabase.from('study_plans').insert({
    id,
    user_id: userId,
    title,
    payload,
    created_at: now,
  })
  if (error) throw new Error(error.message)
  return { id, createdAt: now, title }
}
