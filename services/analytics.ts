import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalyticsPayload } from '@/lib/analytics-types'
import type { TurnMemoryPayload } from '@/memory/extraction-types'

type TopicStat = { topic: string; totalScoreDelta: number; sessions: number; minutes: number }

function parsePayload(raw: string): TurnMemoryPayload {
  try {
    return JSON.parse(raw) as TurnMemoryPayload
  } catch {
    return { weakTopics: [], mistakes: [], goals: [], progress: [] }
  }
}

async function countWeakTopics(supabase: SupabaseClient, userId: string, limit = 20): Promise<string[]> {
  const { data: rows, error } = await supabase
    .from('memory_extractions')
    .select('payload')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  const freq = new Map<string, number>()
  for (const r of rows ?? []) {
    const p = parsePayload(r.payload as string)
    for (const w of p.weakTopics) {
      const k = w.trim().toLowerCase()
      if (!k) continue
      freq.set(k, (freq.get(k) ?? 0) + 1)
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k.replace(/\b\w/g, (c) => c.toUpperCase()))
}

export async function getAnalytics(supabase: SupabaseClient, userId: string): Promise<AnalyticsPayload> {
  const { data: progressRows, error: pe } = await supabase
    .from('progress_events')
    .select('topic, score_delta, minutes_studied, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (pe) throw new Error(pe.message)

  const rows = progressRows ?? []
  const totalStudyMinutes = rows.reduce((s, r) => s + ((r.minutes_studied as number) || 0), 0)
  const scoreDeltas = rows.map((r) => (r.score_delta as number) || 0)
  const averageProgressDelta =
    scoreDeltas.length === 0 ? null : scoreDeltas.reduce((a, b) => a + b, 0) / scoreDeltas.length

  const byTopic = new Map<string, TopicStat>()
  for (const r of rows) {
    const t = String(r.topic || '').trim() || 'General'
    const cur = byTopic.get(t) ?? { topic: t, totalScoreDelta: 0, sessions: 0, minutes: 0 }
    cur.totalScoreDelta += (r.score_delta as number) || 0
    cur.sessions += 1
    cur.minutes += (r.minutes_studied as number) || 0
    byTopic.set(t, cur)
  }

  const topicList = [...byTopic.values()]
  const strongTopics = topicList
    .filter((t) => t.totalScoreDelta > 0)
    .sort((a, b) => b.totalScoreDelta - a.totalScoreDelta)
    .slice(0, 12)
    .map((t) => t.topic)

  const weakFromProgress = topicList
    .filter((t) => t.totalScoreDelta < 0 || (t.sessions >= 2 && t.totalScoreDelta <= 0))
    .sort((a, b) => a.totalScoreDelta - b.totalScoreDelta)
    .slice(0, 8)
    .map((t) => t.topic)

  const weakFromMemory = await countWeakTopics(supabase, userId, 15)
  const weakTopics = [...new Set([...weakFromMemory, ...weakFromProgress])].slice(0, 20)

  const topicPerformance = topicList
    .map((t) => ({
      topic: t.topic,
      avgScoreDelta: t.sessions ? t.totalScoreDelta / t.sessions : 0,
      totalMinutes: t.minutes,
    }))
    .sort((a, b) => b.avgScoreDelta - a.avgScoreDelta)

  const { count: mistakeCount } = await supabase
    .from('coding_mistakes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { count: memoryExtractionCount } = await supabase
    .from('memory_extractions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { count: quizHistoryCount } = await supabase
    .from('quiz_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { data: quizRows } = await supabase
    .from('quiz_history')
    .select('score_percent')
    .eq('user_id', userId)

  const qs = (quizRows ?? [])
    .map((r) => r.score_percent)
    .filter((s): s is number => s != null && typeof s === 'number')
  const averageQuizScore = qs.length === 0 ? null : qs.reduce((s, r) => s + r, 0) / qs.length

  const dayMap = new Map<string, { minutes: number; scoreDeltaSum: number }>()
  for (const r of rows) {
    const d = new Date(Number(r.created_at))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const cur = dayMap.get(key) ?? { minutes: 0, scoreDeltaSum: 0 }
    cur.minutes += (r.minutes_studied as number) || 0
    cur.scoreDeltaSum += (r.score_delta as number) || 0
    dayMap.set(key, cur)
  }
  const sortedDays = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const last30 = sortedDays.slice(-30)
  const progressOverTime = last30.map(([date, v]) => ({
    date,
    label: date.slice(5),
    minutes: v.minutes,
    scoreDeltaSum: v.scoreDeltaSum,
  }))

  return {
    weakTopics,
    strongTopics,
    totalStudyMinutes,
    averageQuizScore,
    averageProgressDelta,
    mistakeCount: mistakeCount ?? 0,
    memoryExtractionCount: memoryExtractionCount ?? 0,
    quizHistoryCount: quizHistoryCount ?? 0,
    progressOverTime,
    topicPerformance: topicPerformance.slice(0, 15),
  }
}
