'use client'

import { useId } from 'react'

// 모든 오브젝트는 120x120 로컬 박스의 중앙(60,60)을 기준으로 그린 뒤
// translate(-60,-60) 으로 원점(0,0)이 오브젝트 중앙이 되도록 맞춥니다.
// 렌더러가 (오브젝트X, 중앙Y)에 배치하고 scale 합니다.

type ObjectProps = { color?: string }

function Wrap({ children }: { children: React.ReactNode }) {
  return <g transform="translate(-60,-60)">{children}</g>
}

export function Watermelon() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <linearGradient id={`wm-flesh-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFA7B8" />
          <stop offset="1" stopColor="#EF6B85" />
        </linearGradient>
        <linearGradient id={`wm-rind-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9D793" />
          <stop offset="1" stopColor="#5DA468" />
        </linearGradient>
      </defs>
      <path d="M14 50 A46 46 0 0 0 106 50 Z" fill={`url(#wm-rind-${id})`} />
      <path d="M21 50 A39 39 0 0 0 99 50 Z" fill="#ECF7E4" />
      <path d="M26 50 A34 34 0 0 0 94 50 Z" fill={`url(#wm-flesh-${id})`} />
      {[
        [46, 64, -14], [60, 70, 4], [74, 64, 16], [53, 78, -6], [68, 79, 10],
      ].map(([cx, cy, r], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="2.1" ry="3.3" fill="#5C3A45" transform={`rotate(${r} ${cx} ${cy})`} />
      ))}
      <path d="M33 55 A30 30 0 0 1 57 50" stroke="rgba(255,255,255,0.55)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Wrap>
  )
}

export function Lime() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <radialGradient id={`lime-${id}`} cx="0.4" cy="0.34" r="0.75">
          <stop offset="0" stopColor="#D7EE9B" />
          <stop offset="1" stopColor="#8FBE4E" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="62" r="38" fill={`url(#lime-${id})`} />
      <circle cx="60" cy="62" r="29" fill="#E9F6C9" opacity="0.55" />
      {[0, 45, 90, 135].map((a) => (
        <line
          key={a}
          x1="60" y1="62"
          x2={60 + 27 * Math.cos((a * Math.PI) / 180)}
          y2={62 + 27 * Math.sin((a * Math.PI) / 180)}
          stroke="#A8CF6A" strokeWidth="2" strokeLinecap="round" opacity="0.6"
        />
      ))}
      <ellipse cx="48" cy="48" rx="9" ry="6" fill="rgba(255,255,255,0.5)" transform="rotate(-30 48 48)" />
    </Wrap>
  )
}

export function Avocado() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <linearGradient id={`avo-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A8C76A" />
          <stop offset="1" stopColor="#6E9A45" />
        </linearGradient>
      </defs>
      <path d="M60 24 C 80 24 90 50 90 70 C 90 92 76 102 60 102 C 44 102 30 92 30 70 C 30 50 40 24 60 24 Z" fill={`url(#avo-${id})`} />
      <path d="M60 36 C 73 36 80 54 80 70 C 80 86 71 94 60 94 C 49 94 40 86 40 70 C 40 54 47 36 60 36 Z" fill="#EAF1B8" />
      <circle cx="60" cy="72" r="14" fill="#B07A4E" />
      <circle cx="56" cy="68" r="5" fill="rgba(255,255,255,0.4)" />
      <ellipse cx="50" cy="44" rx="7" ry="4.5" fill="rgba(255,255,255,0.45)" transform="rotate(-28 50 44)" />
    </Wrap>
  )
}

export function Banana() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <linearGradient id={`ban-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBE08A" />
          <stop offset="1" stopColor="#EFB93F" />
        </linearGradient>
      </defs>
      <path d="M30 40 C 26 70 44 96 86 92 C 92 91 94 86 90 84 C 58 86 42 66 44 42 C 44 36 32 34 30 40 Z" fill={`url(#ban-${id})`} />
      <path d="M36 46 C 36 70 52 86 80 86 C 60 82 48 66 48 46 C 48 42 38 42 36 46 Z" fill="rgba(255,255,255,0.32)" />
      <circle cx="88" cy="88" r="3.4" fill="#C98A3A" />
      <circle cx="31" cy="40" r="3" fill="#C98A3A" />
    </Wrap>
  )
}

export function Pumpkin() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <radialGradient id={`pmp-${id}`} cx="0.42" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#F6BE7E" />
          <stop offset="1" stopColor="#E08B45" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="68" rx="42" ry="34" fill={`url(#pmp-${id})`} />
      <ellipse cx="60" cy="68" rx="26" ry="34" fill="#F1A862" opacity="0.55" />
      <ellipse cx="60" cy="68" rx="12" ry="34" fill="#EC9A50" opacity="0.5" />
      <path d="M60 36 C 60 30 64 26 70 26" stroke="#7FA85B" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="46" cy="52" rx="8" ry="5" fill="rgba(255,255,255,0.4)" transform="rotate(-25 46 52)" />
    </Wrap>
  )
}

export function Raspberry() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <radialGradient id={`rsp-${id}`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#E988A8" />
          <stop offset="1" stopColor="#C8466E" />
        </radialGradient>
      </defs>
      {[
        [60, 44], [50, 54], [70, 54], [44, 66], [60, 66], [76, 66], [52, 78], [68, 78],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9.5" fill={`url(#rsp-${id})`} />
      ))}
      {[[57, 41], [47, 51], [67, 51]].map(([cx, cy], i) => (
        <circle key={`h${i}`} cx={cx} cy={cy} r="2.6" fill="rgba(255,255,255,0.5)" />
      ))}
      <path d="M60 36 l-6 -8 l6 3 l6 -3 Z" fill="#8FB36B" />
    </Wrap>
  )
}

export function Peach() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <radialGradient id={`pch-${id}`} cx="0.38" cy="0.34" r="0.8">
          <stop offset="0" stopColor="#FFD3BE" />
          <stop offset="0.6" stopColor="#F6A98C" />
          <stop offset="1" stopColor="#EC8E78" />
        </radialGradient>
      </defs>
      <path d="M60 30 C 84 30 94 50 94 70 C 94 90 78 100 60 100 C 42 100 26 90 26 70 C 26 50 36 30 60 30 Z" fill={`url(#pch-${id})`} />
      <path d="M60 34 C 60 56 60 78 60 96" stroke="#E0826C" strokeWidth="2.5" fill="none" opacity="0.4" />
      <path d="M60 32 C 70 26 82 28 86 36 C 76 36 68 36 60 40 Z" fill="#9BC06E" />
      <ellipse cx="48" cy="52" rx="9" ry="6" fill="rgba(255,255,255,0.45)" transform="rotate(-28 48 52)" />
    </Wrap>
  )
}

export function Grape() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <radialGradient id={`grp-${id}`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#B79BDB" />
          <stop offset="1" stopColor="#7E5CB0" />
        </radialGradient>
      </defs>
      <path d="M58 32 C 70 26 82 30 82 40" stroke="#8FB36B" strokeWidth="4" fill="none" strokeLinecap="round" />
      {[
        [60, 44], [50, 52], [70, 52], [44, 62], [60, 62], [76, 62], [50, 72], [66, 72], [58, 82],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" fill={`url(#grp-${id})`} />
      ))}
      {[[57, 41], [47, 49]].map(([cx, cy], i) => (
        <circle key={`h${i}`} cx={cx} cy={cy} r="2.4" fill="rgba(255,255,255,0.5)" />
      ))}
    </Wrap>
  )
}

export function Eggplant() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <linearGradient id={`egg-${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#A77FC8" />
          <stop offset="1" stopColor="#73519E" />
        </linearGradient>
      </defs>
      <path d="M58 34 C 86 34 92 64 80 86 C 70 102 46 102 38 84 C 30 66 34 34 58 34 Z" fill={`url(#egg-${id})`} />
      <path d="M58 30 C 58 24 64 22 70 24 C 66 30 70 36 76 36 C 70 40 60 38 58 30 Z" fill="#7FA85B" />
      <ellipse cx="50" cy="56" rx="6" ry="11" fill="rgba(255,255,255,0.32)" transform="rotate(-18 50 56)" />
    </Wrap>
  )
}

export function Broccoli() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <radialGradient id={`brc-${id}`} cx="0.45" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#A6CE7E" />
          <stop offset="1" stopColor="#6E9A4C" />
        </radialGradient>
      </defs>
      <rect x="52" y="66" width="16" height="30" rx="8" fill="#CDE3AE" />
      {[
        [60, 46, 18], [44, 56, 14], [76, 56, 14], [52, 64, 12], [68, 64, 12],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#brc-${id})`} />
      ))}
      <circle cx="54" cy="44" r="3" fill="rgba(255,255,255,0.45)" />
    </Wrap>
  )
}

export function Melon() {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <radialGradient id={`mel-${id}`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#E4F0AE" />
          <stop offset="1" stopColor="#AFCB6E" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="62" r="40" fill={`url(#mel-${id})`} />
      {[-30, -10, 10, 30].map((dx, i) => (
        <path
          key={i}
          d={`M${60 + dx} 24 Q ${60 + dx * 1.6} 62 ${60 + dx} 100`}
          stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" fill="none"
        />
      ))}
      <ellipse cx="47" cy="48" rx="9" ry="6" fill="rgba(255,255,255,0.45)" transform="rotate(-28 47 48)" />
    </Wrap>
  )
}

export function GenericFruit({ color = '#E59BB1' }: ObjectProps) {
  const id = useId()
  return (
    <Wrap>
      <defs>
        <radialGradient id={`gen-${id}`} cx="0.4" cy="0.34" r="0.82">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="0.18" stopColor={color} stopOpacity="0.92" />
          <stop offset="1" stopColor={color} />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="64" rx="38" ry="40" fill={`url(#gen-${id})`} />
      <path d="M60 26 C 64 20 72 20 76 24" stroke="#8FB36B" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="47" cy="50" rx="9" ry="6" fill="rgba(255,255,255,0.5)" transform="rotate(-28 47 50)" />
    </Wrap>
  )
}
