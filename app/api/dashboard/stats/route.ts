import { getDashboardStats } from '@/services/dashboard'
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
      const stats = await getDashboardStats(supabase, userId)
      return jsonOk({ stats })
    } else {
      // For guests, return empty stats
      return jsonOk({
        stats: {
          totalStudyTime: 0,
          completedTopics: 0,
          currentStreak: 0,
          averageScore: 0,
          recentActivity: [],
          progressByTopic: {},
        }
      })
    }
  } catch (e) {
    return jsonError(e)
  }
}
