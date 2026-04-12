import { getCodingPracticeState } from '@/services/coding'
import { listMistakes } from '@/services/mistakes'
import { listProblemProgress } from '@/services/problem-progress'
import { jsonError, jsonOk } from '@/utils/api-response'
import { optionalSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await optionalSessionUserId()

    if (auth.userId) {
      const userId = auth.userId
      const { supabase } = auth

      const state = await getCodingPracticeState(supabase, userId)
      const progress = await listProblemProgress(supabase, userId)
      const recentMistakes = await listMistakes(supabase, userId, 25)

      return jsonOk({
        patterns: state.patterns,
        mistakesByTopic: state.mistakesByTopic,
        progress: progress.map((p) => ({
          problemId: p.problemId,
          difficulty: p.difficulty,
          status: p.status,
          attempts: p.attempts,
          lastCode: p.lastCode,
        })),
        recentMistakes: recentMistakes.map((m) => ({
          id: m.id,
          language: m.language,
          mistakeType: m.mistakeType,
          snippet: m.snippet,
          context: m.context,
          resolved: m.resolved,
          topic: m.topic,
          createdAt: m.createdAt,
        })),
      })
    } else {
      // For guest, return empty state
      return jsonOk({
        patterns: [],
        mistakesByTopic: {},
        progress: [],
        recentMistakes: [],
      })
    }
  } catch (e) {
    return jsonError(e)
  }
}
