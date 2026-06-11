'use client'

import ExpandIconButton from '@/components/ui/ExpandIconButton'
import BabyStageIllustration, { getStageCardTheme } from '@/components/pregnancy/BabyStageIllustration'
import { resolvePregnancyJourneyInput, type PregnancyJourneyView } from '@/lib/pregnancy'

type PregnancyJourneyCardProps = {
  week?: number | null
  nickname?: string | null
  /** 홈 요약: 타이틀 + 큰 일러스트 + 확대 버튼만 */
  compact?: boolean
  onExpand?: () => void
  className?: string
}

function PregnancyJourneyCompactCard({
  journey,
  onExpand,
}: {
  journey: PregnancyJourneyView
  onExpand?: () => void
}) {
  const theme = getStageCardTheme(journey.stage)

  return (
    <section
      className="relative min-h-[168px] overflow-hidden rounded-3xl border px-4 pb-4 pt-5 shadow-sm sm:min-h-[184px] sm:px-5 sm:pb-5 sm:pt-6"
      style={{
        background: theme.background,
        borderColor: theme.border,
      }}
    >
      <h2 className="max-w-[calc(100%-3rem)] text-lg font-bold leading-snug text-gray-900 sm:text-xl">
        {journey.title}
      </h2>

      <div className="pointer-events-none flex justify-center py-2 sm:py-3">
        <BabyStageIllustration
          stage={journey.stage}
          className="h-36 w-36 sm:h-40 sm:w-40"
        />
      </div>

      {onExpand && (
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
          <ExpandIconButton
            onClick={onExpand}
            label="임신 여정 자세히 보기"
          />
        </div>
      )}
    </section>
  )
}

export function PregnancyJourneyDetail({
  journey,
  className = '',
}: {
  journey: PregnancyJourneyView
  className?: string
}) {
  const theme = getStageCardTheme(journey.stage)

  return (
    <section
      className={`overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-6 ${className}`}
      style={{
        background: theme.background,
        borderColor: theme.border,
      }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug text-gray-900">{journey.title}</h2>

          <p className="mt-4 text-base font-semibold text-gray-800">{journey.progressLabel}</p>
          <p className="mt-1 text-sm text-gray-500">{journey.remainingLabel}</p>

          <p className="mt-4 text-sm leading-relaxed text-gray-600">{journey.stageMessage}</p>

          <div className="mt-5 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-medium" style={{ color: theme.accent }}>
              {journey.stageSubtitle}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{journey.bubbleMessage}</p>
          </div>
        </div>

        <div className="flex shrink-0 justify-center sm:justify-end">
          <BabyStageIllustration stage={journey.stage} className="h-28 w-28 sm:h-32 sm:w-32" />
        </div>
      </div>
    </section>
  )
}

export default function PregnancyJourneyCard({
  week,
  nickname,
  compact = false,
  onExpand,
  className = '',
}: PregnancyJourneyCardProps) {
  const journey = resolvePregnancyJourneyInput({ week, nickname })

  if (compact) {
    return (
      <div className={className}>
        <PregnancyJourneyCompactCard journey={journey} onExpand={onExpand} />
      </div>
    )
  }

  return (
    <div className={className}>
      <PregnancyJourneyDetail journey={journey} />
    </div>
  )
}

export function buildPregnancyJourneyCardView(
  week?: number | null,
  nickname?: string | null,
) {
  return resolvePregnancyJourneyInput({ week, nickname })
}

/** 바텀시트·확장 패널용 상세 카드 */
export function PregnancyJourneyCardFull({
  week,
  nickname,
  className = '',
}: Omit<PregnancyJourneyCardProps, 'compact' | 'onExpand'>) {
  const journey = resolvePregnancyJourneyInput({ week, nickname })

  return (
    <div className={className}>
      <PregnancyJourneyDetail journey={journey} />
    </div>
  )
}
