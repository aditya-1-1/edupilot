import type { SupabaseClient } from '@supabase/supabase-js'
import { newId } from '@/utils/id'

export async function recordMistake(
  supabase: SupabaseClient,
  input: {
    userId: string
    language: string
    mistakeType: string
    snippet?: string | null
    context?: string | null
    resolved?: boolean
    topic?: string | null
    problemId?: string | null
  },
) {
  const id = newId()
  const now = Date.now()
  const { error } = await supabase.from('coding_mistakes').insert({
    id,
    user_id: input.userId,
    language: input.language,
    mistake_type: input.mistakeType,
    snippet: input.snippet ?? null,
    context: input.context ?? null,
    resolved: input.resolved ?? false,
    topic: input.topic?.trim() || 'General',
    problem_id: input.problemId ?? null,
    created_at: now,
  })
  if (error) throw new Error(error.message)
  return { id, createdAt: now }
}

export async function listMistakes(supabase: SupabaseClient, userId: string, limit = 100) {
  const { data, error } = await supabase
    .from('coding_mistakes')
    .select(
      'id, user_id, language, mistake_type, snippet, context, resolved, topic, problem_id, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    language: r.language as string,
    mistakeType: r.mistake_type as string,
    snippet: r.snippet as string | null,
    context: r.context as string | null,
    resolved: Boolean(r.resolved),
    topic: (r.topic as string | null) ?? 'General',
    problemId: r.problem_id as string | null,
    createdAt: Number(r.created_at),
  }))
}

export async function aggregateMistakePatterns(supabase: SupabaseClient, userId: string, limit = 12) {
  const { data, error } = await supabase
    .from('coding_mistakes')
    .select('mistake_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const t = String(row.mistake_type)
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pattern, count]) => ({ pattern, count }))
}

export async function mistakesByTopic(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('coding_mistakes')
    .select('topic')
    .eq('user_id', userId)
    .not('topic', 'is', null)
    .neq('topic', '')
    .limit(500)

  if (error) throw new Error(error.message)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const t = String(row.topic).trim()
    if (!t) continue
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([topic, cnt]) => ({ topic, cnt }))
}
