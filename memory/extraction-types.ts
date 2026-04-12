export type ProgressSignal = {
  topic?: string
  note?: string
  scoreDelta?: number
  minutesStudied?: number
}

export type TurnMemoryPayload = {
  weakTopics: string[]
  mistakes: string[]
  goals: string[]
  progress: ProgressSignal[]
}

export type MemoryExtractionRecord = {
  id: string
  userId: string
  sessionId: string
  payload: TurnMemoryPayload
  createdAt: number
}
