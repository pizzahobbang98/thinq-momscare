'use client'

import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'
import styles from './HomeDemo.module.css'

type DeviceCardProps = {
  title: string
  location: string
  icon: ReactNode
  isOn: boolean
  stateLabel: string
  /** 켜짐 상태 강조색 (조명은 실제 색) */
  accentColor?: string
  primary: string
  secondary?: string
  /** 정보 행 우측 시각화(풍량 바·밝기 바·재생·배터리 등) */
  meta?: ReactNode
  /** primary 앞 색 스와치(조명 색 표시 등) */
  swatch?: string
  children: ReactNode
}

const DEFAULT_ACCENT = '#e8497e'

export default function DeviceCard({
  title,
  location,
  icon,
  isOn,
  stateLabel,
  accentColor = DEFAULT_ACCENT,
  primary,
  secondary,
  meta,
  swatch,
  children,
}: DeviceCardProps) {
  const accent = isOn ? accentColor : '#b6b1b8'
  const chipStyle: CSSProperties = isOn
    ? { backgroundColor: `${accentColor}1f`, color: accentColor }
    : {}
  const pillStyle: CSSProperties = isOn
    ? { backgroundColor: `${accentColor}16`, color: accentColor }
    : {}

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={styles.cardHead}>
        <div className={styles.headLeft}>
          <span className={`${styles.iconChip} ${isOn ? styles.iconChipOn : ''}`} style={chipStyle}>
            {icon}
          </span>
          <div className={styles.nameWrap}>
            <p className={styles.name}>{title}</p>
            <p className={styles.loc}>{location}</p>
          </div>
        </div>
        <span className={styles.pill} style={pillStyle}>
          <span className={styles.pillDot} style={{ backgroundColor: accent, boxShadow: isOn ? `0 0 0 3px ${accentColor}24` : 'none' }} />
          {stateLabel}
        </span>
      </div>

      <div className={styles.stage}>{children}</div>

      <div className={styles.divider} />

      <div className={styles.infoRow}>
        <p className={styles.primary}>
          {swatch && <span className={styles.swatch} style={{ backgroundColor: swatch }} />}
          {primary}
        </p>
        {meta && <div className={styles.metaSlot}>{meta}</div>}
      </div>
      {secondary && <p className={styles.secondary}>{secondary}</p>}
    </motion.div>
  )
}
