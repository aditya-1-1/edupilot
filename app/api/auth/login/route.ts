import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ensureSupabaseProfile } from '@/lib/ensure-profile'
import { jsonError, jsonOk } from '@/utils/api-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = loginSchema.parse(json)

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    })

    if (error || !data.user) {
      return jsonError('Invalid email or password', 401)
    }

    if (data.session) {
      await ensureSupabaseProfile(supabase, data.session)
    }

    const meta = data.user.user_metadata as Record<string, unknown> | undefined
    const fullName =
      (typeof meta?.full_name === 'string' && meta.full_name) ||
      (typeof meta?.name === 'string' && meta.name) ||
      null

    return jsonOk({
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        fullName,
        avatarUrl: (typeof meta?.avatar_url === 'string' && meta.avatar_url) || null,
      },
      session: data.session
        ? { expiresAt: data.session.expires_at }
        : null,
    })
  } catch (e) {
    return jsonError(e)
  }
}
