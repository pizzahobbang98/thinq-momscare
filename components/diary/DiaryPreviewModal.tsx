'use client'

import { normalizeUsedModes } from '@/lib/diary'
import type { DiaryEntry } from '@/lib/supabase'

function formatDiaryDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

type DiaryPreviewModalProps = {
  open: boolean
  onClose: () => void
  entry: DiaryEntry | null
}

export default function DiaryPreviewModal({ open, onClose, entry }: DiaryPreviewModalProps) {
  if (!open) return null

  const usedModes = entry ? normalizeUsedModes(entry.used_modes) : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="mx-4 mb-8 flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-xl sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-rose-500">ThinQ Mom</p>
            <h2 className="text-lg font-bold text-gray-900">
              {entry?.title ?? '다이어리'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] text-xl text-gray-400 transition hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {!entry ? (
            <p className="py-8 text-center text-sm text-gray-500">
              아직 작성된 다이어리가 없어요. 오늘의 케어 기록이 쌓이면 하루를 자연스럽게
              정리해드릴게요.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-400">{formatDiaryDate(entry.created_at)}</p>
              {entry.pregnancy_week && (
                <p className="mt-2 text-sm text-gray-500">{entry.pregnancy_week}주차 기록</p>
              )}
              {usedModes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {usedModes.map((mode) => (
                    <span
                      key={mode}
                      className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600"
                    >
                      {mode}
                    </span>
                  ))}
                </div>
              )}
              {entry.summary && (
                <p className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {entry.summary}
                </p>
              )}
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {entry.content}
              </p>
              {entry.is_demo && (
                <p className="mt-4 text-center text-xs text-amber-600">
                  시연용 다이어리로 표시 중이에요.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
