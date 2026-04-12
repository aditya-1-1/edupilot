import type { SupabaseClient } from '@supabase/supabase-js'
import { newId } from '@/utils/id'

export type CodingSubmission = {
  id: string
  userId: string
  problemId: string
  code: string
  feedback: string | null
  score: number | null
  createdAt: number
}

export async function recordSubmission(
  supabase: SupabaseClient,
  input: {
    userId: string
    problemId: string
    code: string
    feedback?: string | null
    score?: number | null
  },
): Promise<CodingSubmission> {
  const id = newId()
  const now = Date.now()

  const { error } = await supabase.from('coding_submissions').insert({
    id,
    user_id: input.userId,
    problem_id: input.problemId,
    code: input.code,
    feedback: input.feedback ?? null,
    score: input.score ?? null,
    created_at: now,
  })

  if (error) throw new Error(error.message)

  return {
    id,
    userId: input.userId,
    problemId: input.problemId,
    code: input.code,
    feedback: input.feedback ?? null,
    score: input.score ?? null,
    createdAt: now,
  }
}
