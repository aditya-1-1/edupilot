'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { ApiRequestError, apiJson } from '@/lib/api'
import type { AnalyticsPayload } from '@/lib/analytics-types'

export default function StatsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiJson<{ analytics: AnalyticsPayload }>('/api/stats')
        if (!cancelled) setAnalytics(data.analytics)
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiRequestError ? e.message : 'Failed to load stats')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading insights…
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <p className="text-destructive text-sm border border-destructive/30 rounded-lg px-4 py-3">
        {error || 'No data'}
      </p>
    )
  }

  const chartProgress =
    analytics.progressOverTime.length > 0
      ? analytics.progressOverTime
      : [{ label: '—', minutes: 0, scoreDeltaSum: 0 }]

  const chartTopics =
    analytics.topicPerformance.length > 0
      ? analytics.topicPerformance.map((t) => ({
          topic: t.topic.length > 14 ? `${t.topic.slice(0, 12)}…` : t.topic,
          avg: Math.round(t.avgScoreDelta * 10) / 10,
          minutes: t.totalMinutes,
        }))
      : [{ topic: '—', avg: 0, minutes: 0 }]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Learning insights</h1>
        <p className="text-muted-foreground mt-1">
          Aggregated from progress, memory extractions, quizzes, and mistakes
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card rounded-lg border border-border p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">Study minutes</p>
          <p className="text-2xl font-bold text-foreground">{analytics.totalStudyMinutes}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">Avg quiz score</p>
          <p className="text-2xl font-bold text-foreground">
            {analytics.averageQuizScore != null ? `${Math.round(analytics.averageQuizScore)}%` : '—'}
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">Avg progress Δ</p>
          <p className="text-2xl font-bold text-foreground">
            {analytics.averageProgressDelta != null ? analytics.averageProgressDelta.toFixed(1) : '—'}
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">Mistakes</p>
          <p className="text-2xl font-bold text-foreground">{analytics.mistakeCount}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">Extractions</p>
          <p className="text-2xl font-bold text-foreground">{analytics.memoryExtractionCount}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">Quiz history</p>
          <p className="text-2xl font-bold text-foreground">{analytics.quizHistoryCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground mb-2">Weak topics</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside min-h-[4rem]">
            {analytics.weakTopics.length ? (
              analytics.weakTopics.map((t) => <li key={t}>{t}</li>)
            ) : (
              <li className="list-none text-muted-foreground/80">None inferred yet</li>
            )}
          </ul>
        </div>
        <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground mb-2">Strong topics</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside min-h-[4rem]">
            {analytics.strongTopics.length ? (
              analytics.strongTopics.map((t) => <li key={t}>{t}</li>)
            ) : (
              <li className="list-none text-muted-foreground/80">Log more progress to rank topics</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground mb-4">Progress over time</h2>
          <p className="text-xs text-muted-foreground mb-4">Daily minutes studied (from progress events)</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="minutes"
                name="Minutes"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="scoreDeltaSum"
                name="Score Δ (day)"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground mb-4">Topics performance</h2>
          <p className="text-xs text-muted-foreground mb-4">Average score delta per session by topic</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartTopics} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis type="category" dataKey="topic" width={88} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="avg" name="Avg Δ" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
