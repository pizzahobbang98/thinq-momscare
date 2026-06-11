'use client'

import BabyStageIllustration, { getStageCardTheme } from '@/components/pregnancy/BabyStageIllustration'
import {
  buildPregnancyJourneyView,
  resolvePregnancyJourneyInput,
  type PregnancyJourneyView,
} from '@/lib/pregnancy'

type PregnancyJourneyCardProps = {
  week?: number | null
  day?: number | null
  nickname?: string | null
  compact?: boolean
  className?: string
}

function JourneyCardContent({
  journey,
  compact,
}: {
  journey: PregnancyJourneyView
  compact?: boolean
}) {
  const theme = getStageCardTheme(journey.stage)

  return (
    <section
      className={`overflow-hidden rounded-3xl border shadow-sm ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      }`}
      style={{
        background: theme.background,
        borderColor: theme.border,
      }}
    >
      <div className={`flex ${compact ? 'gap-3' : 'gap-4 sm:gap-5'}`}>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-wide text-gray-400">오늘의 임신 여정</p>
          <h2
            className={`mt-1 font-bold text-gray-900 ${
              compact ? 'text-base leading-snug' : 'text-lg leading-snug sm:text-xl'
            }`}
          >
            {journey.title}
          </h2>
          <p
            className={`mt-2 font-semibold text-gray-800 ${
              compact ? 'text-sm' : 'text-base'
            }`}
          >
            {journey.progressLabel}
          </p>
          <p className={`mt-1 text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
            {journey.remainingLabel}
          </p>
          <p
            className={`mt-3 leading-relaxed text-gray-600 ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            {journey.stageMessage}
          </p>
        </div>

        <BabyStageIllustration
          stage={journey.stage}
          className={compact ? 'h-20 w-20' : 'h-24 w-24 sm:h-28 sm:w-28'}
        />
      </div>

      <div
        className={`mt-4 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 backdrop-blur-sm ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        <p className="text-[11px] font-medium" style={{ color: theme.accent }}>
          {journey.stageSubtitle}
        </p>
        <p className="mt-1 leading-relaxed text-gray-600">{journey.bubbleMessage}</p>
      </div>
    </section>
  )
}

export default function PregnancyJourneyCard({
  week,
  day,
  nickname,
  compact = false,
  className = '',
}: PregnancyJourneyCardProps) {
  const journey = resolvePregnancyJourneyInput({ week, day, nickname })

  return (
    <div className={className}>
      <JourneyCardContent journey={journey} compact={compact} />
    </div>
  )
}

export function buildPregnancyJourneyCardView(
  week?: number | null,
  day?: number | null,
  nickname?: string | null,
) {
  return buildPregnancyJourneyView(
    week ?? 0,
    day ?? 0,
    nickname?.trim() || '',
  )
}
