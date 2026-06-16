'use client'

import { useId } from 'react'

// 추상적이고 귀여운 태아 실루엣 (의료적 묘사 X). 원점(0,0) 중심, 대략 ±18 크기.
export default function FetusSilhouette() {
  const id = useId()
  return (
    <g>
      <defs>
        <radialGradient id={`fetus-${id}`} cx="0.4" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EAF6FE" />
        </radialGradient>
        <filter id={`fetus-glow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      {/* 글로우 */}
      <g opacity="0.5" filter={`url(#fetus-glow-${id})`}>
        <circle cx="2" cy="-8" r="9" fill="#FFFFFF" />
        <path d="M-1 -6 C 12 -8 15 8 4 15 C -6 21 -16 10 -12 0 C -10 -5 -6 -6 -1 -6 Z" fill="#FFFFFF" />
      </g>
      {/* 몸통(웅크린 형태) */}
      <path
        d="M-1 -6 C 12 -8 15 8 4 15 C -6 21 -16 10 -12 0 C -10 -5 -6 -6 -1 -6 Z"
        fill={`url(#fetus-${id})`}
        opacity="0.92"
      />
      {/* 머리 */}
      <circle cx="2" cy="-8" r="8.4" fill={`url(#fetus-${id})`} />
      {/* 부드러운 음영 */}
      <ellipse cx="-2" cy="6" rx="6" ry="7" fill="#CFEAF8" opacity="0.4" />
    </g>
  )
}
