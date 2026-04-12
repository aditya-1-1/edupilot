import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemoryRecord } from '@/memory/types'

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'this', 'that', 'i', 'you', 'we', 'they', 'my', 'your', 'how', 'what', 'when', 'why', 'can', 'could', 'should', 'would',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

function scoreQueryAgainstMemory(query: string, row: MemoryRecord): number {
  const qTokens = new Set(tokenize(query))
  if (qTokens.size === 0) return row.importance
  const hay = [row.content, row.summary ?? '', row.embeddingHint ?? ''].join(' ')
  const hTokens = tokenize(hay)
  let overlap = 0
  for (const t of hTokens) {
    if (qTokens.has(t)) overlap += 1
  }
  const norm = overlap / Math.sqrt(qTokens.size + 1)
  return norm * 2 + row.importance * 0.5
}

export async function retrieveHindsightMemories(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = 8,
): Promise<MemoryRecord[]> {
  const { data: rows, error } = await supabase
    .from('memories')
    .select('id, user_id, content, summary, embedding_hint, importance, session_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(120)

  if (error) throw new Error(error.message)

  const mapped: MemoryRecord[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    content: r.content as string,
    summary: r.summary as string | null,
    embeddingHint: r.embedding_hint as string | null,
    importance: Number(r.importance),
    sessionId: r.session_id as string | null,
    createdAt: Number(r.created_at),
  }))

  const scored = mapped
    .map((m) => ({ m, s: scoreQueryAgainstMemory(query, m) }))
    .sort((a, b) => b.s - a.s)

  const seen = new Set<string>()
  const out: MemoryRecord[] = []
  for (const { m } of scored) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
    if (out.length >= limit) break
  }
  return out
}

export async function insertMemory(
  supabase: SupabaseClient,
  input: {
    id: string
    userId: string
    content: string
    summary?: string | null
    embeddingHint?: string | null
    importance?: number
    sessionId?: string | null
  },
) {
  const now = Date.now()
  const { error } = await supabase.from('memories').insert({
    id: input.id,
    user_id: input.userId,
    content: input.content,
    summary: input.summary ?? null,
    embedding_hint: input.embeddingHint ?? null,
    importance: input.importance ?? 0.5,
    session_id: input.sessionId ?? null,
    created_at: now,
  })
  if (error) throw new Error(error.message)
}

export async function listMemories(supabase: SupabaseClient, userId: string, limit = 50): Promise<MemoryRecord[]> {
  const { data: rows, error } = await supabase
    .from('memories')
    .select('id, user_id, content, summary, embedding_hint, importance, session_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (rows ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    content: r.content as string,
    summary: r.summary as string | null,
    embeddingHint: r.embedding_hint as string | null,
    importance: Number(r.importance),
    sessionId: r.session_id as string | null,
    createdAt: Number(r.created_at),
  }))
}
