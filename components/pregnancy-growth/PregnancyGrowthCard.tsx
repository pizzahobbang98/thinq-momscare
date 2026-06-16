'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  fetalGrowthData as defaultData,
  findGrowthWeek,
  type FetalGrowthWeek,
} from '@/lib/fetal-growth/fetalGrowthData'
import GrowthComparisonScene from './GrowthComparisonScene'
import WeekBadge from './WeekBadge'
import PhotoAlbumCTA from './PhotoAlbumCTA'
import WeekSwitcher from './WeekSwitcher'
import styles from './PregnancyGrowthCard.module.css'

export type PregnancyGrowthCardProps = {
  currentWeek?: number
  data?: FetalGrowthWeek[]
  autoPlay?: boolean
  showWeekSwitcher?: boolean
  onWeekChange?: (week: number) => void
  onOpenAlbum?: () => void
  className?: string
}

export default function PregnancyGrowthCard({
  currentWeek,
  data,
  autoPlay = false,
  showWeekSwitcher = false,
  onWeekChange,
  onOpenAlbum,
  className,
}: PregnancyGrowthCardProps) {
  const reduce = useReducedMotion() ?? false

  const weeks = useMemo(() => {
    const source = data && data.length > 0 ? data : defaultData
    return [...source].sort((a, b) => a.week - b.week)
  }, [data])

  const isControlled = currentWeek != null
  const [internalWeek, setInternalWeek] = useState<number>(
    () => weeks[weeks.length - 1]?.week ?? 0,
  )
  const activeWeek = isControlled ? (currentWeek as number) : internalWeek
  const current = useMemo(
    () => findGrowthWeek(weeks, activeWeek) ?? weeks[weeks.length - 1] ?? null,
    [weeks, activeWeek],
  )

  function setWeek(week: number) {
    if (!isControlled) setInternalWeek(week)
    onWeekChange?.(week)
  }

  // 발표용 자동 재생 (제어되지 않을 때만)
  useEffect(() => {
    if (!autoPlay || isControlled || weeks.length <= 1) return
    const id = window.setInterval(() => {
      setInternalWeek((prev) => {
        const idx = weeks.findIndex((w) => w.week === prev)
        const next = weeks[(idx + 1) % weeks.length] ?? weeks[0]
        onWeekChange?.(next.week)
        return next.week
      })
    }, 2500)
    return () => window.clearInterval(id)
  }, [autoPlay, isControlled, weeks, onWeekChange])

  if (!current) return null

  const idx = weeks.findIndex((w) => w.week === current.week)
  const goPrev = () => setWeek(weeks[(idx - 1 + weeks.length) % weeks.length].week)
  const goNext = () => setWeek(weeks[(idx + 1) % weeks.length].week)

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ''}`}>
      <motion.div
        className={styles.card}
        role="group"
        aria-label={`임신 ${current.week}주차 아기 성장 비교 카드 · 비교 대상 ${current.label}`}
        animate={reduce ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <GrowthComparisonScene data={current} reducedMotion={reduce} />

        <WeekBadge week={current.week} label={current.label} />

        {current.description && (
          <AnimatePresence mode="wait">
            <motion.p
              key={current.week}
              className={styles.desc}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {current.description}
            </motion.p>
          </AnimatePresence>
        )}

        <PhotoAlbumCTA onClick={onOpenAlbum} reducedMotion={reduce} />
      </motion.div>

      {showWeekSwitcher && (
        <WeekSwitcher week={current.week} label={current.label} onPrev={goPrev} onNext={goNext} />
      )}
    </div>
  )
}
