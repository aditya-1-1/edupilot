import { normalizeUserId } from '@/lib/normalize-user-id'
import { ensureSupabaseProfile } from '@/lib/ensure-profile'
import { jsonError } from '@/utils/api-response'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Session } from '@supabase/supabase-js'

export async function requireSessionUserId(): Promise<
  | {
      userId: string
      session: Session
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
    }
  | { error: ReturnType<typeof jsonError> }
> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return { error: jsonError('Unauthorized', 401) }
  }

  await ensureSupabaseProfile(supabase, session)

  const userId = normalizeUserId(session.user.id)

  return { userId, session, supabase }
}

export async function optionalSessionUserId(): Promise<
  | {
      userId: string
      session: Session
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
    }
  | { userId: null; session: null; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return { userId: null, session: null, supabase }
  }

  await ensureSupabaseProfile(supabase, session)

  const userId = normalizeUserId(session.user.id)

  return { userId, session, supabase }
}
