import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiError, isApiError } from '@/utils/errors'

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, { status: 200, ...init })
}

export function jsonError(e: unknown, status?: number) {
  if (typeof e === 'string' && typeof status === 'number') {
    return NextResponse.json({ ok: false as const, error: e }, { status })
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { ok: false as const, error: 'Invalid request', issues: e.flatten() },
      { status: 400 },
    )
  }
  if (isApiError(e)) {
    return NextResponse.json(
      { ok: false as const, error: e.message, code: e.code },
      { status: e.status },
    )
  }
  console.error('[api]', e)
  return NextResponse.json(
    { ok: false as const, error: 'Internal server error' },
    { status: 500 },
  )
}
