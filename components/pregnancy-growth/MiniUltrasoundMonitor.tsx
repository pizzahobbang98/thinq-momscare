'use client'

import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import FetusSilhouette from './FetusSilhouette'
import { TOKENS } from './tokens'

const FRAME = { x: 26, y: 28, w: 94, h: 74, r: 16 }
const SCR = { x: 33, y: 35, w: 80, h: 60, r: 11 }
const CX = SCR.x + SCR.w / 2 // 73
const CY = SCR.y + SCR.h / 2 // 65

export default function MiniUltrasoundMonitor({
  week,
  fetusScale,
  reducedMotion,
}: {
  week: number
  fetusScale: number
  reducedMotion: boolean
}) {
  const id = useId()
  const clip = `mon-clip-${id}`

  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id={`mon-scr-${id}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor={TOKENS.screenBlue} />
          <stop offset="1" stopColor={TOKENS.screenBlueDeep} />
        </linearGradient>
        <radialGradient id={`mon-glow-${id}`} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clip}>
          <rect x={SCR.x} y={SCR.y} width={SCR.w} height={SCR.h} rx={SCR.r} />
        </clipPath>
        <filter id={`mon-shadow-${id}`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={TOKENS.shadowSoft} floodOpacity="0.6" />
        </filter>
      </defs>

      {/* 흰색 프레임 */}
      <rect
        x={FRAME.x}
        y={FRAME.y}
        width={FRAME.w}
        height={FRAME.h}
        rx={FRAME.r}
        fill={TOKENS.white}
        filter={`url(#mon-shadow-${id})`}
      />

      {/* 스크린 */}
      <rect x={SCR.x} y={SCR.y} width={SCR.w} height={SCR.h} rx={SCR.r} fill={`url(#mon-scr-${id})`} />

      <g clipPath={`url(#${clip})`}>
        {/* 중앙 글로우 */}
        {reducedMotion ? (
          <ellipse cx={CX} cy={CY} rx={32} ry={24} fill={`url(#mon-glow-${id})`} opacity={0.4} />
        ) : (
          <motion.ellipse
            cx={CX}
            cy={CY}
            rx={32}
            ry={24}
            fill={`url(#mon-glow-${id})`}
            animate={{ opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* 그리드 */}
        <g stroke={TOKENS.screenGrid} strokeWidth={1} opacity={0.55}>
          <line x1={53} y1={SCR.y} x2={53} y2={SCR.y + SCR.h} />
          <line x1={93} y1={SCR.y} x2={93} y2={SCR.y + SCR.h} />
          <line x1={SCR.x} y1={50} x2={SCR.x + SCR.w} y2={50} />
          <line x1={SCR.x} y1={80} x2={SCR.x + SCR.w} y2={80} />
        </g>

        {/* 펄스 링 */}
        {!reducedMotion && (
          <motion.ellipse
            cx={CX}
            cy={CY}
            rx={11}
            ry={9}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2}
            initial={{ scale: 0.8, opacity: 0.28 }}
            animate={{ scale: 1.3, opacity: 0 }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        )}

        {/* 태아 실루엣 (주차별 크기) */}
        <g transform={`translate(${CX}, ${CY})`}>
          <AnimatePresence mode="wait">
            <motion.g
              key={week}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={{ opacity: 0, scale: fetusScale * 0.85 }}
              animate={{
                opacity: 1,
                scale: reducedMotion
                  ? fetusScale
                  : [fetusScale, fetusScale * 1.035, fetusScale],
              }}
              exit={{ opacity: 0, scale: fetusScale * 0.8 }}
              transition={{
                opacity: { duration: 0.4 },
                scale: reducedMotion
                  ? { duration: 0.4 }
                  : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <FetusSilhouette />
            </motion.g>
          </AnimatePresence>
        </g>

        {/* 스캔라인 */}
        {!reducedMotion && (
          <motion.rect
            x={SCR.x}
            width={SCR.w}
            height={3}
            fill="#FFFFFF"
            opacity={0.32}
            initial={{ y: SCR.y - 2 }}
            animate={{ y: SCR.y + SCR.h }}
            transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* 상단 하이라이트 */}
        <rect x={SCR.x} y={SCR.y} width={SCR.w} height={SCR.h / 2} rx={SCR.r} fill="#FFFFFF" opacity={0.08} />
      </g>
    </g>
  )
}
