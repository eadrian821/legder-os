interface SparkLineProps {
  points: number[]
  width?: number | string
  height?: number
  color?: string
}

export function SparkLine({ points, width = 120, height = 28, color = 'var(--invest)' }: SparkLineProps) {
  if (points.length < 2) return null

  const vbW = typeof width === 'number' ? width : 300
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const padX = 2
  const padY = 3

  const xs = points.map((_, i) => padX + (i / (points.length - 1)) * (vbW - padX * 2))
  const ys = points.map((v) => padY + (1 - (v - min) / range) * (height - padY * 2))

  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${height} L${xs[0].toFixed(1)},${height} Z`

  const uid = Math.random().toString(36).slice(2, 7)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${vbW} ${height}`}
      fill="none"
      preserveAspectRatio={typeof width === 'string' ? 'none' : undefined}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={`spark-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-fill-${uid})`} />
      <path d={line} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
