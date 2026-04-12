'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Loader2, RefreshCw, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiRequestError, apiJson } from '@/lib/api'

type Weekly = { week: number; focus: string; tasks: string[] }

type Plan = {
  title: string
  durationWeeks: number
  goals: string[]
  weeklyOutline: Weekly[]
  resources: string[]
}

type WeeklyPlanFormat = {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

const WEEK_ORDER: { key: keyof WeeklyPlanFormat; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

const difficultyColors = {
  Easy: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-800',
  Medium:
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800',
  Hard: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800',
}

function guessDifficulty(text: string): keyof typeof difficultyColors {
  const t = text.toLowerCase()
  if (t.includes('hard') || t.includes('advanced')) return 'Hard'
  if (t.includes('medium')) return 'Medium'
  return 'Easy'
}

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanFormat | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingWeekly, setLoadingWeekly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})

  const generateTopicPlan = async () => {
    const topic = window.prompt('What topic should this study plan cover?')
    if (!topic?.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiJson<{ plan: Plan; saved: { id: string } | null }>('/api/study-plan', {
        method: 'POST',
        body: JSON.stringify({ topic: topic.trim(), persist: true }),
      })
      setPlan(data.plan)
      setDone({})
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Failed to generate plan')
    } finally {
      setLoading(false)
    }
  }

  const generateWeeklyFromProfile = async () => {
    setLoadingWeekly(true)
    setError(null)
    try {
      const data = await apiJson<{ plan: WeeklyPlanFormat }>('/api/study-plan/weekly', {
        method: 'POST',
        body: JSON.stringify({ persist: true }),
      })
      setWeeklyPlan(data.plan)
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Failed to build weekly plan')
    } finally {
      setLoadingWeekly(false)
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Study Plan</h1>
          <p className="text-muted-foreground mt-1">Topic plans and a weekly schedule from your profile</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">{error}</p>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Weekly schedule
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Uses weak topics, mistakes, goals, quiz scores, and progress history from your data.
            </p>
          </div>
          <Button
            variant="default"
            className="gap-2 bg-primary"
            onClick={() => void generateWeeklyFromProfile()}
            disabled={loadingWeekly}
          >
            {loadingWeekly ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate weekly plan
          </Button>
        </div>

        {weeklyPlan && (
          <div className="bg-card rounded-lg border border-border p-6 shadow-soft max-w-xl">
            <p className="text-sm font-medium text-muted-foreground mb-4">This week</p>
            <ul className="space-y-3 font-mono text-sm text-foreground">
              {WEEK_ORDER.map(({ key, label }) => (
                <li key={key} className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                  <span>–</span>
                  <span>{weeklyPlan[key]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!weeklyPlan && !loadingWeekly && (
          <p className="text-muted-foreground text-sm">Generate a week that balances weaknesses and revision.</p>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Multi-week topic plan</h2>
            <p className="text-sm text-muted-foreground mt-1">Structured goals and tasks for a focus topic</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void generateTopicPlan()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {plan ? 'Regenerate' : 'Generate topic plan'}
          </Button>
        </div>

        {!plan && !loading && (
          <p className="text-muted-foreground text-sm">Optional: build a deeper plan around one subject.</p>
        )}

        {plan && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-foreground">{plan.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.durationWeeks} week(s) · {plan.goals.length} goals
              </p>
              <ul className="mt-4 list-disc list-inside text-sm text-foreground space-y-1">
                {plan.goals.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.weeklyOutline.map((w) => (
                <div key={w.week} className="bg-card rounded-lg border border-border p-4 shadow-soft">
                  <h3 className="font-semibold text-foreground mb-1">Week {w.week}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{w.focus}</p>
                  <div className="space-y-2">
                    {w.tasks.map((task, ti) => {
                      const key = `${w.week}-${ti}`
                      const checked = done[key]
                      const diff = guessDifficulty(task)
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setDone((d) => ({ ...d, [key]: !d[key] }))}
                          className="flex items-start gap-3 w-full text-left p-2 rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          {checked ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                checked ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              {task}
                            </p>
                            <span
                              className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-1 ${difficultyColors[diff]}`}
                            >
                              {diff}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {plan.resources.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Resources</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {plan.resources.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
