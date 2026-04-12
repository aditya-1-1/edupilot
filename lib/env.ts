import { z } from 'zod'

const envSchema = z.object({
  LLM_PROVIDER: z.enum(['groq', 'openai']).default('groq'),
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.warn('[env] Invalid environment variables', parsed.error.flatten())
  }
  return parsed.success ? parsed.data : envSchema.parse({})
}

export const env = loadEnv()

export function getLlmConfig() {
  const provider = env.LLM_PROVIDER ?? 'groq'
  if (provider === 'groq') {
    const apiKey = env.GROQ_API_KEY
    const baseURL = env.OPENAI_BASE_URL ?? 'https://api.groq.com/openai/v1'
    const model = env.LLM_MODEL ?? 'llama-3.3-70b-versatile'
    return { provider, apiKey, baseURL, model }
  }
  const apiKey = env.OPENAI_API_KEY
  const baseURL = env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
  const model = env.LLM_MODEL ?? 'gpt-4o-mini'
  return { provider, apiKey, baseURL, model }
}
