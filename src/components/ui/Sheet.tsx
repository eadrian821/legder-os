import { useEffect } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  // Escape key dismissal
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // Dismiss if dragged far enough down OR flicked fast enough
    if (info.offset.y > 80 || info.velocity.y > 400) onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            className="fixed inset-0 z-40 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="sheet-panel"
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-lg border-t border-[var(--line)] overflow-hidden"
            style={{
              background: 'var(--bg-1)',
              maxHeight: '92dvh',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            // Allow small upward overscroll (elastic feel), free downward
            dragElastic={{ top: 0.05, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
          >
            {/* Grab handle — pulses on mount to signal draggability */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <motion.div
                className="rounded-full"
                style={{ width: 40, height: 4, background: 'var(--line-2)' }}
                initial={{ scaleX: 0.5, opacity: 0 }}
                animate={{ scaleX: [0.5, 1.15, 1], opacity: [0, 1, 1] }}
                transition={{ duration: 0.5, ease: 'easeOut', times: [0, 0.6, 1] }}
              />
            </div>

            {/* Optional title */}
            {title && (
              <div
                className="px-4 pb-3 border-b border-[var(--line)]"
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}
              >
                {title}
              </div>
            )}

            {/* Scrollable content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(92dvh - 56px)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
