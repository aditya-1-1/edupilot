import OpenAI from 'openai'
import { getLlmConfig } from '@/lib/env'
import { ApiError } from '@/utils/errors'
import { requireEnv } from '@/utils/validation'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (client) return client
  const cfg = getLlmConfig()
  const apiKey = requireEnv(cfg.apiKey, 'LLM API key (GROQ_API_KEY or OPENAI_API_KEY)')
  client = new OpenAI({ apiKey, baseURL: cfg.baseURL })
  return client
}

export async function completeChat(params: {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}) {
  const cfg = getLlmConfig()
  const c = getClient()
  try {
    const res = await c.chat.completions.create({
      model: cfg.model,
      temperature: params.temperature ?? 0.6,
      max_tokens: params.maxTokens ?? 2048,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
    })
    const text = res.choices[0]?.message?.content?.trim()
    if (!text) throw new ApiError('Empty model response', 502)
    return text
  } catch (e) {
    if (e instanceof ApiError) throw e
    const msg = e instanceof Error ? e.message : 'LLM request failed'
    throw new ApiError(msg, 502, 'LLM')
  }
}

function stripJsonFence(raw: string): string {
  const t = raw.trim()
  if (t.startsWith('```')) {
    return t
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
  }
  return t
}

export async function completeJson<T>(params: {
  system: string
  user: string
}): Promise<T> {
  const raw = await completeChat({
    system: `${params.system}\nRespond with valid JSON only, no markdown.`,
    user: params.user,
    temperature: 0.3,
    maxTokens: 4096,
  })
  try {
    return JSON.parse(stripJsonFence(raw)) as T
  } catch {
    throw new ApiError('Model did not return valid JSON', 502, 'LLM_JSON')
  }
}
