import { z } from 'zod'
import { getProblemById } from '@/lib/coding-problems'
import { analyzeCodingSubmission, persistCodingAnalysis } from '@/services/coding'
import { recordSubmission } from '@/services/coding-problems'
import { ApiError } from '@/utils/errors'
import { jsonError, jsonOk } from '@/utils/api-response'
import { optionalSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  problemId: z.string().min(1),
  code: z.string().max(64000),
  language: z.enum(['python', 'cpp']).optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await optionalSessionUserId()

    const json = await req.json()
    const parsed = bodySchema.parse(json)
    const problem = getProblemById(parsed.problemId)
    if (!problem) throw new ApiError('Unknown problem', 404)
    const userId = auth.userId
    const { supabase } = auth
    const language = parsed.language ?? 'python'
    const analysis = await analyzeCodingSubmission({
      supabase,
      userId: userId || 'guest',
      problem,
      code: parsed.code,
      language,
    })

    if (userId) {
      // Only persist and record for authenticated users
      await persistCodingAnalysis(supabase, {
        userId,
        problem,
        code: parsed.code,
        analysis,
        language,
      })

      const submission = await recordSubmission(supabase, {
        userId,
        problemId: parsed.problemId,
        code: parsed.code,
        feedback: analysis.feedback,
        score: analysis.score,
      })

      return jsonOk({
        submission: {
          id: submission.id,
          problemId: submission.problemId,
          createdAt: submission.createdAt,
        },
        analysis: {
          isCorrect: analysis.isCorrect,
          score: analysis.score,
          feedback: analysis.feedback,
          hint: analysis.hint,
          mistakePatterns: analysis.mistakePatterns,
          weakTopics: analysis.weakTopics,
        },
        problemId: problem.id,
      })
    } else {
      // For guest, return analysis without saving
      return jsonOk({
        analysis: {
          isCorrect: analysis.isCorrect,
          score: analysis.score,
          feedback: analysis.feedback,
          hint: analysis.hint,
          mistakePatterns: analysis.mistakePatterns,
          weakTopics: analysis.weakTopics,
        },
        problemId: problem.id,
      })
    }
  } catch (e) {
    return jsonError(e)
  }
}
