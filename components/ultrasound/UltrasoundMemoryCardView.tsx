'use client'

import PregnancyFruitImage from '@/components/ultrasound/PregnancyFruitImage'
import { ULTRASOUND_DISCLAIMER } from '@/lib/pregnancy-fruit'
import type { UltrasoundMemoryCardData } from '@/lib/ultrasound-types'

type UltrasoundMemoryCardViewProps = {
  card: UltrasoundMemoryCardData
  imageUrl?: string | null
  pregnancyWeek?: number | null
  fruitName?: string | null
  compact?: boolean
}

export default function UltrasoundMemoryCardView({
  card,
  imageUrl,
  pregnancyWeek,
  fruitName,
  compact = false,
}: UltrasoundMemoryCardViewProps) {
  const showFruitImage = imageUrl && pregnancyWeek && fruitName

  return (
    <div className={`rounded-2xl border border-gray-100 bg-[#FAFAFA] ${compact ? 'p-3' : 'p-4'}`}>
      {imageUrl && (
        <div className={`mb-3 grid gap-2.5 ${showFruitImage ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <figure className="min-w-0">
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={card.title} className="h-full w-full object-contain" />
            </div>
            {showFruitImage && (
              <figcaption className="mt-1.5 text-center text-[11px] font-medium text-gray-500">
                아기 사진
              </figcaption>
            )}
          </figure>

          {showFruitImage && (
            <figure className="min-w-0">
              <PregnancyFruitImage
                pregnancyWeek={pregnancyWeek}
                fruitName={fruitName}
                className="aspect-[4/3] w-full rounded-xl"
              />
              <figcaption className="mt-1.5 text-center text-[11px] font-semibold text-[#a14f62]">
                {fruitName}
              </figcaption>
            </figure>
          )}
        </div>
      )}

      <p className="text-sm font-semibold text-gray-900">{card.title}</p>

      <dl className="mt-3 space-y-2.5 text-sm">
        <div>
          <dt className="text-xs font-medium text-gray-400">오늘의 장면</dt>
          <dd className="mt-0.5 font-medium text-gray-700">{card.sceneLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400">기록 상태</dt>
          <dd className="mt-0.5 font-semibold text-gray-800">{card.recordLabel}</dd>
          <dd className="mt-1 text-xs leading-relaxed text-gray-600">{card.recordNote}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400">오늘의 성장 비유</dt>
          <dd className="mt-0.5 text-gray-700">{card.growthText}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400">자동 태그</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-100"
              >
                {tag}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400">아기 메시지</dt>
          <dd className="mt-1 rounded-xl bg-white px-3 py-2 text-gray-600">{card.babyVoiceText}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400">AI 다이어리 문장</dt>
          <dd className="mt-1 text-gray-600">{card.diarySnippet}</dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">{ULTRASOUND_DISCLAIMER}</p>
    </div>
  )
}
