import type { SupabaseClient } from '@supabase/supabase-js'
import { completeJson } from '@/services/llm'
import type { MemoryExtractionRecord, TurnMemoryPayload } from '@/memory/extraction-types'
import { newId } from '@/utils/id'
import type { MemoryRecord } from '@/memory/types'

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'this', 'that', 'i', 'you', 'we', 'they', 'my', 'your', 'how', 'what', 'when', 'why',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

function scoreQueryAgainstPayload(query: string, payload: TurnMemoryPayload): number {
  const qTokens = new Set(tokenize(query))
  if (qTokens.size === 0) return 0
  const hay = [
    ...payload.weakTopics,
    ...payload.mistakes,
    ...payload.goals,
    ...payload.progress.map((p) => [p.topic, p.note].filter(Boolean).join(' ')),
  ].join(' ')
  const hTokens = tokenize(hay)
  let overlap = 0
  for (const t of hTokens) {
    if (qTokens.has(t)) overlap += 1
  }
  return overlap / Math.sqrt(qTokens.size + 1)
}

export async function retrieveRelevantExtractions(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = 6,
): Promise<MemoryExtractionRecord[]> {
  const { data: rows, error } = await supabase
    .from('memory_extractions')
    .select('id, user_id, session_id, payload, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)

  const mapped: MemoryExtractionRecord[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    sessionId: r.session_id as string,
    payload: JSON.parse(r.payload as string) as TurnMemoryPayload,
    createdAt: Number(r.created_at),
  }))

  const scored = mapped
    .map((m) => ({ m, s: scoreQueryAgainstPayload(query, m.payload) }))
    .sort((a, b) => b.s - a.s)

  const out: MemoryExtractionRecord[] = []
  const seen = new Set<string>()
  for (const { m } of scored) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
    if (out.length >= limit) break
  }
  return out
}

export async function insertMemoryExtraction(
  supabase: SupabaseClient,
  input: { userId: string; sessionId: string; payload: TurnMemoryPayload },
) {
  const id = newId()
  const now = Date.now()
  const { error } = await supabase.from('memory_extractions').insert({
    id,
    user_id: input.userId,
    session_id: input.sessionId,
    payload: JSON.stringify(input.payload),
    created_at: now,
  })
  if (error) throw new Error(error.message)
  return { id, createdAt: now }
}

const EXTRACTION_SCHEMA = `{
  "weakTopics": string[],
  "mistakes": string[],
  "goals": string[],
  "progress": { "topic"?: string, "note"?: string, "scoreDelta"?: number, "minutesStudied"?: number }[]
}`

export async function extractTurnMemory(input: {
  userMessage: string
  assistantReply: string
}): Promise<TurnMemoryPayload> {
  const data = await completeJson<TurnMemoryPayload>({
    system: `You extract learning signals from one chat turn (mentor conversation). Output JSON only matching this shape:
${EXTRACTION_SCHEMA}

Rules:
- weakTopics: subjects the learner seems weak or stuck on (short phrases, max 8 items).
- mistakes: misconceptions, errors, or bad habits mentioned or implied (max 8 items).
- goals: learning goals stated or implied (max 8 items).
- progress: optional concrete progress signals; use scoreDelta roughly -20..20 and minutesStudied 0..180 only when clearly implied; otherwise omit or use note only.
- Use empty arrays when nothing applies.`,
    user: `USER:\n${input.userMessage}\n\nASSISTANT:\n${input.assistantReply}`,
  })
  return {
    weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics.filter(Boolean).slice(0, 12) : [],
    mistakes: Array.isArray(data.mistakes) ? data.mistakes.filter(Boolean).slice(0, 12) : [],
    goals: Array.isArray(data.goals) ? data.goals.filter(Boolean).slice(0, 12) : [],
    progress: Array.isArray(data.progress)
      ? data.progress.slice(0, 12).map((p) => ({
          topic: typeof p.topic === 'string' ? p.topic : undefined,
          note: typeof p.note === 'string' ? p.note : undefined,
          scoreDelta:
            typeof p.scoreDelta === 'number' && Number.isFinite(p.scoreDelta)
              ? Math.round(Math.min(100, Math.max(-100, p.scoreDelta)))
              : undefined,
          minutesStudied:
            typeof p.minutesStudied === 'number' && Number.isFinite(p.minutesStudied)
              ? Math.round(Math.min(24 * 60, Math.max(0, p.minutesStudied)))
              : undefined,
        }))
      : [],
  }
}

export function formatStructuredMemoryForPrompt(
  extractions: MemoryExtractionRecord[],
  episodic: MemoryRecord[],
): string {
  const extLines: string[] = []
  for (const e of extractions) {
    const p = e.payload
    const parts: string[] = []
    if (p.weakTopics.length) parts.push(`weak: ${p.weakTopics.join('; ')}`)
    if (p.mistakes.length) parts.push(`mistakes: ${p.mistakes.join('; ')}`)
    if (p.goals.length) parts.push(`goals: ${p.goals.join('; ')}`)
    if (p.progress.length) {
      parts.push(
        `progress: ${p.progress
          .map((x) =>
            [x.topic, x.note, x.scoreDelta != null ? `Δ${x.scoreDelta}` : '', x.minutesStudied != null ? `${x.minutesStudied}m` : '']
              .filter(Boolean)
              .join(' · '),
          )
          .join(' | ')}`,
      )
    }
    if (parts.length) extLines.push(`- ${parts.join(' · ')}`)
  }

  const epiLines = episodic.map((m, i) => {
    const head = m.summary?.trim() || m.content.slice(0, 220)
    return `${i + 1}. ${head}`
  })

  const blocks: string[] = []
  if (extLines.length) {
    blocks.push(`Structured signals (from past turns):\n${extLines.join('\n')}`)
  }
  if (epiLines.length) {
    blocks.push(`Episodic notes:\n${epiLines.join('\n')}`)
  }
  return blocks.length ? blocks.join('\n\n') : '(no prior memory)'
}
