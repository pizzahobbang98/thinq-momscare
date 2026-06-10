'use client'

import Spinner from '@/components/Spinner'
import type { UltrasoundRecord } from '@/lib/supabase'
import { ULTRASOUND_DISCLAIMER } from '@/lib/pregnancy-fruit'

function formatGalleryDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  })
}

type UltrasoundGalleryCardProps = {
  records: UltrasoundRecord[]
  imageUrls: Record<string, string>
  isLoading: boolean
  playingRecordId: string | null
  isVoiceLoading: boolean
  onUploadClick: () => void
  onViewGallery: () => void
  onPlayBabyVoice: (record: UltrasoundRecord) => void
}

export default function UltrasoundGalleryCard({
  records,
  imageUrls,
  isLoading,
  playingRecordId,
  isVoiceLoading,
  onUploadClick,
  onViewGallery,
  onPlayBabyVoice,
}: UltrasoundGalleryCardProps) {
  const previewRecords = records.slice(0, 3)
  const latestRecord = records[0] ?? null

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-rose-500">ThinQ Mom</p>
      <h2 className="mt-1 text-base font-semibold text-gray-900">초음파 갤러리</h2>
      <p className="mt-2 text-sm text-gray-500">
        초음파 사진을 모아보고, 오늘의 성장 기록을 남겨보세요.
      </p>

      {isLoading ? (
        <div className="mt-4 flex justify-center py-6">
          <Spinner text="갤러리 불러오는 중..." />
        </div>
      ) : previewRecords.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {previewRecords.map((record) => {
              const imageUrl = imageUrls[record.id] ?? record.local_image_url
              return (
                <div
                  key={record.id}
                  className="aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                >
                  {imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageUrl}
                      alt={`${record.fruit_name} 초음파`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg">
                      {record.fruit_emoji}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {latestRecord && (
            <div className="mt-4 rounded-2xl bg-rose-50/70 px-4 py-4">
              <p className="text-xs font-semibold text-rose-500">오늘의 성장 기록</p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                이번 주 아기는 {latestRecord.fruit_name}에 비유할 수 있어요.
              </p>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
                {latestRecord.baby_voice_text ??
                  latestRecord.fruit_description ??
                  latestRecord.description}
              </p>
              {(latestRecord.baby_voice_text || latestRecord.description) && (
                <button
                  type="button"
                  onClick={() => onPlayBabyVoice(latestRecord)}
                  disabled={isVoiceLoading && playingRecordId === latestRecord.id}
                  className="mt-3 min-h-[44px] w-full rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:border-rose-300 disabled:opacity-60"
                >
                  {isVoiceLoading && playingRecordId === latestRecord.id ? (
                    <Spinner text="목소리 준비 중..." />
                  ) : (
                    '아기 목소리로 듣기'
                  )}
                </button>
              )}
              <p className="mt-2 text-xs text-gray-400">{formatGalleryDate(latestRecord.created_at)}</p>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
          아직 초음파 기록이 없어요
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-gray-400">{ULTRASOUND_DISCLAIMER}</p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onUploadClick}
          className="min-h-[44px] w-full rounded-2xl bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
        >
          초음파 사진 올리기
        </button>
        <button
          type="button"
          onClick={onViewGallery}
          className="min-h-[44px] w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-rose-200"
        >
          갤러리 보기
        </button>
      </div>
    </section>
  )
}
