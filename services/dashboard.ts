import type { SupabaseClient } from '@supabase/supabase-js'

export async function getDashboardStats(supabase: SupabaseClient, userId: string) {
  const [{ count: memoryCount }, { count: extractionCount }, { count: chatCount }, { count: mistakesOpen }] =
    await Promise.all([
      supabase.from('memories').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('memory_extractions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('chat_history').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('coding_mistakes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('resolved', false),
    ])

  const { data: progressRows } = await supabase
    .from('progress_events')
    .select('score_delta, minutes_studied, created_at')
    .eq('user_id', userId)

  let totalScoreDelta = 0
  let totalMinutesStudied = 0
  let lastProgressAt: number | null = null
  for (const r of progressRows ?? []) {
    totalScoreDelta += (r.score_delta as number) || 0
    totalMinutesStudied += (r.minutes_studied as number) || 0
    const t = Number(r.created_at)
    if (lastProgressAt === null || t > lastProgressAt) lastProgressAt = t
  }

  return {
    userId,
    totalScoreDelta,
    totalMinutesStudied,
    openCodingMistakes: mistakesOpen ?? 0,
    memoryCount: memoryCount ?? 0,
    extractionCount: extractionCount ?? 0,
    chatMessageCount: chatCount ?? 0,
    lastProgressAt,
  }
}
