import { useState } from 'react'

interface DataPoint {
  label: string
  value: number
  sublabel?: string
}

interface EloChartProps {
  data: DataPoint[]
  height?: number
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 }

export function EloChart({ data, height = 200 }: EloChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length < 2) return null

  const values = data.map(d => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 50
  const yMin = minVal - range * 0.15
  const yMax = maxVal + range * 0.15

  const chartW = 600
  const chartH = height
  const plotW = chartW - PADDING.left - PADDING.right
  const plotH = chartH - PADDING.top - PADDING.bottom

  const xStep = plotW / (data.length - 1)
  const toX = (i: number) => PADDING.left + i * xStep
  const toY = (v: number) => PADDING.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ')

  const gridLines = 4
  const gridVals = Array.from({ length: gridLines + 1 }, (_, i) =>
    Math.round(yMin + (i / gridLines) * (yMax - yMin))
  )

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {gridVals.map(v => (
          <g key={v}>
            <line
              x1={PADDING.left} y1={toY(v)}
              x2={chartW - PADDING.right} y2={toY(v)}
              stroke="var(--bd)" strokeWidth="1" strokeDasharray="4,4"
            />
            <text
              x={PADDING.left - 8} y={toY(v) + 4}
              textAnchor="end" fontSize="10" fill="var(--fg-muted)"
            >
              {v}
            </text>
          </g>
        ))}

        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={toX(i)} cy={toY(d.value)} r={hovered === i ? 6 : 4}
              fill={hovered === i ? '#2563eb' : '#3b82f6'}
              stroke="var(--card)" strokeWidth="2"
              className="cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
            {data.length <= 10 && (
              <text
                x={toX(i)} y={chartH - 6}
                textAnchor="middle" fontSize="9" fill="var(--fg-muted)"
              >
                {d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label}
              </text>
            )}
          </g>
        ))}

        {hovered !== null && (
          <g>
            <rect
              x={Math.min(Math.max(toX(hovered) - 55, 0), chartW - 110)}
              y={toY(data[hovered].value) - 38}
              width="110" height="30" rx="4"
              fill="var(--card)" stroke="var(--bd)" strokeWidth="1"
            />
            <text
              x={Math.min(Math.max(toX(hovered), 55), chartW - 55)}
              y={toY(data[hovered].value) - 24}
              textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--fg)"
            >
              {data[hovered].value} Elo
            </text>
            <text
              x={Math.min(Math.max(toX(hovered), 55), chartW - 55)}
              y={toY(data[hovered].value) - 13}
              textAnchor="middle" fontSize="9" fill="var(--fg-muted)"
            >
              {data[hovered].sublabel ?? data[hovered].label}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
