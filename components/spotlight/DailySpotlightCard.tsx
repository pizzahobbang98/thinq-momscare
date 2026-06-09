'use client'

import { useEffect } from 'react'

export interface DailySpotlightCardProps {
  open: boolean
  closing?: boolean
  role: 'wife' | 'husband'
  title: string
  headline: string
  description: string
  modeLabels?: string[]
  actions?: {
    label: string
    onClick?: () => void
  }[]
  primaryLabel: string
  secondaryLabel?: string
  onClose: () => void
  onPrimary: () => void
}

const ROLE_STYLES = {
  wife: {
    panel: 'from-rose-50 to-white',
    badge: 'bg-rose-100 text-rose-700',
    accent: 'text-rose-600',
    primary: 'bg-rose-500 hover:bg-rose-600 focus:ring-rose-200',
    secondary: 'bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-100',
    action: 'border-rose-100 bg-white text-rose-700 hover:bg-rose-50',
    close: 'hover:bg-rose-50 hover:text-rose-600',
  },
  husband: {
    panel: 'from-blue-50 to-white',
    badge: 'bg-blue-100 text-blue-700',
    accent: 'text-blue-600',
    primary: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-200',
    secondary: 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-100',
    action: 'border-blue-100 bg-white text-blue-700 hover:bg-blue-50',
    close: 'hover:bg-blue-50 hover:text-blue-600',
  },
} as const

export default function DailySpotlightCard({
  open,
  closing = false,
  role,
  title,
  headline,
  description,
  modeLabels = [],
  actions = [],
  primaryLabel,
  secondaryLabel,
  onClose,
  onPrimary,
}: DailySpotlightCardProps) {
  const styles = ROLE_STYLES[role]

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-6 backdrop-blur-sm sm:items-center sm:pb-6"
      role="presentation"
      onClick={onClose}
      style={{ animation: `${closing ? 'dailySpotlightBackdropOut' : 'dailySpotlightBackdrop'} 180ms ease-out forwards` }}
    >
      <style>
        {`
          @keyframes dailySpotlightBackdrop {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes dailySpotlightBackdropOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }

          @keyframes dailySpotlightCard {
            from {
              opacity: 0;
              transform: translateY(16px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes dailySpotlightCardOut {
            from {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            to {
              opacity: 0;
              transform: translateY(12px) scale(0.97);
            }
          }
        `}
      </style>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-spotlight-title"
        aria-describedby="daily-spotlight-description"
        onClick={(event) => event.stopPropagation()}
        className={`w-[calc(100%-32px)] max-w-[390px] rounded-[28px] bg-gradient-to-b ${styles.panel} p-5 shadow-2xl`}
        style={{ animation: `${closing ? 'dailySpotlightCardOut' : 'dailySpotlightCard'} 220ms ease-out forwards` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${styles.accent}`}>{title}</p>
            <h2
              id="daily-spotlight-title"
              className="mt-3 text-[22px] font-bold leading-tight tracking-[-0.02em] text-gray-900"
            >
              {headline}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-gray-400 transition ${styles.close}`}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {modeLabels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {modeLabels.map((label) => (
              <span
                key={label}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        <p
          id="daily-spotlight-description"
          className="mt-5 text-[15px] leading-relaxed text-gray-700"
        >
          {description}
        </p>

        {actions.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`min-h-[44px] rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-sm transition disabled:opacity-60 ${styles.action}`}
                disabled={!action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onPrimary}
            className={`min-h-[44px] rounded-2xl px-4 py-3 text-base font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4 ${styles.primary}`}
          >
            {primaryLabel}
          </button>

          {secondaryLabel && (
            <button
              type="button"
              onClick={onClose}
              className={`min-h-[44px] rounded-2xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-4 ${styles.secondary}`}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
