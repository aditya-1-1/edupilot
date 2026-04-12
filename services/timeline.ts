import type { SupabaseClient } from '@supabase/supabase-js'
import type { TurnMemoryPayload } from '@/memory/extraction-types'

export type TimelineKind = 'weak_topic' | 'mistake' | 'goal' | 'progress' | 'episodic_note'

export type TimelineItem = {
  id: string
  kind: TimelineKind
  title: string
  description: string
  timestamp: number
}

function parsePayload(raw: string): TurnMemoryPayload {
  try {
    return JSON.parse(raw) as TurnMemoryPayload
  } catch {
    return { weakTopics: [], mistakes: [], goals: [], progress: [] }
  }
}

export async function buildMemoryTimeline(supabase: SupabaseClient, userId: string): Promise<TimelineItem[]> {
  const items: TimelineItem[] = []

  const { data: memRows, error: e1 } = await supabase
    .from('memories')
    .select('id, content, summary, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(300)

  if (e1) throw new Error(e1.message)

  for (const m of memRows ?? []) {
    items.push({
      id: `epi-${m.id}`,
      kind: 'episodic_note',
      title: (m.summary as string)?.trim() || 'Memory note',
      description: m.content as string,
      timestamp: Number(m.created_at),
    })
  }

  const { data: extRows, error: e2 } = await supabase
    .from('memory_extractions')
    .select('id, payload, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(300)

  if (e2) throw new Error(e2.message)

  for (const row of extRows ?? []) {
    const p = parsePayload(row.payload as string)
    const ts = Number(row.created_at)

    for (let i = 0; i < p.weakTopics.length; i++) {
      const t = p.weakTopics[i].trim()
      if (!t) continue
      items.push({
        id: `ext-${row.id}-w-${i}`,
        kind: 'weak_topic',
        title: t,
        description: 'Identified as a weak area from your chat.',
        timestamp: ts,
      })
    }
    for (let i = 0; i < p.mistakes.length; i++) {
      const t = p.mistakes[i].trim()
      if (!t) continue
      items.push({
        id: `ext-${row.id}-m-${i}`,
        kind: 'mistake',
        title: 'Mistake pattern',
        description: t,
        timestamp: ts,
      })
    }
    for (let i = 0; i < p.goals.length; i++) {
      const t = p.goals[i].trim()
      if (!t) continue
      items.push({
        id: `ext-${row.id}-g-${i}`,
        kind: 'goal',
        title: 'Goal',
        description: t,
        timestamp: ts,
      })
    }
    for (let i = 0; i < p.progress.length; i++) {
      const pr = p.progress[i]
      const parts = [
        pr.topic && `Topic: ${pr.topic}`,
        pr.note,
        pr.scoreDelta != null && `Score Δ: ${pr.scoreDelta}`,
        pr.minutesStudied != null && `${pr.minutesStudied} min`,
      ].filter(Boolean)
      if (parts.length === 0) continue
      items.push({
        id: `ext-${row.id}-p-${i}`,
        kind: 'progress',
        title: pr.topic?.trim() || 'Progress',
        description: parts.join(' · '),
        timestamp: ts,
      })
    }
  }

  items.sort((a, b) => b.timestamp - a.timestamp)
  return items
}
