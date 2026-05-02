import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ToastItem {
  id: string
  message: string
  action?: { label: string; cb: () => void }
}

interface ToastContextValue {
  toast: (msg: string, action?: ToastItem['action']) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: string) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, action?: ToastItem['action']) => {
    const id = Math.random().toString(36).slice(2)
    setItems((prev) => [...prev.slice(-2), { id, message, action }])
    const delay = action ? 6000 : 2400
    timers.current.set(id, setTimeout(() => remove(id), delay))
  }, [remove])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-center gap-3 rounded-lg bg-bg-2 border border-line px-4 py-2.5 text-sm text-ink shadow-lg max-w-sm"
            >
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  className="text-accent font-medium text-xs shrink-0"
                  onClick={() => { t.action!.cb(); remove(t.id) }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
