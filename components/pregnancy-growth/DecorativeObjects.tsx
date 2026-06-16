'use client'

import { motion } from 'framer-motion'
import { TOKENS } from './tokens'

// 분위기만 보조하는 소품 — 메인 비교 오브젝트를 가리지 않게 최소한으로.
export default function DecorativeObjects({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <g aria-hidden="true">
      {/* 바닥 왼쪽 작은 블록 */}
      <g transform="translate(126, 244)">
        <ellipse cx="0" cy="14" rx="20" ry="5" fill={TOKENS.shadowObject} opacity="0.18" />
        <rect x="-15" y="-12" width="30" height="26" rx="8" fill="#F8D6E2" />
        <rect x="-15" y="-12" width="30" height="12" rx="8" fill="#FFFFFF" opacity="0.35" />
        <circle cx="0" cy="1" r="5" fill="#EBB7C8" />
      </g>

      {/* 살짝 반짝이는 별 (유일하게 움직이는 소품) */}
      <motion.g
        transform="translate(322, 70)"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={reducedMotion ? undefined : { scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M0 -9 C 1 -3 3 -1 9 0 C 3 1 1 3 0 9 C -1 3 -3 1 -9 0 C -3 -1 -1 -3 0 -9 Z"
          fill="#F7C9D8"
        />
      </motion.g>

      {/* 바닥 오른쪽 아주 작은 잎 */}
      <g transform="translate(520, 250)">
        <ellipse cx="0" cy="8" rx="14" ry="4" fill={TOKENS.shadowObject} opacity="0.14" />
        <path d="M0 6 C -10 2 -10 -10 0 -12 C 10 -10 10 2 0 6 Z" fill="#CBE3A6" />
        <path d="M0 6 L 0 -10" stroke="#A7C97E" strokeWidth="1.4" />
      </g>
    </g>
  )
}
