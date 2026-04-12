export type TopicPerformance = { topic: string; avgScoreDelta: number; totalMinutes: number }

export type AnalyticsPayload = {
  weakTopics: string[]
  strongTopics: string[]
  totalStudyMinutes: number
  averageQuizScore: number | null
  averageProgressDelta: number | null
  mistakeCount: number
  memoryExtractionCount: number
  quizHistoryCount: number
  progressOverTime: { date: string; label: string; minutes: number; scoreDeltaSum: number }[]
  topicPerformance: TopicPerformance[]
}
