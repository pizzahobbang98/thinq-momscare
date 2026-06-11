'use client'

import type { UltrasoundDemoGalleryCard, UltrasoundStoredCard } from '@/lib/ultrasound-types'

type GalleryItem = (UltrasoundStoredCard | UltrasoundDemoGalleryCard) & {
  isExample?: boolean
}

type UltrasoundCompactGalleryItemProps = {
  item: GalleryItem
}

export default function UltrasoundCompactGalleryItem({ item }: UltrasoundCompactGalleryItemProps) {
  const recordLabel = 'recordLabel' in item ? item.recordLabel : undefined
  const isExample = item.isExample === true

  return (
    <article className="flex gap-2.5 overflow-hidden rounded-xl border border-gray-100 bg-[#FAFAFA] p-2">
      <div className="h-14 w-[72px] shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.title}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <p className="line-clamp-2 flex-1 text-[11px] font-medium leading-snug text-gray-700">
            {item.title}
          </p>
          {isExample && (
            <span className="shrink-0 rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
              예시
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-gray-400">{item.sceneLabel}</p>
        {recordLabel && (
          <p className="mt-0.5 text-[10px] text-gray-500">{recordLabel}</p>
        )}
      </div>
    </article>
  )
}
