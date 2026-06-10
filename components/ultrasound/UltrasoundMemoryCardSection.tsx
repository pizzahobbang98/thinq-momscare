'use client'

import Spinner from '@/components/Spinner'
import ExpandIconButton from '@/components/ui/ExpandIconButton'
import UltrasoundCompactGalleryItem from '@/components/ultrasound/UltrasoundCompactGalleryItem'
import UltrasoundMemoryCardView from '@/components/ultrasound/UltrasoundMemoryCardView'
import { ULTRASOUND_DEMO_GALLERY_CARDS } from '@/lib/ultrasound-demo'
import type { UltrasoundAnalyzeResponse, UltrasoundStoredCard } from '@/lib/ultrasound-types'

type UltrasoundMemoryCardSectionProps = {
  currentResult: UltrasoundAnalyzeResponse | null
  savedCards: UltrasoundStoredCard[]
  isLoading: boolean
  onUploadClick: () => void
  onExpand?: () => void
  headerOnly?: boolean
}

export default function UltrasoundMemoryCardSection({
  currentResult,
  savedCards: _savedCards,
  isLoading,
  onUploadClick,
  onExpand,
  headerOnly = false,
}: UltrasoundMemoryCardSectionProps) {
  if (headerOnly) {
    return (
      <section className="w-full overflow-x-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-900">우리 아기 초음파 기록</h2>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
              초음파 사진으로 오늘의 성장 순간을 따뜻하게 남겨요.
            </p>
          </div>
          {onExpand && <ExpandIconButton onClick={onExpand} />}
        </div>
      </section>
    )
  }

  return (
    <section className="w-full overflow-x-hidden rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm sm:p-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">우리 아기 초음파 기록</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          초음파 사진으로 오늘의 성장 순간을 따뜻하게 남겨요.
        </p>
      </div>

      <button
        type="button"
        onClick={onUploadClick}
        disabled={isLoading}
        className="mt-3 min-h-[44px] w-full rounded-xl border border-gray-200 bg-[#FAFAFA] px-4 text-sm font-medium text-gray-700 transition hover:border-rose-200 hover:bg-rose-50/40 disabled:opacity-60"
      >
        {isLoading ? <Spinner text="기록을 준비하는 중..." /> : '초음파 사진 업로드'}
      </button>

      {currentResult?.memoryCard && (
        <div className="mt-3">
          {currentResult.error && (
            <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-700">
              {currentResult.error}
            </p>
          )}
          <UltrasoundMemoryCardView
            card={currentResult.memoryCard}
            imageUrl={currentResult.imagePreviewUrl}
            compact
          />
        </div>
      )}

      <div className="mt-4 border-t border-gray-50 pt-3">
        <h3 className="text-xs font-semibold text-gray-700">초음파 성장 갤러리</h3>
        <p className="mt-0.5 text-[10px] text-gray-400">아래는 참고용 예시 카드예요.</p>
        <div className="mt-2 flex flex-col gap-2">
          {ULTRASOUND_DEMO_GALLERY_CARDS.map((item) => (
            <UltrasoundCompactGalleryItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
