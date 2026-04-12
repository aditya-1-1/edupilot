/** Canonical form for comparing/storing Supabase Auth user ids in SQLite (TEXT). */
export function normalizeUserId(id: string): string {
  return id.trim().toLowerCase()
}
