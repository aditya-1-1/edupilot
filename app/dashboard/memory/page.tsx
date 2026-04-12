'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Loader2,
  Target,
  AlertTriangle,
  Flag,
  TrendingUp,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiRequestError, apiJson } from '@/lib/api'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type TimelineKind = 'weak_topic' | 'mistake' | 'goal' | 'progress' | 'episodic_note'

type TimelineItem = {
  id: string
  kind: TimelineKind
  title: string
  description: string
  timestamp: number
}

const kindMeta: Record<TimelineKind, { label: string; icon: LucideIcon; className: string }> = {
  weak_topic: {
    label: 'Weak topic',
    icon: Target,
    className: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30',
  },
  mistake: {
    label: 'Mistake',
    icon: AlertTriangle,
    className: 'bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/30',
  },
  goal: {
    label: 'Goal',
    icon: Flag,
    className: 'bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30',
  },
  progress: {
    label: 'Progress',
    icon: TrendingUp,
    className: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
  },
  episodic_note: {
    label: 'Note',
    icon: StickyNote,
    className: 'bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/30',
  },
}

export default function MemoryPage() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const data = await apiJson<{ items: TimelineItem[] }>('/api/memory/timeline')
    setItems(data.items)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiRequestError ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Memory Timeline</h1>
          <p className="text-muted-foreground mt-1">
            Episodic memories and structured extractions (weak topics, mistakes, goals, progress)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void (async () => {
              setLoading(true)
              try {
                await load()
              } catch (e) {
                setError(e instanceof ApiRequestError ? e.message : 'Failed to refresh')
              } finally {
                setLoading(false)
              }
            })()
          }}
        >
          Refresh
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">{error}</p>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading timeline…
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No timeline entries yet. Chat with the mentor and log progress — memories and extractions appear here.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const meta = kindMeta[item.kind]
            const Icon = meta.icon
            return (
              <div key={item.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border',
                      meta.className,
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {idx < items.length - 1 && <div className="w-px flex-1 min-h-[20px] bg-border mt-2" />}
                </div>
                <div className="flex-1 pb-2 min-w-0">
                  <div className="bg-card rounded-lg border border-border p-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground text-base">{item.title}</h3>
                          <Badge variant="outline" className={cn('text-xs font-normal', meta.className)}>
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(item.timestamp, 'PPpp')}
                          <span className="mx-1">·</span>
                          {format(item.timestamp, 'EEEE')}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
