'use client'

import Spinner from '@/components/Spinner'
import { normalizeUsedModes } from '@/lib/diary'
import type { DiaryEntry } from '@/lib/supabase'

function formatDiaryDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

type AIDiaryCardProps = {
  entry: DiaryEntry | null
  isLoading: boolean
  onGenerate: () => void
  onView: () => void
}

export default function AIDiaryCard({
  entry,
  isLoading,
  onGenerate,
  onView,
}: AIDiaryCardProps) {
  const usedModes = entry ? normalizeUsedModes(entry.used_modes) : []
  const preview = entry?.summary ?? entry?.content ?? null

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-rose-500">ThinQ Mom</p>
      <h2 className="mt-1 text-base font-semibold text-gray-900">AI 자동 다이어리</h2>
      <p className="mt-2 text-sm text-gray-500">
        오늘의 대화, 컨디션, 가전 실행 기록을 바탕으로 하루를 다이어리처럼 정리해드려요.
      </p>

      {entry ? (
        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-4">
          <p className="text-sm font-semibold text-gray-900">{entry.title}</p>
          <p className="mt-2 line-clamp-3 text-sm italic leading-relaxed text-gray-700">
            {preview}
          </p>
          <p className="mt-3 text-xs text-gray-400">{formatDiaryDate(entry.created_at)}</p>
          {usedModes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {usedModes.slice(0, 4).map((mode) => (
                <span
                  key={mode}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-rose-600"
                >
                  {mode}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-gray-50 px-4 py-4 text-sm leading-relaxed text-gray-500">
          아직 작성된 다이어리가 없어요. 오늘의 케어 기록이 쌓이면 하루를 자연스럽게
          정리해드릴게요.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onView}
          className="min-h-[44px] w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-rose-200"
        >
          다이어리 보기
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="min-h-[44px] w-full rounded-2xl bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
        >
          {isLoading ? (
            <Spinner text="오늘의 기록을 다이어리로 정리하고 있어요." />
          ) : (
            '오늘 다이어리 생성하기'
          )}
        </button>
      </div>
    </section>
  )
}
