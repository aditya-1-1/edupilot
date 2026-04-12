import type { SupabaseClient } from '@supabase/supabase-js'
import { completeJson } from '@/services/llm'
import { newId } from '@/utils/id'

export type QuizQuestion = {
  id: string
  question: string
  choices: string[]
  correctIndex: number
  explanation: string
}

export type QuizPayload = {
  topic: string
  questions: QuizQuestion[]
}

export async function generateQuiz(input: { topic: string; numQuestions?: number; difficulty?: string }) {
  const n = Math.min(Math.max(input.numQuestions ?? 5, 1), 20)
  const diff = input.difficulty ?? 'mixed'
  return completeJson<QuizPayload>({
    system: `You write educational quizzes. Return topic and questions array. Each question: id (short slug), question, choices (4 strings), correctIndex (0-3), explanation. Difficulty: ${diff}. Exactly ${n} questions.`,
    user: `Topic: ${input.topic}`,
  })
}

export async function saveQuiz(supabase: SupabaseClient, userId: string, quiz: QuizPayload) {
  const id = newId()
  const now = Date.now()
  const { error: e1 } = await supabase.from('quizzes').insert({
    id,
    user_id: userId,
    topic: quiz.topic,
    payload: JSON.stringify(quiz),
    created_at: now,
  })
  if (e1) throw new Error(e1.message)

  const histId = newId()
  const { error: e2 } = await supabase.from('quiz_history').insert({
    id: histId,
    user_id: userId,
    topic: quiz.topic,
    quiz_id: id,
    score_percent: null,
    total_questions: quiz.questions.length,
    correct_count: null,
    created_at: now,
  })
  if (e2) throw new Error(e2.message)

  return { id, createdAt: now }
}
