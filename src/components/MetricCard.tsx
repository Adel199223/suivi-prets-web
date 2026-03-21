import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: ReactNode
  tone?: 'default' | 'accent' | 'warning'
}

export function MetricCard({ label, value, tone = 'default' }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
    </article>
  )
}
