'use client'

import { AnimatePresence, motion } from 'framer-motion'
import styles from './PregnancyGrowthCard.module.css'

export default function WeekBadge({ week, label }: { week: number; label: string }) {
  return (
    <div className={styles.badge}>
      <AnimatePresence mode="wait">
        <motion.span
          key={`${week}-${label}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {week}주차 · {label}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
