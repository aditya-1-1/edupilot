import type { SupabaseClient } from '@supabase/supabase-js'
import { newId } from '@/utils/id'

export async function recordProgress(
  supabase: SupabaseClient,
  input: {
    userId: string
    topic: string
    scoreDelta?: number
    minutesStudied?: number
    note?: string | null
  },
) {
  const id = newId()
  const now = Date.now()
  const { error } = await supabase.from('progress_events').insert({
    id,
    user_id: input.userId,
    topic: input.topic,
    score_delta: input.scoreDelta ?? 0,
    minutes_studied: input.minutesStudied ?? 0,
    note: input.note ?? null,
    created_at: now,
  })
  if (error) throw new Error(error.message)
  return { id, createdAt: now }
}

export async function listProgress(supabase: SupabaseClient, userId: string, limit = 100) {
  const { data, error } = await supabase
    .from('progress_events')
    .select('id, user_id, topic, score_delta, minutes_studied, note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    topic: r.topic as string,
    scoreDelta: r.score_delta as number,
    minutesStudied: r.minutes_studied as number,
    note: r.note as string | null,
    createdAt: Number(r.created_at),
  }))
}
