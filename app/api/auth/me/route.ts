import { getUserProfile, getUserSettings, type User } from '@/services/auth'
import { jsonError, jsonOk } from '@/utils/api-response'
import { requireSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const { supabase, userId } = auth
    const user = await getUserProfile(supabase, userId)
    if (!user) {
      return jsonError('User not found', 404)
    }

    const settings = await getUserSettings(supabase, userId)

    const userData: User = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    return jsonOk(
      {
        user: userData,
        settings,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, must-revalidate',
        },
      },
    )
  } catch (e) {
    return jsonError(e)
  }
}
