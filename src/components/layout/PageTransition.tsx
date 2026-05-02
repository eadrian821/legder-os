import { motion } from 'framer-motion'

// Outgoing: fade out + slide 8px up (150ms)
// Incoming: fade in + slide from 8px below to 0 (200ms)
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
      exit={{    opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } }}
      className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]"
    >
      {children}
    </motion.div>
  )
}
