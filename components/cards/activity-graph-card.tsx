'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const placeholder = [
  { day: 'Mon', minutes: 0 },
  { day: 'Tue', minutes: 0 },
  { day: 'Wed', minutes: 0 },
  { day: 'Thu', minutes: 0 },
  { day: 'Fri', minutes: 0 },
  { day: 'Sat', minutes: 0 },
  { day: 'Sun', minutes: 0 },
]

type Point = { day: string; minutes: number }

export default function ActivityGraphCard({ data }: { data?: Point[] }) {
  const chartData = data && data.length > 0 ? data : placeholder

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-soft col-span-2">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Study Activity</h3>
        <p className="text-sm text-muted-foreground">Minutes from progress events (last 7 days)</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="day" stroke="var(--muted-foreground)" />
          <YAxis stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
            cursor={{ stroke: 'hsl(var(--primary))' }}
          />
          <Line
            type="monotone"
            dataKey="minutes"
            stroke="hsl(var(--primary))"
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
