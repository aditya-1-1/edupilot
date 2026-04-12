import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { jsonError, jsonOk } from '@/utils/api-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1).optional(),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = registerSchema.parse(json)

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        data: { full_name: parsed.fullName },
      },
    })

    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        return jsonError('User with this email already exists', 409)
      }
      return jsonError(error.message, 400)
    }

    if (!data.user) {
      return jsonError('Could not create account', 400)
    }

    const { error: profileError } = await supabase.from('users').upsert(
      {
        id: data.user.id,
        email: parsed.email,
        full_name: parsed.fullName ?? null,
      },
      { onConflict: 'id' },
    )
    if (profileError) {
      console.warn('[auth/register] public.users upsert:', profileError.message)
    }

    return jsonOk({
      needsEmailConfirmation: !data.session,
      userId: data.user.id,
    })
  } catch (e) {
    return jsonError(e)
  }
}
