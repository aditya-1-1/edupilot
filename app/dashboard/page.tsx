'use client'

import { useEffect, useMemo, useState } from 'react'
import { Zap, TrendingUp, Clock, Brain, AlertCircle, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MetricCard from '@/components/cards/metric-card'
import ActivityGraphCard from '@/components/cards/activity-graph-card'
import StatsCard from '@/components/cards/stats-card'
import { ApiRequestError, apiJson } from '@/lib/api'
import Link from 'next/link'
import { eachDayOfInterval, endOfDay, format, startOfDay, subDays } from 'date-fns'

type StatsPayload = {
  stats: {
    userId: string
    totalScoreDelta: number
    totalMinutesStudied: number
    openCodingMistakes: number
    memoryCount: number
    extractionCount: number
    chatMessageCount: number
    lastProgressAt: number | null
  }
}

type ProgressEvent = {
  id: string
  minutesStudied: number
  createdAt: number
}

function buildActivityFromEvents(events: ProgressEvent[]) {
  const end = endOfDay(new Date())
  const start = startOfDay(subDays(end, 6))
  const range = eachDayOfInterval({ start, end })
  const points = range.map((d) => ({
    day: format(d, 'EEE').slice(0, 3),
    minutes: 0,
  }))
  for (const e of events) {
    const t = new Date(e.createdAt)
    if (t < start || t > end) continue
    const key = format(t, 'yyyy-MM-dd')
    const idx = range.findIndex((d) => format(d, 'yyyy-MM-dd') === key)
    if (idx >= 0) points[idx].minutes += e.minutesStudied || 0
  }
  return points.map((p) => ({ day: p.day, minutes: Math.round(p.minutes) }))
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsPayload['stats'] | null>(null)
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [s, p] = await Promise.all([
          apiJson<StatsPayload>('/api/dashboard/stats'),
          apiJson<{ events: ProgressEvent[] }>('/api/progress?limit=200'),
        ])
        if (!cancelled) {
          setStats(s.stats)
          setProgressEvents(p.events)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiRequestError ? e.message : 'Failed to load dashboard')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const activityData = useMemo(
    () => buildActivityFromEvents(progressEvents),
    [progressEvents],
  )

  const studyHours = stats ? (stats.totalMinutesStudied / 60).toFixed(1) : '—'
  const memoryLabel = stats ? String(stats.memoryCount) : '—'
  const extractionLabel = stats ? String(stats.extractionCount) : '—'
  const mistakesOpen = stats ? String(stats.openCodingMistakes) : '—'
  const chatCount = stats ? String(stats.chatMessageCount) : '—'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Your learning summary</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/dashboard/chat">Start a chat</Link>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3 bg-destructive/5">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Study Hours"
          value={studyHours}
          unit="hrs"
          icon={<Clock className="w-8 h-8 text-primary" />}
          description="Total (tracked)"
        />
        <MetricCard
          title="Score delta"
          value={stats?.totalScoreDelta ?? '—'}
          icon={<TrendingUp className="w-8 h-8 text-green-600" />}
          description="From progress events"
        />
        <MetricCard
          title="Memories"
          value={memoryLabel}
          icon={<Brain className="w-8 h-8 text-accent" />}
          description={`Episodic rows · ${extractionLabel} structured extractions`}
        />
        <MetricCard
          title="Chat messages"
          value={chatCount}
          icon={<Zap className="w-8 h-8 text-yellow-500" />}
          description="Recorded turns"
        />
      </div>

      <ActivityGraphCard data={activityData} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Weak Topics"
          icon={<AlertCircle className="w-5 h-5" />}
          stats={[
            { label: 'Open coding issues', value: `${mistakesOpen}`, color: '#ef4444' },
            { label: 'Last progress', value: stats?.lastProgressAt ? format(new Date(stats.lastProgressAt), 'PP') : '—', color: '#f59e0b' },
            { label: 'Memories', value: memoryLabel, color: '#f59e0b' },
          ]}
        />
        <StatsCard
          title="Strong Topics"
          icon={<TrendingUp className="w-5 h-5" />}
          stats={[
            { label: 'Score gained', value: stats ? String(stats.totalScoreDelta) : '—', color: '#10b981' },
            { label: 'Minutes tracked', value: stats ? String(stats.totalMinutesStudied) : '—', color: '#10b981' },
            { label: 'Chat depth', value: chatCount, color: '#10b981' },
          ]}
        />
        <StatsCard
          title="Recent Mistakes"
          icon={<AlertCircle className="w-5 h-5" />}
          stats={[
            { label: 'Unresolved', value: mistakesOpen, color: '#ef4444' },
            { label: 'See all', value: 'Open', color: '#3b82f6' },
            { label: 'Practice', value: 'Go →', color: '#8b5cf6' },
          ]}
        />
        <StatsCard
          title="Recommended Next"
          icon={<Lightbulb className="w-5 h-5" />}
          stats={[
            { label: 'AI Mentor', value: 'Chat', color: '#3b82f6' },
            { label: 'Study plan', value: 'Generate', color: '#10b981' },
            { label: 'Quiz', value: 'Try', color: '#f59e0b' },
          ]}
        />
      </div>
    </div>
  )
}
