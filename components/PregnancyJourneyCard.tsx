'use client'

import { useState } from 'react'
import BabyStageIllustration, { getStageCardTheme } from '@/components/pregnancy/BabyStageIllustration'
import { pickRandomEncouragementMessage } from '@/lib/baby-encouragement-messages'
import { resolvePregnancyJourneyInput, type PregnancyJourneyView } from '@/lib/pregnancy'

type PregnancyJourneyCardProps = {
  week?: number | null
  nickname?: string | null
  /** 홈 요약: 타이틀 + 큰 일러스트 */
  compact?: boolean
  className?: string
}

function BabySpeechBubble({
  message,
  borderColor,
}: {
  message: string
  borderColor: string
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-1 z-20 sm:inset-x-4">
      <div
        className="relative mx-auto max-w-[320px] rounded-2xl border bg-white/95 px-4 py-3 text-center shadow-md backdrop-blur-sm"
        style={{ borderColor }}
      >
        <p className="text-sm leading-relaxed text-gray-800">{message}</p>
        <span
          className="absolute left-1/2 top-full -translate-x-1/2 border-x-[11px] border-t-[13px] border-x-transparent border-t-white/95"
          aria-hidden
        />
        <span
          className="absolute left-1/2 top-[calc(100%-1px)] -translate-x-1/2 border-x-[12px] border-t-[14px] border-x-transparent opacity-40"
          style={{ borderTopColor: borderColor }}
          aria-hidden
        />
      </div>
    </div>
  )
}

function PregnancyJourneyCompactCard({ journey }: { journey: PregnancyJourneyView }) {
  const theme = getStageCardTheme(journey.stage)
  const [encouragementMessage, setEncouragementMessage] = useState<string | null>(null)

  function handleBabyClick() {
    setEncouragementMessage((current) => pickRandomEncouragementMessage(current))
  }

  return (
    <section
      className="relative flex min-h-[360px] flex-col overflow-hidden rounded-3xl border shadow-sm sm:min-h-[400px]"
      style={{
        background: theme.background,
        borderColor: theme.border,
      }}
    >
      <h2 className="shrink-0 px-4 pb-1 pt-4 text-lg font-bold leading-snug text-gray-900 sm:px-5 sm:pt-5 sm:text-xl">
        {journey.title}
      </h2>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-end px-2 pb-3 pt-2 sm:px-3 sm:pb-4">
        {encouragementMessage && (
          <BabySpeechBubble message={encouragementMessage} borderColor={theme.border} />
        )}

        <button
          type="button"
          onClick={handleBabyClick}
          className="relative z-10 flex aspect-square w-[80%] max-w-[340px] min-w-[220px] items-center justify-center rounded-full transition hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
          aria-label="아기의 한마디 듣기"
        >
          <BabyStageIllustration stage={journey.stage} className="h-full w-full" />
        </button>
      </div>
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
  className = '',
}: PregnancyJourneyCardProps) {
  const journey = resolvePregnancyJourneyInput({ week, nickname })

  if (compact) {
    return (
      <div className={className}>
        <PregnancyJourneyCompactCard journey={journey} />
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
}: Omit<PregnancyJourneyCardProps, 'compact'>) {
  const journey = resolvePregnancyJourneyInput({ week, nickname })

  return (
    <div className={className}>
      <PregnancyJourneyDetail journey={journey} />
    </div>
  )
}
