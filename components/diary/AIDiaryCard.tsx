'use client'

import Spinner from '@/components/Spinner'
import ExpandIconButton from '@/components/ui/ExpandIconButton'
import { normalizeUsedModes } from '@/lib/diary'
import type { DiaryEntry } from '@/lib/supabase'

type AIDiaryCardProps = {
  entry: DiaryEntry | null
  isLoading: boolean
  onGenerate: () => void
  onViewCalendar: () => void
  onExpand?: () => void
  headerOnly?: boolean
}

export default function AIDiaryCard({
  entry,
  isLoading,
  onGenerate,
  onViewCalendar,
  onExpand,
  headerOnly = false,
}: AIDiaryCardProps) {
  const usedModes = entry ? normalizeUsedModes(entry.used_modes) : []
  const preview = entry?.summary ?? entry?.content ?? null

  if (headerOnly) {
    return (
      <section className="min-h-[92px] w-full overflow-x-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-900">오늘의 마음 기록</h2>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
              오늘의 케어와 순간을 다이어리로 모아두었어요.
            </p>
          </div>
          {onExpand && <ExpandIconButton onClick={onExpand} />}
        </div>
      </section>
    )
  }

  return (
    <section className="w-full overflow-x-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">오늘의 마음 기록</h2>
      <p className="mt-2 text-sm text-gray-500">
        오늘의 케어와 순간을 다이어리로 모아두었어요.
      </p>

      {entry ? (
        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-4">
          <p className="text-sm font-semibold text-gray-900">{entry.title}</p>
          <p className="mt-2 line-clamp-3 text-sm italic leading-relaxed text-gray-700">
            {preview}
          </p>
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
          아직 작성된 기록이 없어요. 오늘의 케어가 쌓이면 마음 기록으로 정리해드릴게요.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onViewCalendar}
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
            <Spinner text="오늘의 기록을 정리하고 있어요." />
          ) : (
            '오늘 기록 만들기'
          )}
        </button>
      </div>
    </section>
  )
}
