/**
 * Optional Supabase client for future sync or auth-backed storage.
 * Set SUPABASE_URL and SUPABASE_ANON_KEY to enable.
 */
import { env } from '@/lib/env'

export function isSupabaseConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
}

export function getSupabaseConfig() {
  if (!isSupabaseConfigured()) return null
  return {
    url: env.SUPABASE_URL!,
    anonKey: env.SUPABASE_ANON_KEY!,
  }
}
