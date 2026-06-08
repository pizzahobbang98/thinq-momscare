'use client'

import type { FeatureStatusBadge } from '@/lib/features'

export type FeatureButton = {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  loading?: boolean
  disabled?: boolean
}

export type CardIntegrationType = 'thinq' | 'shared' | 'demo' | 'mock' | 'planned'

type FeatureCardProps = {
  emoji: string
  title: string
  subtitle: string
  description: string
  aiMessage: string
  items?: string[]
  deviceBadges?: { label: string; status: FeatureStatusBadge }[]
  subFeatures?: string[]
  buttons: FeatureButton[]
  statusMessage?: string
  theme?: 'rose' | 'blue'
  cardIntegration?: { label: string; type: CardIntegrationType }
  highlighted?: boolean
}

const STATUS_STYLES: Record<FeatureStatusBadge, string> = {
  available: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  demo: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  planned: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  ai: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  shared: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
}

const STATUS_LABELS: Record<FeatureStatusBadge, string> = {
  available: 'ThinQ 실제 연동',
  demo: '시연/Mock',
  planned: '확장 예정',
  ai: 'AI 추천',
  shared: '역할 화면 연동',
}

const CARD_INTEGRATION_STYLES: Record<CardIntegrationType, string> = {
  thinq: 'bg-green-100 text-green-800 ring-1 ring-green-300',
  shared: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
  demo: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  mock: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
  planned: 'bg-gray-100 text-gray-600 ring-1 ring-gray-300',
}

export default function FeatureCard({
  emoji,
  title,
  subtitle,
  description,
  aiMessage,
  items = [],
  deviceBadges = [],
  subFeatures = [],
  buttons,
  statusMessage,
  theme = 'rose',
  cardIntegration,
  highlighted = false,
}: FeatureCardProps) {
  const primaryClass =
    theme === 'rose'
      ? 'bg-rose-500 hover:bg-rose-600'
      : 'bg-blue-500 hover:bg-blue-600'
  const accentClass = theme === 'rose' ? 'text-rose-600' : 'text-blue-600'
  const aiBgClass = theme === 'rose' ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'
  const highlightBorder =
    theme === 'rose' ? 'border-green-300 ring-1 ring-green-100' : 'border-green-300 ring-1 ring-green-100'

  return (
    <section
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        highlighted ? highlightBorder : 'border-gray-100'
      }`}
    >
      {cardIntegration && (
        <div className="mb-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${CARD_INTEGRATION_STYLES[cardIntegration.type]}`}
          >
            {cardIntegration.label}
          </span>
        </div>
      )}

      <div className="mb-3 flex items-start gap-3">
        <span className="text-3xl" aria-hidden="true">
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className={`mt-0.5 text-sm font-medium ${accentClass}`}>{subtitle}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-gray-600">{description}</p>

      <div className={`mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed ${aiBgClass}`}>
        {aiMessage}
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${theme === 'rose' ? 'bg-rose-400' : 'bg-blue-400'}`} />
              {item}
            </li>
          ))}
        </ul>
      )}

      {deviceBadges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {deviceBadges.map((badge) => (
            <span
              key={`${badge.label}-${badge.status}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[badge.status]}`}
            >
              {badge.label} · {STATUS_LABELS[badge.status]}
            </span>
          ))}
        </div>
      )}

      {subFeatures.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {subFeatures.map((feature) => (
            <span
              key={feature}
              className="rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-500"
            >
              {feature}
            </span>
          ))}
        </div>
      )}

      {statusMessage && (
        <p className={`mt-4 rounded-lg px-3 py-2 text-center text-xs ${aiBgClass}`}>
          {statusMessage}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={button.onClick}
            disabled={button.disabled || button.loading}
            className={`w-full rounded-2xl py-3.5 text-sm font-semibold transition disabled:opacity-60 ${
              button.variant === 'secondary'
                ? 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                : `${primaryClass} text-white shadow-sm`
            }`}
          >
            {button.loading ? '처리 중…' : button.label}
          </button>
        ))}
      </div>
    </section>
  )
}
