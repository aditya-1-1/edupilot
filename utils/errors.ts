export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status = 400, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}
