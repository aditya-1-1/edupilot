import type { SupabaseClient } from '@supabase/supabase-js'
import type { CodingProblem } from '@/lib/coding-problems'
import { CODING_PRACTICE_SESSION } from '@/lib/coding-problems'
import type { TurnMemoryPayload } from '@/memory/extraction-types'
import { insertMemoryExtraction } from '@/memory/extraction'
import { insertMemory } from '@/memory/hindsight'
import { completeJson } from '@/services/llm'
import {
  aggregateMistakePatterns,
  listMistakes,
  mistakesByTopic,
  recordMistake,
} from '@/services/mistakes'
import { upsertProblemProgress } from '@/services/problem-progress'
import { recordProgress } from '@/services/progress'
import { newId } from '@/utils/id'

export type CodingAnalysis = {
  isCorrect: boolean
  score: number
  feedback: string
  hint: string
  mistakePatterns: { type: string; topic: string; detail: string }[]
  weakTopics: string[]
}

function normalizeAnalysis(raw: Record<string, unknown>): CodingAnalysis {
  const patterns = Array.isArray(raw.mistakePatterns)
    ? (raw.mistakePatterns as Record<string, unknown>[])
        .map((p) => ({
          type: String(p.type ?? 'Issue'),
          topic: String(p.topic ?? 'General'),
          detail: String(p.detail ?? ''),
        }))
        .filter((p) => p.type)
    : []
  return {
    isCorrect: Boolean(raw.isCorrect),
    score: Math.min(100, Math.max(0, Number(raw.score) || 0)),
    feedback: String(raw.feedback ?? ''),
    hint: String(raw.hint ?? ''),
    mistakePatterns: patterns,
    weakTopics: Array.isArray(raw.weakTopics) ? (raw.weakTopics as unknown[]).map(String).filter(Boolean) : [],
  }
}

async function buildPastMistakesContext(supabase: SupabaseClient, userId: string): Promise<string> {
  if (userId === 'guest') return ''
  const recent = await listMistakes(supabase, userId, 15)
  if (recent.length === 0) return ''
  return recent
    .map((m) => `- [${m.topic}] ${m.mistakeType}${m.context ? `: ${m.context.slice(0, 120)}` : ''}`)
    .join('\n')
}

export async function analyzeCodingSubmission(params: {
  supabase: SupabaseClient
  userId: string
  problem: CodingProblem
  code: string
  language: string
}): Promise<CodingAnalysis> {
  const past = await buildPastMistakesContext(params.supabase, params.userId)
  const raw = await completeJson<Record<string, unknown>>({
    system: `You evaluate a coding solution for an interview-style problem.
Return JSON only with keys: isCorrect (boolean), score (0-100), feedback (string), hint (string — short; reference learner past mistakes when relevant),
mistakePatterns (array of {type, topic, detail}; use empty array if solution is fully correct),
weakTopics (array of strings; use problem topic labels when the solution is wrong or partial).

Rules:
- isCorrect true only if the algorithm and return value match the problem (watch off-by-one, wrong indices, stack misuse).
- If partially right, isCorrect false and score < 70.
- mistakePatterns[].type should be a short human label like "Off-by-one in loops" or "Forgot base case in recursion".`,
    user: `Problem: ${params.problem.title} (${params.problem.difficulty})
Topics: ${params.problem.topics.join(', ')}

Description:
${params.problem.description}

Examples:
${params.problem.examples}

Student code (${params.language}):
\`\`\`
${params.code}
\`\`\`

Past mistakes / patterns for this learner:
${past || '(none yet)'}`,
  })
  return normalizeAnalysis(raw)
}

export async function persistCodingAnalysis(
  supabase: SupabaseClient,
  input: {
    userId: string
    problem: CodingProblem
    code: string
    analysis: CodingAnalysis
    language: string
  },
) {
  const { userId, problem, code, analysis, language } = input
  const primaryTopic = problem.topics[0] ?? 'Coding'

  const extractionPayload: TurnMemoryPayload = {
    weakTopics: [...new Set([...analysis.weakTopics, ...(analysis.isCorrect ? [] : problem.topics)])].slice(0, 12),
    mistakes: analysis.mistakePatterns.map((m) => `${m.type} (${m.topic})`),
    goals: analysis.isCorrect ? [`Solidify ${problem.title}`] : [`Fix approach for ${problem.title}`],
    progress: [
      {
        topic: primaryTopic,
        note: `${problem.title}: ${analysis.isCorrect ? 'solved' : 'attempt'} (score ${analysis.score})`,
        scoreDelta: analysis.isCorrect ? 10 : 2,
        minutesStudied: analysis.isCorrect ? 10 : 6,
      },
    ],
  }

  await insertMemoryExtraction(supabase, {
    userId,
    sessionId: CODING_PRACTICE_SESSION,
    payload: extractionPayload,
  })

  const summary = analysis.isCorrect
    ? `Solved ${problem.title} (${problem.difficulty}) — score ${analysis.score}`
    : `Practice ${problem.title}: ${analysis.mistakePatterns.map((m) => m.type).join(', ') || 'needs work'}`

  await insertMemory(supabase, {
    id: newId(),
    userId,
    content: `Problem: ${problem.title}\nCode:\n${code.slice(0, 4000)}\n\nFeedback:\n${analysis.feedback}`,
    summary,
    embeddingHint: `${problem.topics.join(' ')} ${analysis.weakTopics.join(' ')} ${problem.id}`,
    importance: analysis.isCorrect ? 0.62 : 0.72,
    sessionId: CODING_PRACTICE_SESSION,
  })

  if (!analysis.isCorrect) {
    if (analysis.mistakePatterns.length > 0) {
      for (const m of analysis.mistakePatterns) {
        await recordMistake(supabase, {
          userId,
          language,
          mistakeType: m.type,
          snippet: code.slice(0, 4000),
          context: m.detail || analysis.feedback,
          topic: m.topic || primaryTopic,
          problemId: problem.id,
        })
      }
    } else {
      await recordMistake(supabase, {
        userId,
        language,
        mistakeType: 'Incorrect or incomplete solution',
        snippet: code.slice(0, 4000),
        context: analysis.feedback,
        topic: primaryTopic,
        problemId: problem.id,
      })
    }
  }

  await upsertProblemProgress(supabase, {
    userId,
    problemId: problem.id,
    difficulty: problem.difficulty,
    status: analysis.isCorrect ? 'solved' : 'attempted',
    attemptsDelta: 1,
    lastCode: code.slice(0, 8000),
  })

  await recordProgress(supabase, {
    userId,
    topic: primaryTopic,
    scoreDelta: analysis.isCorrect ? 10 : 2,
    minutesStudied: analysis.isCorrect ? 10 : 6,
    note: `Coding: ${problem.title} (${analysis.isCorrect ? 'solved' : 'attempt'})`,
  })

  return { extractionPayload }
}

export async function getCodingPracticeState(supabase: SupabaseClient, userId: string) {
  return {
    patterns: await aggregateMistakePatterns(supabase, userId, 15),
    mistakesByTopic: await mistakesByTopic(supabase, userId),
  }
}
