export type MemoryRecord = {
  id: string
  userId: string
  content: string
  summary: string | null
  embeddingHint: string | null
  importance: number
  sessionId: string | null
  createdAt: number
}

export type HindsightContext = {
  memories: MemoryRecord[]
  recentMessages: { role: string; content: string }[]
}
