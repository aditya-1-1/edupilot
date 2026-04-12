import type { SupabaseClient } from '@supabase/supabase-js'
import {
  extractTurnMemory,
  formatStructuredMemoryForPrompt,
  insertMemoryExtraction,
  retrieveRelevantExtractions,
} from '@/memory/extraction'
import type { TurnMemoryPayload } from '@/memory/extraction-types'
import { insertMemory, retrieveHindsightMemories } from '@/memory/hindsight'
import { completeChat } from '@/services/llm'
import { recordProgress } from '@/services/progress'
import { newId } from '@/utils/id'

async function recentSessionMessages(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  limit: number,
) {
  const { data: rows, error } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (rows ?? []).reverse() as { role: string; content: string }[]
}

export async function appendChatMessage(
  supabase: SupabaseClient,
  input: {
    userId: string
    sessionId: string
    role: 'user' | 'assistant' | 'system'
    content: string
  },
) {
  const id = newId()
  const now = Date.now()
  const { error } = await supabase.from('chat_history').insert({
    id,
    user_id: input.userId,
    session_id: input.sessionId,
    role: input.role,
    content: input.content,
    created_at: now,
  })
  if (error) throw new Error(error.message)
  return { id, createdAt: now }
}

function buildEpisodicFromExtraction(payload: TurnMemoryPayload, reply: string) {
  const summaryParts = [
    payload.weakTopics.length ? `Weak: ${payload.weakTopics.slice(0, 5).join(', ')}` : '',
    payload.goals.length ? `Goals: ${payload.goals.slice(0, 5).join(', ')}` : '',
    payload.mistakes.length ? `Mistakes: ${payload.mistakes.slice(0, 5).join(', ')}` : '',
  ].filter(Boolean)
  const summary = summaryParts.length ? summaryParts.join(' · ') : reply.slice(0, 280)
  const hint = [
    ...payload.weakTopics,
    ...payload.goals,
    ...payload.mistakes,
    reply.slice(0, 80),
  ]
    .join(' ')
    .slice(0, 500)
  const importance = Math.min(0.95, 0.45 + Math.min(0.35, payload.weakTopics.length * 0.04 + payload.mistakes.length * 0.03))
  return { summary, embeddingHint: hint, importance }
}

async function applyProgressSignals(
  supabase: SupabaseClient,
  userId: string,
  payload: TurnMemoryPayload,
) {
  for (const p of payload.progress) {
    const minutes = p.minutesStudied ?? 0
    const score = p.scoreDelta ?? 0
    const topic = (p.topic && p.topic.trim()) || 'General'
    const note = p.note?.trim() || null
    if (minutes <= 0 && score === 0 && !note) continue
    await recordProgress(supabase, {
      userId,
      topic,
      scoreDelta: score,
      minutesStudied: minutes,
      note,
    })
  }
}

export async function runChatWithMemory(
  supabase: SupabaseClient,
  input: { userId: string; sessionId: string; message: string; storeMemory?: boolean },
) {
  const isGuest = input.userId === 'guest'
  let structured: any[] = []
  let episodic: any[] = []
  let memoryBlock = ''

  if (input.userId !== 'guest') {
    structured = await retrieveRelevantExtractions(supabase, input.userId, input.message, 6)
    episodic = await retrieveHindsightMemories(supabase, input.userId, input.message, 8)
    memoryBlock = formatStructuredMemoryForPrompt(structured, episodic)
  }

  const recent = isGuest ? [] : await recentSessionMessages(supabase, input.userId, input.sessionId, 12)
  const transcript = recent.map((m) => `${m.role}: ${m.content}`).join('\n')

  const system = `You are MentorMind, a concise AI learning mentor.

RETRIEVED MEMORY (past extractions + episodic notes — use to personalize tone and follow-ups; if empty or irrelevant, proceed normally):
${memoryBlock}

RECENT CONVERSATION (this session, before the current user message):
${transcript || '(start of conversation)'}`

  const reply = await completeChat({
    system,
    user: input.message,
  })

  if (!isGuest) {
    await appendChatMessage(supabase, {
      userId: input.userId,
      sessionId: input.sessionId,
      role: 'user',
      content: input.message,
    })
    await appendChatMessage(supabase, {
      userId: input.userId,
      sessionId: input.sessionId,
      role: 'assistant',
      content: reply,
    })
  }

  if (input.storeMemory === false) {
    return {
      reply,
      sessionId: input.sessionId,
      hindsightUsed: episodic.length,
      extractionsUsed: structured.length,
      extractionStored: false,
    }
  }

  try {
    const payload = await extractTurnMemory({
      userMessage: input.message,
      assistantReply: reply,
    })
    await insertMemoryExtraction(supabase, {
      userId: input.userId,
      sessionId: input.sessionId,
      payload,
    })
    await applyProgressSignals(supabase, input.userId, payload)
    const episodicFields = buildEpisodicFromExtraction(payload, reply)
    await insertMemory(supabase, {
      id: newId(),
      userId: input.userId,
      content: `User: ${input.message}\nAssistant: ${reply}`,
      summary: episodicFields.summary,
      embeddingHint: episodicFields.embeddingHint,
      importance: episodicFields.importance,
      sessionId: input.sessionId,
    })
    return {
      reply,
      sessionId: input.sessionId,
      hindsightUsed: episodic.length,
      extractionsUsed: structured.length,
      extractionStored: true,
      lastExtraction: {
        weakTopics: payload.weakTopics,
        mistakes: payload.mistakes,
        goals: payload.goals,
        progressCount: payload.progress.length,
      },
    }
  } catch (e) {
    console.warn('[chat] memory extraction failed', e)
    const hint = `${input.message.slice(0, 120)} | ${reply.slice(0, 120)}`
    if (!isGuest) {
      await insertMemory(supabase, {
        id: newId(),
        userId: input.userId,
        content: `User: ${input.message}\nAssistant: ${reply}`,
        summary: reply.slice(0, 280),
        embeddingHint: hint,
        importance: 0.55,
        sessionId: input.sessionId,
      })
    }
    return {
      reply,
      sessionId: input.sessionId,
      hindsightUsed: episodic.length,
      extractionsUsed: structured.length,
      extractionStored: false,
    }
  }
}
