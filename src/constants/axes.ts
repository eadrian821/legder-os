export type Axis = 'INVEST' | 'PROTECT' | 'SUSTAIN' | 'LEAK'

export const AXES: { id: Axis; label: string; color: string; description: string }[] = [
  { id: 'INVEST',  label: 'Invest',   color: 'var(--invest)',   description: 'Compounds future wealth' },
  { id: 'PROTECT', label: 'Protect',  color: 'var(--protect)',  description: 'Mitigates risk' },
  { id: 'SUSTAIN', label: 'Sustain',  color: 'var(--sustain)',  description: 'Necessary friction' },
  { id: 'LEAK',    label: 'Leak',     color: 'var(--leak)',     description: 'Destroys capital' },
]

export const AXIS_COLORS: Record<Axis, string> = {
  INVEST:  'var(--invest)',
  PROTECT: 'var(--protect)',
  SUSTAIN: 'var(--sustain)',
  LEAK:    'var(--leak)',
}

export const AXIS_TAILWIND: Record<Axis, string> = {
  INVEST:  'text-invest',
  PROTECT: 'text-protect',
  SUSTAIN: 'text-sustain',
  LEAK:    'text-leak',
}
