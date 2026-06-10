'use client'

import Spinner from '@/components/Spinner'
import UltrasoundCompactGalleryItem from '@/components/ultrasound/UltrasoundCompactGalleryItem'
import UltrasoundMemoryCardView from '@/components/ultrasound/UltrasoundMemoryCardView'
import { ULTRASOUND_DEMO_GALLERY_CARDS } from '@/lib/ultrasound-demo'
import type { UltrasoundAnalyzeResponse, UltrasoundStoredCard } from '@/lib/ultrasound-types'

type UltrasoundMemoryCardSectionProps = {
  currentResult: UltrasoundAnalyzeResponse | null
  savedCards: UltrasoundStoredCard[]
  isLoading: boolean
  onUploadClick: () => void
}

export default function UltrasoundMemoryCardSection({
  currentResult,
  savedCards,
  isLoading,
  onUploadClick,
}: UltrasoundMemoryCardSectionProps) {
  const previewCards = savedCards.slice(0, 3)

  return (
    <section className="w-full overflow-x-hidden rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm sm:p-4">
      <div>
        <p className="text-[11px] font-medium tracking-wide text-gray-400">부가 기능</p>
        <h2 className="mt-0.5 text-sm font-semibold text-gray-900">초음파 AI 메모리 카드</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          의료 판독이 아닌, 초음파 사진을 성장 기록으로 남기는 기능이에요.
        </p>
      </div>

      <button
        type="button"
        onClick={onUploadClick}
        disabled={isLoading}
        className="mt-3 min-h-[44px] w-full rounded-xl border border-gray-200 bg-[#FAFAFA] px-4 text-sm font-medium text-gray-700 transition hover:border-rose-200 hover:bg-rose-50/40 disabled:opacity-60"
      >
        {isLoading ? <Spinner text="메모리 카드 생성 중..." /> : '초음파 사진 업로드'}
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

      {previewCards.length > 0 && (
        <div className="mt-4 border-t border-gray-50 pt-3">
          <h3 className="text-xs font-semibold text-gray-700">내 성장 기록</h3>
          <div className="mt-2 flex flex-col gap-2">
            {previewCards.map((item) => (
              <UltrasoundCompactGalleryItem key={item.id} item={item} />
            ))}
          </div>
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
