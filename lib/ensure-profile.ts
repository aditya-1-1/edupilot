import type { Session, SupabaseClient } from '@supabase/supabase-js'

/**
 * Ensures `public.users` has a row for the Supabase Auth user (upsert).
 */
export async function ensureSupabaseProfile(supabase: SupabaseClient, session: Session): Promise<void> {
  const u = session.user
  const meta = u.user_metadata as Record<string, unknown> | undefined
  const fullName =
    (typeof meta?.full_name === 'string' && meta.full_name) ||
    (typeof meta?.name === 'string' && meta.name) ||
    null

  const { error } = await supabase.from('users').upsert(
    {
      id: u.id,
      email: u.email ?? '',
      full_name: fullName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.warn('[ensureSupabaseProfile]', error.message)
  }
}
