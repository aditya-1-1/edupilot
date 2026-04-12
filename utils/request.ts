export function getUserIdFromRequest(req: Request): string {
  return req.headers.get('x-user-id')?.trim() || 'default'
}
