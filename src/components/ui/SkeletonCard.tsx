import { useId } from 'react'

interface SkeletonCardProps {
  lines?: number
  showNumber?: boolean
  height?: number
  className?: string
}

// Unique scanline animation ID per card so multiple cards stagger independently
const LINE_WIDTHS = ['60%', '80%', '40%', '70%', '55%', '85%']

export function SkeletonCard({ lines = 2, showNumber = false, height, className = '' }: SkeletonCardProps) {
  const id = useId()

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-1)] p-4 ${className}`}
      style={height ? { height } : undefined}
    >
      {/*
       * Terminal-style scanline — NOT a generic gray blob.
       * A horizontal band of rgba(0,230,118,0.06) sweeps top→bottom continuously.
       * The `scanline` keyframe is defined in tailwind.config.ts.
       */}
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{
          top: 0,
          height: '40%',
          background: 'linear-gradient(to bottom, transparent, rgba(0,230,118,0.06), transparent)',
          animation: 'scanline 2.2s linear infinite',
          animationDelay: id.length % 3 === 0 ? '0s' : id.length % 3 === 1 ? '0.7s' : '1.4s',
        }}
      />

      <div className="relative space-y-2.5">
        {showNumber && (
          /* Number placeholder: wider + slight green tint */
          <div
            className="h-6 rounded"
            style={{ width: '55%', background: 'rgba(0,230,118,0.08)' }}
          />
        )}

        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="rounded"
            style={{
              height: i === 0 ? 12 : 10,
              width: LINE_WIDTHS[i % LINE_WIDTHS.length],
              background: i === 0
                ? 'rgba(221,221,240,0.07)'  // slightly lighter for "title" line
                : 'rgba(102,102,136,0.12)', // muted for body lines
            }}
          />
        ))}
      </div>
    </div>
  )
}
