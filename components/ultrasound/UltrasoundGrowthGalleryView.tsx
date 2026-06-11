'use client'

import UltrasoundCompactGalleryItem from '@/components/ultrasound/UltrasoundCompactGalleryItem'
import type { UltrasoundDemoGalleryCard, UltrasoundStoredCard } from '@/lib/ultrasound-types'

type UltrasoundGrowthGalleryViewProps = {
  demoCards: UltrasoundDemoGalleryCard[]
  savedCards?: UltrasoundStoredCard[]
  showSavedSection?: boolean
}

export default function UltrasoundGrowthGalleryView({
  demoCards,
  savedCards = [],
  showSavedSection = true,
}: UltrasoundGrowthGalleryViewProps) {
  return (
    <div className="space-y-4">
      {showSavedSection && savedCards.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800">내 초음파 기록</h3>
          <div className="mt-2 flex flex-col gap-2">
            {savedCards.map((item) => (
              <UltrasoundCompactGalleryItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-800">초음파 성장 갤러리</h3>
        <p className="mt-0.5 text-xs text-gray-400">참고용 예시 카드예요.</p>
        <div className="mt-2 flex flex-col gap-2">
          {demoCards.map((item) => (
            <UltrasoundCompactGalleryItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
