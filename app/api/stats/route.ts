import { getAnalytics } from '@/services/analytics'
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
      const analytics = await getAnalytics(supabase, userId)
      return jsonOk({ analytics })
    } else {
      // For guests, return empty analytics
      return jsonOk({
        analytics: {
          totalSessions: 0,
          totalMessages: 0,
          totalCodingSubmissions: 0,
          averageScore: 0,
          topicsCovered: [],
          weeklyActivity: [],
          recentActivity: [],
        }
      })
    }
  } catch (e) {
    return jsonError(e)
  }
}
