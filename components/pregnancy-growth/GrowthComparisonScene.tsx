'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { FetalGrowthWeek } from '@/lib/fetal-growth/fetalGrowthData'
import MiniUltrasoundMonitor from './MiniUltrasoundMonitor'
import BabyMascot from './BabyMascot'
import DecorativeObjects from './DecorativeObjects'
import GrowthObjectRenderer from './GrowthObjectRenderer'
import { SCENE, TOKENS } from './tokens'

export default function GrowthComparisonScene({
  data,
  reducedMotion,
}: {
  data: FetalGrowthWeek
  reducedMotion: boolean
}) {
  const objScale = data.objectScale
  const objCenterY = SCENE.floorY - SCENE.objectRadius * objScale

  return (
    <svg
      viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${data.week}주차 아기 크기 비교: ${data.label}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <defs>
        <filter id="pgc-soft-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
      </defs>

      {/* 바닥 부드러운 하이라이트 */}
      <ellipse cx={SCENE.width / 2} cy={SCENE.floorY + 30} rx={260} ry={40} fill={TOKENS.white} opacity={0.18} filter="url(#pgc-soft-blur)" />

      {/* 미니 초음파 모니터 */}
      <MiniUltrasoundMonitor week={data.week} fetusScale={data.fetusScale} reducedMotion={reducedMotion} />

      {/* 소품 */}
      <DecorativeObjects reducedMotion={reducedMotion} />

      {/* 아기 마스코트 */}
      <ellipse cx={SCENE.mascotX} cy={SCENE.floorY + 2} rx={44} ry={11} fill={TOKENS.shadowObject} opacity={0.2} filter="url(#pgc-soft-blur)" />
      <g transform={`translate(${SCENE.mascotX}, ${SCENE.floorY - 40})`}>
        <BabyMascot reducedMotion={reducedMotion} />
      </g>

      {/* 비교 오브젝트 그림자 (주차별 크기) */}
      <motion.ellipse
        cx={SCENE.objectX}
        cy={SCENE.floorY + 2}
        rx={48}
        ry={11}
        fill={TOKENS.shadowObject}
        filter="url(#pgc-soft-blur)"
        animate={{ scaleX: objScale, scaleY: objScale, opacity: 0.22 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />

      {/* 비교 오브젝트 */}
      <g transform={`translate(${SCENE.objectX}, ${objCenterY})`}>
        <AnimatePresence mode="wait">
          <motion.g
            key={`${data.week}-${data.objectKey}`}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={{ opacity: 0, y: 16, scale: objScale * 0.92, rotate: -3 }}
            animate={{ opacity: 1, y: 0, scale: objScale, rotate: 0 }}
            exit={{ opacity: 0, y: -12, scale: objScale * 0.9, rotate: 3 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <motion.g
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              animate={reducedMotion ? undefined : { rotate: [-1.5, 1.5, -1.5], scale: [1, 1.025, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <GrowthObjectRenderer objectKey={data.objectKey} accentColor={data.accentColor} />
            </motion.g>
          </motion.g>
        </AnimatePresence>
      </g>
    </svg>
  )
}
