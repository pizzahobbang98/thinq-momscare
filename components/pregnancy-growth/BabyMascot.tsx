'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'

// 앱 마스코트 느낌의 단순한 아기 (사실적이지 않음). 원점(0,0) 중심, 바닥은 +40 근처.
export default function BabyMascot({ reducedMotion }: { reducedMotion: boolean }) {
  const id = useId()
  return (
    <motion.g
      style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
      animate={reducedMotion ? undefined : { y: [0, -5, 0], rotate: [-1.2, 1.2, -1.2] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
    >
      <defs>
        <linearGradient id={`baby-body-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCE4D2" />
          <stop offset="1" stopColor="#F6CBB4" />
        </linearGradient>
        <radialGradient id={`baby-face-${id}`} cx="0.42" cy="0.36" r="0.8">
          <stop offset="0" stopColor="#FFF3E8" />
          <stop offset="1" stopColor="#FBDFC8" />
        </radialGradient>
      </defs>

      {/* 우주복 몸통 */}
      <path
        d="M-24 16 C -24 -2 -14 -8 0 -8 C 14 -8 24 -2 24 16 C 24 34 14 42 0 42 C -14 42 -24 34 -24 16 Z"
        fill={`url(#baby-body-${id})`}
      />
      {/* 발 */}
      <ellipse cx="-10" cy="42" rx="7" ry="5" fill="#F6CBB4" />
      <ellipse cx="10" cy="42" rx="7" ry="5" fill="#F6CBB4" />
      {/* 팔 */}
      <ellipse cx="-23" cy="14" rx="7" ry="10" fill={`url(#baby-body-${id})`} transform="rotate(18 -23 14)" />
      <ellipse cx="23" cy="14" rx="7" ry="10" fill={`url(#baby-body-${id})`} transform="rotate(-18 23 14)" />

      {/* 머리 */}
      <circle cx="0" cy="-18" r="19" fill={`url(#baby-face-${id})`} />
      {/* 머리카락 */}
      <path d="M-12 -28 C -6 -40 6 -40 12 -28 C 6 -33 -6 -33 -12 -28 Z" fill="#C89A78" />
      <path d="M0 -37 q3 -4 6 -2" stroke="#C89A78" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* 볼 */}
      <circle cx="-10" cy="-13" r="4" fill="#F7B8C0" opacity="0.7" />
      <circle cx="10" cy="-13" r="4" fill="#F7B8C0" opacity="0.7" />
      {/* 눈 */}
      <circle cx="-6.5" cy="-19" r="1.9" fill="#7A5A4E" />
      <circle cx="6.5" cy="-19" r="1.9" fill="#7A5A4E" />
      {/* 미소 */}
      <path d="M-4 -12 q4 4 8 0" stroke="#7A5A4E" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </motion.g>
  )
}
