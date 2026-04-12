import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  stats: Array<{
    label: string
    value: string | number
    color?: string
  }>
  icon?: ReactNode
}

export default function StatsCard({ title, stats, icon }: StatsCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="space-y-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <div className="flex items-center gap-2">
              {stat.color && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stat.color }}
                />
              )}
              <span className="text-sm font-semibold text-foreground">
                {stat.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
