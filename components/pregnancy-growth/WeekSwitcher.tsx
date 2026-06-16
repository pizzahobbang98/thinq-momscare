'use client'

import styles from './PregnancyGrowthCard.module.css'

export default function WeekSwitcher({
  week,
  label,
  onPrev,
  onNext,
}: {
  week: number
  label: string
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className={styles.switcher}>
      <button type="button" className={styles.navBtn} onClick={onPrev} aria-label="이전 주차 보기">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className={styles.navWeek}>
        {week}주차 · {label}
      </span>
      <button type="button" className={styles.navBtn} onClick={onNext} aria-label="다음 주차 보기">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
