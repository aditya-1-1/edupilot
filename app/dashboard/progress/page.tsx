'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ApiRequestError, apiJson } from '@/lib/api'
import { eachDayOfInterval, endOfDay, format, startOfDay, subDays } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ProgressEvent = {
  topic: string
  scoreDelta: number
  minutesStudied: number
  createdAt: number
}

type Mistake = {
  mistakeType: string
  createdAt: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ProgressPage() {
  const [events, setEvents] = useState<ProgressEvent[]>([])
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topic, setTopic] = useState('General study')
  const [minutes, setMinutes] = useState('25')
  const [score, setScore] = useState('5')
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    const [p, m] = await Promise.all([
      apiJson<{ events: ProgressEvent[] }>('/api/progress?limit=300'),
      apiJson<{ mistakes: { mistakeType: string; createdAt: number }[] }>('/api/mistakes?limit=200'),
    ])
    setEvents(p.events)
    setMistakes(m.mistakes)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [p, m] = await Promise.all([
          apiJson<{ events: ProgressEvent[] }>('/api/progress?limit=300'),
          apiJson<{ mistakes: { mistakeType: string; createdAt: number }[] }>('/api/mistakes?limit=200'),
        ])
        if (!cancelled) {
          setEvents(p.events)
          setMistakes(m.mistakes)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiRequestError ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const hoursData = useMemo(() => {
    const end = endOfDay(new Date())
    const start = startOfDay(subDays(end, 6))
    const range = eachDayOfInterval({ start, end })
    return range.map((d) => {
      const key = format(d, 'yyyy-MM-dd')
      let minutes = 0
      for (const e of events) {
        if (format(new Date(e.createdAt), 'yyyy-MM-dd') === key) minutes += e.minutesStudied || 0
      }
      return { day: format(d, 'EEE').slice(0, 3), hours: Math.round((minutes / 60) * 10) / 10 }
    })
  }, [events])

  const topicsData = useMemo(() => {
    const map = new Map<string, { name: string; score: number; n: number }>()
    for (const e of events) {
      const cur = map.get(e.topic) ?? { name: e.topic, score: 0, n: 0 }
      cur.score += e.scoreDelta
      cur.n += 1
      map.set(e.topic, cur)
    }
    return [...map.values()]
      .map((t) => ({
        name: t.name.slice(0, 14),
        accuracy: t.n ? Math.min(100, 70 + Math.round(t.score / t.n)) : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 8)
  }, [events])

  const accuracyTrend = useMemo(() => {
    const weeks = ['W1', 'W2', 'W3', 'W4', 'W5']
    if (events.length === 0) return weeks.map((week) => ({ week, accuracy: 0 }))
    const chunk = Math.ceil(events.length / 5) || 1
    return weeks.map((week, i) => {
      const slice = events.slice(i * chunk, (i + 1) * chunk)
      const avg =
        slice.length === 0
          ? 0
          : Math.min(
              100,
              60 + Math.round(slice.reduce((s, e) => s + e.scoreDelta, 0) / slice.length),
            )
      return { week, accuracy: avg }
    })
  }, [events])

  const mistakesData = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of mistakes) {
      map.set(m.mistakeType, (map.get(m.mistakeType) ?? 0) + 1)
    }
    return [...map.entries()].map(([name, count]) => ({ name: name.slice(0, 18), count }))
  }, [mistakes])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading progress…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Your Progress</h1>
        <p className="text-muted-foreground mt-1">From recorded sessions and mistakes</p>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="bg-card rounded-lg border border-border p-4 shadow-soft flex flex-wrap gap-4 items-end">
        <div className="space-y-2 min-w-[140px]">
          <Label htmlFor="p-topic">Topic</Label>
          <Input id="p-topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div className="space-y-2 w-24">
          <Label htmlFor="p-min">Minutes</Label>
          <Input
            id="p-min"
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <div className="space-y-2 w-24">
          <Label htmlFor="p-score">Score Δ</Label>
          <Input
            id="p-score"
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={saving}
          onClick={() => {
            void (async () => {
              setSaving(true)
              setError(null)
              try {
                await apiJson('/api/progress', {
                  method: 'POST',
                  body: JSON.stringify({
                    topic: topic.trim() || 'Study',
                    minutesStudied: Math.max(1, Number(minutes) || 1),
                    scoreDelta: Number(score) || 0,
                  }),
                })
                await reload()
              } catch (e) {
                setError(e instanceof ApiRequestError ? e.message : 'Failed to log')
              } finally {
                setSaving(false)
              }
            })()
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log session'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4">Score trend (bucketed)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={accuracyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="hsl(var(--primary))"
                dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4">Topics (from events)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topicsData.length ? topicsData : [{ name: '—', accuracy: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4">Study hours (7 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hoursData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="hours" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4">Mistake types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={mistakesData.length ? mistakesData : [{ name: 'None', count: 1 }]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                dataKey="count"
              >
                {(mistakesData.length ? mistakesData : [{ name: 'None', count: 1 }]).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
