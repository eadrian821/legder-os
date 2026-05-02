/**
 * DevKitchen — render all animation components with mock data.
 * Access at /ledger-os/dev (add ?dev to URL or use the router below).
 * Never imported in production — tree-shaken out.
 */
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { NumberTicker } from '@/components/ui/NumberTicker'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { AxisBar } from '@/components/ui/AxisBar'
import { SparkLine } from '@/components/ui/SparkLine'
import { Sheet } from '@/components/ui/Sheet'
import { BurnGauge } from '@/components/ui/BurnGauge'
import { PageTransition } from '@/components/layout/PageTransition'

const MOCK_AXIS = { INVEST: 12000, PROTECT: 5000, SUSTAIN: 30000, LEAK: 8000 }
const MOCK_SPARK = [180, 195, 210, 205, 220, 215, 230, 225, 240, 238, 245, 250,
                    248, 255, 252, 260, 265, 258, 270, 275, 280, 272, 285, 290,
                    288, 295, 300, 298, 305, 310]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="px-4 mb-3" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)' }}>
        {title}
      </div>
      <div className="px-4">{children}</div>
    </div>
  )
}

export function DevKitchen() {
  const [nw, setNw] = useState(312_500)
  const [masked, setMasked] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [burn, setBurn] = useState(0.4)
  const [tab, setTab] = useState('a')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 14 }}>
          ⬡ DEV KITCHEN
        </span>
        <button
          style={{ marginLeft: 'auto', display: 'block', fontSize: 11, color: 'var(--ink-3)', cursor: 'pointer' }}
          onClick={() => setMasked(m => !m)}
        >
          {masked ? 'unmask' : 'mask values'}
        </button>
      </div>

      {/* ── NumberTicker ────────────────────────────────────────────────────── */}
      <Section title="NumberTicker — spring physics (stiffness 60, damping 20)">
        <div className="space-y-4">
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Hero (46px) — tap buttons to animate</div>
            <NumberTicker value={nw} format="compact" prefix="KES" masked={masked} size="hero" color="var(--ink)" />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {[200_000, 312_500, 450_000, 1_250_000, -50_000].map(v => (
                <button key={v} onClick={() => setNw(v)}
                  style={{ fontSize: 10, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4, color: 'var(--ink-3)' }}>
                  {v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 4 }}>kpi (20px)</div>
              <NumberTicker value={nw} format="compact" prefix="KES" masked={masked} size="kpi" color="var(--invest)" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 4 }}>inline (14px)</div>
              <NumberTicker value={1_234.56} format="full" masked={masked} size="inline" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 4 }}>with suffix</div>
              <NumberTicker value={73.4} size="kpi" suffix="%" color="var(--protect)" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 4 }}>negative / leak</div>
              <NumberTicker value={-8_200} format="compact" size="kpi" color="var(--leak)" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── KpiCard grid ────────────────────────────────────────────────────── */}
      <Section title="KpiCard — glassmorphism, staggered entry, hover lift">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <KpiCard index={0} label="Burn/day"    value={3_200}  masked={masked} color="var(--sustain)" />
          <KpiCard index={1} label="Leak%"       value={18.4}   masked={masked} suffix="%" color="var(--leak)" />
          <KpiCard index={2} label="Month in"    value={95_000} masked={masked} color="var(--invest)" />
          <KpiCard index={3} label="Week out"    value={22_400} masked={masked} />
          <KpiCard index={4} label="Cash runway" value={45}     suffix="d" hint="days of liquid" />
          <KpiCard index={5} label="Total runway"value={175}    suffix="d" />
          <KpiCard index={6} label="Save rate"   value={34.2}   suffix="%" color="var(--invest)" />
          <KpiCard index={7} label="Deployed"    value={32_400} masked={masked} color="var(--protect)" />
        </div>
      </Section>

      {/* ── BurnGauge ────────────────────────────────────────────────────────── */}
      <Section title="BurnGauge — color interpolation + spring fill">
        <div className="space-y-3">
          <BurnGauge dailyBurn={3_200} burnRatio={burn} runway={45} runwayTotal={175} masked={masked} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>burnRatio: {burn.toFixed(2)}</span>
            <input type="range" min={0} max={1.5} step={0.01} value={burn}
              onChange={e => setBurn(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>
            Drag above 0.8 to see pulsing glow · above 1.0 to see leak color
          </div>
        </div>
      </Section>

      {/* ── SkeletonCard ─────────────────────────────────────────────────────── */}
      <Section title="SkeletonCard — terminal scanline, not gray blobs">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} showNumber />
          <SkeletonCard lines={1} showNumber height={80} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={2} showNumber />
          <SkeletonCard lines={3} height={100} />
        </div>
      </Section>

      {/* ── AxisBar + SparkLine ───────────────────────────────────────────────── */}
      <Section title="AxisBar + SparkLine">
        <div className="space-y-3">
          <AxisBar totals={MOCK_AXIS} />
          <AxisBar totals={{ INVEST: 0, PROTECT: 0, SUSTAIN: 40000, LEAK: 20000 }} />
          <AxisBar totals={{ INVEST: 50000, PROTECT: 20000, SUSTAIN: 0, LEAK: 0 }} />
          <div style={{ marginTop: 12 }}>
            <SparkLine points={MOCK_SPARK} width={200} height={40} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <SparkLine points={MOCK_SPARK.slice(-14)} width={120} height={28} color="var(--protect)" />
            <SparkLine points={[100, 80, 60, 90, 50, 40, 70]} width={80} height={24} color="var(--leak)" />
          </div>
        </div>
      </Section>

      {/* ── PageTransition ───────────────────────────────────────────────────── */}
      <Section title="PageTransition — outgoing 150ms up, incoming 200ms down">
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['a', 'b', 'c'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '6px 16px', borderRadius: 4, fontSize: 12,
                  background: tab === t ? 'var(--accent)' : 'var(--bg-2)',
                  color: tab === t ? 'var(--bg)' : 'var(--ink-3)',
                  border: '1px solid var(--line)',
                }}>
                Tab {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ height: 80, overflow: 'hidden', position: 'relative', background: 'var(--bg-2)', borderRadius: 8 }}>
            <AnimatePresence mode="wait">
              <PageTransition key={tab}>
                <div style={{ padding: 20, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)' }}>
                  Content for tab <strong style={{ color: 'var(--accent)' }}>{tab.toUpperCase()}</strong>
                </div>
              </PageTransition>
            </AnimatePresence>
          </div>
        </div>
      </Section>

      {/* ── Sheet ─────────────────────────────────────────────────────────────── */}
      <Section title="Sheet — spring stiffness:400 damping:40, drag-to-dismiss">
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            width: '100%', padding: '10px', borderRadius: 8,
            border: '1px solid var(--line-2)', background: 'var(--bg-2)',
            color: 'var(--ink)', fontSize: 13, cursor: 'pointer',
          }}
        >
          Open Sheet ↑
        </button>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Demo Sheet">
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              Drag the handle down or tap the backdrop to dismiss.
            </p>
            <AxisBar totals={MOCK_AXIS} />
            <BurnGauge dailyBurn={3200} burnRatio={0.6} runway={45} runwayTotal={175} />
            <div style={{ height: 200 }} />
            <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>↑ content scrolls inside the sheet</p>
          </div>
        </Sheet>
      </Section>
    </div>
  )
}
