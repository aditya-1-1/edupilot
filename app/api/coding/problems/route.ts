import { CODING_PROBLEMS } from '@/lib/coding-problems'
import { jsonError, jsonOk } from '@/utils/api-response'
import { optionalSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await optionalSessionUserId() // Optional auth
    return jsonOk({ problems: CODING_PROBLEMS })
  } catch (e) {
    return jsonError(e)
  }
}
