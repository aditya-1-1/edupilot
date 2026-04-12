import type { SupabaseClient } from '@supabase/supabase-js'
import { newId } from '@/utils/id'

export type ProblemProgressRow = {
  id: string
  problemId: string
  difficulty: string
  status: 'solved' | 'attempted'
  attempts: number
  solvedAt: number | null
  lastCode: string | null
  updatedAt: number
  createdAt: number
}

export async function upsertProblemProgress(
  supabase: SupabaseClient,
  input: {
    userId: string
    problemId: string
    difficulty: string
    status: 'solved' | 'attempted'
    attemptsDelta: number
    lastCode: string | null
  },
) {
  const now = Date.now()
  const { data: row, error: fetchErr } = await supabase
    .from('problem_progress')
    .select('id, attempts, status, solved_at, created_at')
    .eq('user_id', input.userId)
    .eq('problem_id', input.problemId)
    .maybeSingle()

  if (fetchErr) throw new Error(fetchErr.message)

  const attempts = ((row?.attempts as number) ?? 0) + input.attemptsDelta
  let status = input.status
  let solvedAt = (row?.solved_at as number | null) ?? null
  if (input.status === 'solved') {
    status = 'solved'
    solvedAt = solvedAt ?? now
  } else if (row?.status === 'solved') {
    status = 'solved'
  }

  if (!row) {
    const id = newId()
    const { error } = await supabase.from('problem_progress').insert({
      id,
      user_id: input.userId,
      problem_id: input.problemId,
      difficulty: input.difficulty,
      status,
      attempts,
      solved_at: solvedAt,
      last_code: input.lastCode,
      updated_at: now,
      created_at: now,
    })
    if (error) throw new Error(error.message)
    return { id, attempts, status, solvedAt }
  }

  const { error } = await supabase
    .from('problem_progress')
    .update({
      difficulty: input.difficulty,
      status,
      attempts,
      solved_at: solvedAt,
      last_code: input.lastCode,
      updated_at: now,
    })
    .eq('id', row.id as string)

  if (error) throw new Error(error.message)
  return { id: row.id as string, attempts, status, solvedAt }
}

export async function listProblemProgress(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProblemProgressRow[]> {
  const { data: rows, error } = await supabase
    .from('problem_progress')
    .select('id, problem_id, difficulty, status, attempts, solved_at, last_code, updated_at, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (rows ?? []).map((r) => ({
    id: r.id as string,
    problemId: r.problem_id as string,
    difficulty: r.difficulty as string,
    status: r.status as 'solved' | 'attempted',
    attempts: r.attempts as number,
    solvedAt: r.solved_at != null ? Number(r.solved_at) : null,
    lastCode: r.last_code as string | null,
    updatedAt: Number(r.updated_at),
    createdAt: Number(r.created_at),
  }))
}
