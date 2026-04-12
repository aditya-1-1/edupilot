import { ArrowUp, ArrowDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: number
  icon?: React.ReactNode
  description?: string
}

export default function MetricCard({
  title,
  value,
  unit,
  trend,
  icon,
  description,
}: MetricCardProps) {
  const isPositiveTrend = trend && trend > 0

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-soft hover:shadow-md-soft transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-foreground">{value}</h3>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-4">
          {isPositiveTrend ? (
            <ArrowUp className="w-4 h-4 text-green-600" />
          ) : (
            <ArrowDown className="w-4 h-4 text-red-600" />
          )}
          <span
            className={`text-sm font-medium ${
              isPositiveTrend ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {Math.abs(trend)}% from last week
          </span>
        </div>
      )}
    </div>
  )
}
