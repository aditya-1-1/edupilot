import { ApiError } from '@/utils/errors'
import { jsonError, jsonOk } from '@/utils/api-response'
import { requireSessionUserId } from '@/lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    const json = await req.json()
    const resolved = Boolean(json?.resolved)
    const auth = await requireSessionUserId()
    if ('error' in auth) return auth.error

    const userId = auth.userId
    const { supabase } = auth

    const { data: row, error: fetchErr } = await supabase
      .from('coding_mistakes')
      .select('user_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) throw new Error(fetchErr.message)
    if (!row) throw new ApiError('Not found', 404)
    if ((row.user_id as string) !== userId) throw new ApiError('Forbidden', 403)

    const { error } = await supabase.from('coding_mistakes').update({ resolved }).eq('id', id).eq('user_id', userId)

    if (error) throw new Error(error.message)

    return jsonOk({ id, resolved })
  } catch (e) {
    return jsonError(e)
  }
}
