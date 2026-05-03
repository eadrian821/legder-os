import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface PinModalProps {
  open: boolean
  onSuccess: () => void
  onClose: () => void
}

const STORED_PIN_KEY = 'ledger-pin'

export function PinModal({ open, onSuccess, onClose }: PinModalProps) {
  const [digits, setDigits] = useState('')
  const [error, setError] = useState(false)

  const handleDigit = (d: string) => {
    const next = (digits + d).slice(0, 6)
    setDigits(next)
    setError(false)
    if (next.length === 6) {
      const stored = localStorage.getItem(STORED_PIN_KEY)
      if (!stored) {
        localStorage.setItem(STORED_PIN_KEY, next)
        onSuccess()
        setDigits('')
      } else if (stored === next) {
        onSuccess()
        setDigits('')
      } else {
        setError(true)
        setTimeout(() => setDigits(''), 400)
      }
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/80"
          style={{ zIndex: 300 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rounded-lg bg-bg-1 border border-line p-6 w-72"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-sm font-medium text-ink">Enter PIN</div>
              <div className={`flex justify-center gap-2 mt-3 ${error ? 'animate-[shake_0.3s_ease]' : ''}`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border transition-colors ${
                      i < digits.length ? 'bg-accent border-accent' : 'bg-transparent border-line-2'
                    }`}
                  />
                ))}
              </div>
              {error && <div className="text-xs text-leak mt-2">Incorrect PIN</div>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d) => (
                <button
                  key={d}
                  className={`h-12 rounded-md font-mono text-lg font-medium transition-colors ${
                    d ? 'bg-bg-2 text-ink hover:bg-bg-3 active:bg-bg-3' : 'invisible'
                  }`}
                  onClick={() => d === '⌫' ? setDigits((p) => p.slice(0, -1)) : d && handleDigit(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
