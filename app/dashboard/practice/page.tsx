'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  Code2,
  Lightbulb,
  Loader2,
  BookOpen,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PracticeCodeEditor } from '@/components/practice-code-editor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiRequestError, apiJson } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getStarterCode, type CodingProblem, type PracticeLanguage } from '@/lib/coding-problems'

type Mistake = {
  id: string
  language: string
  mistakeType: string
  snippet: string | null
  context: string | null
  resolved: boolean
  topic: string
  createdAt: number
}

type Pattern = { pattern: string; count: number }

type TopicCount = { topic: string; cnt: number }

type ProblemProgress = {
  problemId: string
  difficulty: string
  status: 'solved' | 'attempted'
  attempts: number
  lastCode: string | null
}

type SubmitAnalysis = {
  isCorrect: boolean
  score: number
  feedback: string
  hint: string
  mistakePatterns: { type: string; topic: string; detail: string }[]
  weakTopics: string[]
}

function cacheKey(problemId: string, lang: PracticeLanguage) {
  return `${problemId}:${lang}`
}

const diffBadge: Record<string, string> = {
  Easy: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30',
  Hard: 'bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/30',
}

export default function PracticePage() {
  const [problems, setProblems] = useState<CodingProblem[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [mistakesByTopic, setMistakesByTopic] = useState<TopicCount[]>([])
  const [progress, setProgress] = useState<ProblemProgress[]>([])
  const [recentMistakes, setRecentMistakes] = useState<Mistake[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [practiceLang, setPracticeLang] = useState<PracticeLanguage>('python')
  const [code, setCode] = useState('')
  const codeCacheRef = useRef<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAnalysis, setLastAnalysis] = useState<SubmitAnalysis | null>(null)

  const selected = useMemo(
    () => problems.find((p) => p.id === selectedId) ?? null,
    [problems, selectedId],
  )

  const progressMap = useMemo(() => {
    const m = new Map<string, ProblemProgress>()
    for (const p of progress) m.set(p.problemId, p)
    return m
  }, [progress])

  const loadAll = useCallback(async () => {
    setError(null)
    const [probs, state] = await Promise.all([
      apiJson<{ problems: CodingProblem[] }>('/api/coding/problems'),
      apiJson<{
        patterns: Pattern[]
        mistakesByTopic: TopicCount[]
        progress: ProblemProgress[]
        recentMistakes: Mistake[]
      }>('/api/coding/state'),
    ])
    setProblems(probs.problems)
    setPatterns(state.patterns)
    setMistakesByTopic(state.mistakesByTopic)
    setProgress(state.progress)
    setRecentMistakes(state.recentMistakes)
    return state
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await loadAll()
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiRequestError ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadAll])

  useEffect(() => {
    if (problems.length > 0 && selectedId === null) {
      setSelectedId(problems[0].id)
    }
  }, [problems, selectedId])

  useEffect(() => {
    if (!selectedId || problems.length === 0) return
    const p = problems.find((x) => x.id === selectedId)
    if (!p) return
    const k = cacheKey(p.id, practiceLang)
    if (codeCacheRef.current[k] !== undefined) {
      setCode(codeCacheRef.current[k])
      return
    }
    const pr = progressMap.get(p.id)
    const initial = pr?.lastCode ?? getStarterCode(p, practiceLang)
    codeCacheRef.current[k] = initial
    setCode(initial)
  }, [practiceLang, selectedId, problems, progressMap])

  const selectProblem = (p: CodingProblem) => {
    setSelectedId(p.id)
    setLastAnalysis(null)
    setError(null)
  }

  const handleCodeChange = (v: string) => {
    setCode(v)
    if (selectedId) {
      codeCacheRef.current[cacheKey(selectedId, practiceLang)] = v
    }
  }

  const submitSolution = async () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    setLastAnalysis(null)
    try {
      const data = await apiJson<{ analysis: SubmitAnalysis; problemId: string }>('/api/coding/submit', {
        method: 'POST',
        body: JSON.stringify({
          problemId: selected.id,
          code,
          language: practiceLang,
        }),
      })
      setLastAnalysis(data.analysis)
      const state = await loadAll()
      if (state && selected) {
        const pr = state.progress.find((x) => x.problemId === data.problemId)
        if (pr?.lastCode) {
          const k = cacheKey(selected.id, practiceLang)
          codeCacheRef.current[k] = pr.lastCode
          setCode(pr.lastCode)
        }
      }
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const openCount = recentMistakes.filter((m) => !m.resolved).length

  if (loading && problems.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading practice…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Coding Practice</h1>
        <p className="text-muted-foreground mt-1">
          Solve problems, get AI feedback, and track mistake patterns — {openCount} unresolved issues in history
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <aside className="xl:col-span-3 space-y-4">
          <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Problems
              </h3>
            </div>
            <ul className="divide-y divide-border max-h-[280px] overflow-y-auto">
              {problems.map((p) => {
                const pr = progressMap.get(p.id)
                const solved = pr?.status === 'solved'
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectProblem(p)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors',
                        selectedId === p.id && 'bg-primary/10',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm text-foreground line-clamp-2">{p.title}</span>
                        {solved && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded border',
                            diffBadge[p.difficulty] ?? diffBadge.Easy,
                          )}
                        >
                          {p.difficulty}
                        </span>
                        {pr && (
                          <span className="text-[10px] text-muted-foreground">{pr.attempts} attempts</span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">Your Past Mistakes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Aggregated patterns (all time)</p>
            </div>
            <ul className="p-4 space-y-2 text-sm text-muted-foreground max-h-[220px] overflow-y-auto">
              {patterns.length === 0 ? (
                <li className="text-xs">Submit solutions to build this list.</li>
              ) : (
                patterns.map((x) => (
                  <li key={x.pattern} className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                    <span className="text-foreground">{x.pattern}</span>
                    <span className="text-xs tabular-nums">×{x.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {mistakesByTopic.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" />
                By topic
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                {mistakesByTopic.slice(0, 8).map((t) => (
                  <li key={t.topic}>
                    {t.topic}: {t.cnt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <main className="xl:col-span-9 space-y-4">
          {selected ? (
            <>
              <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{selected.title}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className={diffBadge[selected.difficulty]}>
                        {selected.difficulty}
                      </Badge>
                      {selected.topics.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {progressMap.get(selected.id)?.status === 'solved' && (
                    <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Solved
                    </span>
                  )}
                </div>
                <div className="max-w-none">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selected.description}</p>
                  {selected.examples && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Examples</p>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">
                        {selected.examples}
                      </pre>
                    </div>
                  )}
                  {selected.constraints && (
                    <p className="text-xs text-muted-foreground mt-2">Constraints: {selected.constraints}</p>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <Label htmlFor="code" className="text-base font-semibold">
                    Your solution
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Language</span>
                    <Select
                      value={practiceLang}
                      onValueChange={(v: PracticeLanguage) => setPracticeLang(v)}
                    >
                      <SelectTrigger className="w-[140px] h-9 bg-muted" id="practice-lang">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <PracticeCodeEditor
                  language={practiceLang}
                  value={code}
                  onChange={handleCodeChange}
                  className="rounded-md overflow-hidden border border-border"
                />
                <div className="flex flex-wrap gap-3 mt-4">
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => void submitSolution()}
                    disabled={submitting || !code.trim()}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Analyzing…
                      </>
                    ) : (
                      'Submit solution'
                    )}
                  </Button>
                </div>
              </div>

              {lastAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={cn(
                      'rounded-lg border p-4',
                      lastAnalysis.isCorrect
                        ? 'border-green-500/40 bg-green-500/5'
                        : 'border-amber-500/40 bg-amber-500/5',
                    )}
                  >
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      {lastAnalysis.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      )}
                      Analysis · Score {lastAnalysis.score}
                    </h3>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{lastAnalysis.feedback}</p>
                    {!lastAnalysis.isCorrect && lastAnalysis.mistakePatterns.length > 0 && (
                      <ul className="mt-3 text-sm list-disc list-inside text-muted-foreground space-y-1">
                        {lastAnalysis.mistakePatterns.map((m, i) => (
                          <li key={i}>
                            <span className="text-foreground font-medium">{m.type}</span> ({m.topic}) —{' '}
                            {m.detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      Hint (uses your past mistakes)
                    </h3>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{lastAnalysis.hint}</p>
                    {lastAnalysis.weakTopics.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Weak topics flagged: {lastAnalysis.weakTopics.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-card rounded-lg border border-border p-4 shadow-soft">
                <h3 className="text-sm font-semibold text-foreground mb-3">Recent mistake log</h3>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {recentMistakes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No rows yet.</p>
                  ) : (
                    recentMistakes.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-start justify-between gap-2 text-xs border-b border-border/50 pb-2"
                      >
                        <div>
                          <p className="text-foreground font-medium">{m.mistakeType}</p>
                          <p className="text-muted-foreground">
                            {m.topic} · {formatDistanceToNow(m.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                        {m.resolved ? (
                          <span className="text-green-600 shrink-0">done</span>
                        ) : (
                          <span className="text-amber-600 shrink-0">open</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Select a problem to begin.</p>
          )}
        </main>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border pt-4">
        <Code2 className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Submissions call the AI to review your code, update memories, coding_mistakes, progress, and dashboard
          stats. This is educational review — not an execution sandbox.
        </span>
      </div>
    </div>
  )
}
