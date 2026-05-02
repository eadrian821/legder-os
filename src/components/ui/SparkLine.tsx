interface SparkLineProps {
  points: number[]
  width?: number
  height?: number
  color?: string
}

export function SparkLine({ points, width = 120, height = 28, color = 'var(--invest)' }: SparkLineProps) {
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const pad = 2

  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (width - pad * 2))
  const ys = points.map((v) => pad + (1 - (v - min) / range) * (height - pad * 2))

  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${height} L${xs[0].toFixed(1)},${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" className="overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
