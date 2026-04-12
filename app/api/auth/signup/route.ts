import { z } from 'zod'
import { jsonError, jsonOk } from '@/utils/api-response'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const json = await req.json()
    const parsed = bodySchema.parse(json)

    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        data: { full_name: parsed.name },
      },
    })

    if (error) {
      return jsonError(error.message, 400)
    }

    if (!data.user) {
      return jsonError('Could not create account', 400)
    }

    const { error: profileError } = await supabase.from('users').upsert(
      {
        id: data.user.id,
        email: parsed.email,
        full_name: parsed.name,
      },
      { onConflict: 'id' },
    )
    if (profileError) {
      console.warn('[auth/signup] Supabase public.users upsert:', profileError.message)
    }

    return jsonOk({
      needsEmailConfirmation: !data.session,
      userId: data.user.id,
    })
  } catch (e) {
    return jsonError(e)
  }
}
