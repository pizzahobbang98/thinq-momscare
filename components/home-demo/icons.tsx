import type { CSSProperties } from 'react'

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function AirIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M4 8h9a3 3 0 1 0-3-3" />
      <path d="M3 12h13a3 3 0 1 1-3 3" />
      <path d="M4 16h7" />
    </svg>
  )
}

export function BulbIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M9.5 18h5" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.8 10.6c.7.6 1.1 1.3 1.2 2.4h5.2c.1-1.1.5-1.8 1.2-2.4A6 6 0 0 0 12 3Z" />
    </svg>
  )
}

export function MonitorIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8.5 20h7M12 16.5V20" />
    </svg>
  )
}

export function FridgeIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M6 10.5h12M9.5 5.5v2.2M9.5 12.8v3" />
    </svg>
  )
}

export function RobotIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  )
}

export function WasherIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="4.5" y="2.5" width="15" height="19" rx="2.5" />
      <circle cx="12" cy="13" r="4.8" />
      <path d="M8 6h.01M11 6h.01" />
    </svg>
  )
}

export function WifiIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg {...base} width={13} height={13} style={style} aria-hidden="true">
      <path d="M4.5 12a10 10 0 0 1 15 0" />
      <path d="M7.5 15a5.5 5.5 0 0 1 9 0" />
      <path d="M12 18.2h.01" />
    </svg>
  )
}
