import { jsonError, jsonOk } from '@/utils/api-response'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      return jsonError(error.message, 400)
    }
    return jsonOk({ message: 'Logged out successfully' })
  } catch (e) {
    return jsonError(e)
  }
}
