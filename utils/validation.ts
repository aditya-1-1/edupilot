import { ApiError } from '@/utils/errors'

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new ApiError(`Missing ${name}`, 503, 'CONFIG')
  return value
}
