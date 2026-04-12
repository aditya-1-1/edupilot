/**
 * Browser-only Supabase client. Server / API code must import from `@/lib/supabase-server`
 * so `next/headers` is not bundled into client components.
 */
import { createBrowserClient } from '@supabase/ssr'

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return { url, anonKey }
}

/**
 * Browser client — use only in Client Components. Persists session via cookies (@supabase/ssr).
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
}

let browserSingleton: ReturnType<typeof createBrowserClient> | null = null

/**
 * Default export for client components (`login`, `signup`, `header`).
 * Lazily created on the client so this module stays safe to import from Client Components.
 */
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    if (typeof window === 'undefined') {
      throw new Error(
        'The `supabase` singleton is browser-only. Use createSupabaseServerClient from @/lib/supabase-server in Route Handlers.',
      )
    }
    if (!browserSingleton) {
      browserSingleton = createSupabaseBrowserClient()
    }
    return Reflect.get(browserSingleton as object, prop, browserSingleton)
  },
})
