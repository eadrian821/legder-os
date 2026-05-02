import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#07070f',
        'bg-1':   '#0d0d18',
        'bg-2':   '#121220',
        'bg-3':   '#181828',
        line:     '#1c1c30',
        'line-2': '#252540',
        ink:      '#ddddf0',
        'ink-2':  '#9999b8',
        'ink-3':  '#666688',
        'ink-4':  '#3a3a58',
        accent:   '#00e676',
        invest:   '#00e676',
        protect:  '#4488ff',
        sustain:  '#ffaa00',
        leak:     '#ff3355',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '6px',
        lg: '8px',
      },
      keyframes: {
        fadeUp:    { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { opacity: '0.7' }, '50%': { opacity: '1' } },
        scanline:  { from: { transform: 'translateY(-100%)' }, to: { transform: 'translateY(200%)' } },
      },
      animation: {
        fadeUp:    'fadeUp 200ms ease forwards',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        scanline:  'scanline 2s linear infinite',
      }
    }
  },
  plugins: []
} satisfies Config
