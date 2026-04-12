import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeUserId } from '@/lib/normalize-user-id'
import { newId } from '@/utils/id'

export type User = {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  createdAt: number
  updatedAt: number
}

export type UserSettings = {
  difficultyLevel: 'easy' | 'medium' | 'hard'
  learningSpeed: 'slow' | 'balanced' | 'fast'
  dailyStudyGoal: number
  mainGoal: 'learn' | 'improve' | 'prepare'
  notifications: {
    emailReminders: boolean
    streakNotifications: boolean
    progressUpdates: boolean
    newTopicsAvailable: boolean
  }
}

const DEFAULT_SETTINGS: UserSettings = {
  difficultyLevel: 'medium',
  learningSpeed: 'balanced',
  dailyStudyGoal: 60,
  mainGoal: 'improve',
  notifications: {
    emailReminders: true,
    streakNotifications: true,
    progressUpdates: true,
    newTopicsAvailable: false,
  },
}

export function mergeUserSettings(base: UserSettings, overlay: Partial<UserSettings>): UserSettings {
  return {
    difficultyLevel: overlay.difficultyLevel ?? base.difficultyLevel,
    learningSpeed: overlay.learningSpeed ?? base.learningSpeed,
    dailyStudyGoal: overlay.dailyStudyGoal ?? base.dailyStudyGoal,
    mainGoal: overlay.mainGoal ?? base.mainGoal,
    notifications: {
      ...base.notifications,
      ...(overlay.notifications !== undefined ? overlay.notifications : {}),
    },
  }
}

function rowToUser(row: {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}): User {
  return {
    id: normalizeUserId(row.id),
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

export async function getUserProfile(supabase: SupabaseClient, userId: string): Promise<User | null> {
  const uid = normalizeUserId(userId)
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, created_at, updated_at')
    .eq('id', uid)
    .maybeSingle()

  if (error || !data) return null
  return rowToUser(data as Parameters<typeof rowToUser>[0])
}

export async function getUserSettings(supabase: SupabaseClient, userId: string): Promise<UserSettings> {
  const uid = normalizeUserId(userId)
  const { data } = await supabase.from('user_settings').select('settings').eq('user_id', uid).maybeSingle()

  const raw = data?.settings as Partial<UserSettings> | undefined
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS

  try {
    return mergeUserSettings(DEFAULT_SETTINGS, raw)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function updateUserSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: Partial<UserSettings>,
): Promise<void> {
  const uid = normalizeUserId(userId)
  const current = await getUserSettings(supabase, uid)
  const updated = mergeUserSettings(current, settings)
  const now = Date.now()

  const { data: existing } = await supabase.from('user_settings').select('id').eq('user_id', uid).maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('user_settings')
      .update({ settings: updated, updated_at: now })
      .eq('user_id', uid)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('user_settings').insert({
    id: newId(),
    user_id: uid,
    settings: updated,
    updated_at: now,
  })
  if (error) throw new Error(error.message)
}

export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: { fullName?: string | null; avatarUrl?: string | null },
): Promise<void> {
  const uid = normalizeUserId(userId)
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (updates.fullName !== undefined) {
    patch.full_name = updates.fullName
  }
  if (updates.avatarUrl !== undefined) {
    patch.avatar_url = updates.avatarUrl
  }

  const { error } = await supabase.from('users').update(patch).eq('id', uid)
  if (error) throw new Error(error.message)
}
