const USER_STORAGE_KEY = 'mentormind_user_id'
const CHAT_SESSION_KEY = 'mentormind_chat_session_id'
const AUTH_TOKEN_KEY = 'auth_token'

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'default'
  try {
    let id = localStorage.getItem(USER_STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(USER_STORAGE_KEY, id)
    }
    return id
  } catch {
    return 'default'
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  } catch {
    // ignore
  }
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // ignore
  }
}

export function getOrCreateChatSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(CHAT_SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(CHAT_SESSION_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

export function resetChatSession() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CHAT_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

type ApiSuccess<T> = { ok: true; data: T }
type ApiFail = { ok: false; error: string; issues?: unknown }

export class ApiRequestError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const authToken = typeof window !== 'undefined' ? getAuthToken() : null
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }
  const res = await fetch(path, {
    credentials: 'include',
    ...(init ?? {}),
    headers,
    cache: 'no-store',
  })
  const body = (await res.json()) as ApiSuccess<T> | ApiFail
  if (!body.ok) {
    throw new ApiRequestError(body.error || 'Request failed', res.status)
  }
  return body.data
}
