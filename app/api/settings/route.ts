import { z } from 'zod'
import {
  getUserProfile,
  getUserSettings,
  updateUserSettings,
  updateUserProfile,
  type UserSettings,
} from '@/services/auth'
import { jsonError, jsonOk } from '@/utils/api-response'
import { requireSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const settingsSchema = z.object({
  difficultyLevel: z.enum(['easy', 'medium', 'hard']).optional(),
  learningSpeed: z.enum(['slow', 'balanced', 'fast']).optional(),
  dailyStudyGoal: z.number().min(1).max(480).optional(),
  mainGoal: z.enum(['learn', 'improve', 'prepare']).optional(),
  notifications: z
    .object({
      emailReminders: z.boolean().optional(),
      streakNotifications: z.boolean().optional(),
      progressUpdates: z.boolean().optional(),
      newTopicsAvailable: z.boolean().optional(),
    })
    .optional(),
})

const profileSchema = z.object({
  fullName: z.string().max(200).nullable().optional(),
  avatarUrl: z
    .union([z.string().url(), z.literal('')])
    .nullable()
    .optional(),
})

export async function GET(req: Request) {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const { supabase, userId } = auth
    const settings = await getUserSettings(supabase, userId)

    return jsonOk(
      { settings },
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

export async function PUT(req: Request) {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const { supabase, userId } = auth
    const json = await req.json()
    const parsed = settingsSchema.parse(json)

    await updateUserSettings(supabase, userId, parsed as Partial<UserSettings>)

    const updatedSettings = await getUserSettings(supabase, userId)
    return jsonOk({ settings: updatedSettings })
  } catch (e) {
    return jsonError(e)
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const { supabase, userId } = auth
    const json = await req.json()
    const parsed = profileSchema.parse(json)

    await updateUserProfile(supabase, userId, {
      fullName:
        parsed.fullName === undefined ? undefined : parsed.fullName === null ? null : parsed.fullName || null,
      avatarUrl:
        parsed.avatarUrl === undefined
          ? undefined
          : parsed.avatarUrl === null || parsed.avatarUrl === ''
            ? null
            : parsed.avatarUrl,
    })

    const user = await getUserProfile(supabase, userId)

    return jsonOk({
      message: 'Profile updated successfully',
      user,
    })
  } catch (e) {
    return jsonError(e)
  }
}
