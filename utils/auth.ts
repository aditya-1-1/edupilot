import { getDb } from '@/database/client'
import { getSessionByToken } from '@/services/auth'

export function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Also check for token in cookies or other headers
  return req.headers.get('x-auth-token') || null
}

export function getAuthUserId(req: Request): string | null {
  const token = getAuthToken(req)
  if (!token) return null

  const db = getDb()
  const session = getSessionByToken(db, token)
  return session?.userId || null
}