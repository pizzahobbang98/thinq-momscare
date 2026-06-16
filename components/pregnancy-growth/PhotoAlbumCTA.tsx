'use client'

import { motion } from 'framer-motion'
import styles from './PregnancyGrowthCard.module.css'

export default function PhotoAlbumCTA({
  onClick,
  reducedMotion,
}: {
  onClick?: () => void
  reducedMotion: boolean
}) {
  return (
    <motion.button
      type="button"
      className={styles.cta}
      onClick={onClick}
      aria-label="사진첩 보기"
      animate={reducedMotion ? undefined : { opacity: [0.82, 1, 0.82] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      whileTap={{ scale: 0.96 }}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="m4 16 4-4 3 3 4-5 5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="9.5" r="1.4" fill="currentColor" />
      </svg>
      <span>사진첩 보기</span>
    </motion.button>
  )
}
