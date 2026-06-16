'use client'

import { useMemo, useState } from 'react'
import type {
  DiaryCalendarEntry,
  DiaryCalendarEntryKind,
} from '@/lib/diary-calendar-types'

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ date: string; day: number } | null> = []

  for (let i = 0; i < startOffset; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ date, day })
  }

  return cells
}

type DiaryCalendarModalProps = {
  open: boolean
  onClose: () => void
  entries: DiaryCalendarEntry[]
  status?: 'preparing' | 'pregnant'
  onGenerate?: () => void
  isGenerating?: boolean
}

const ENTRY_KIND_STYLES: Record<
  DiaryCalendarEntryKind,
  { label: string; dotClass: string; badgeClass: string }
> = {
  diary: {
    label: '다이어리',
    dotClass: 'bg-rose-400',
    badgeClass: 'bg-rose-50 text-rose-600',
  },
  checkup: {
    label: '검사',
    dotClass: 'bg-sky-500',
    badgeClass: 'bg-sky-50 text-sky-700',
  },
  preparation: {
    label: '준비',
    dotClass: 'bg-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700',
  },
}

function getEntryKind(entry: DiaryCalendarEntry): DiaryCalendarEntryKind {
  return entry.kind ?? 'diary'
}

export default function DiaryCalendarModal({
  open,
  onClose,
  entries,
  status,
  onGenerate,
  isGenerating = false,
}: DiaryCalendarModalProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(today))

  const entryMap = useMemo(() => {
    const map = new Map<string, DiaryCalendarEntry[]>()
    for (const entry of entries) {
      const dateEntries = map.get(entry.date) ?? []
      dateEntries.push(entry)
      map.set(entry.date, dateEntries)
    }
    return map
  }, [entries])

  const monthCells = useMemo(
    () => buildMonthDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  )

  const selectedEntries = entryMap.get(selectedDate) ?? []

  if (!open) return null

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  return (
    <div
      className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[82vh] w-full max-w-[430px] flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-rose-500">
              {status === 'preparing' ? '임신 준비중 기록' : status === 'pregnant' ? '임신중 기록' : '오늘의 마음 기록'}
            </p>
            <h2 className="text-lg font-bold text-gray-900">
              {status === 'preparing' ? '준비 기록 캘린더' : status === 'pregnant' ? 'AI 다이어리 캘린더' : '다이어리 캘린더'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="no-scrollbar overflow-y-auto px-5 py-4">
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="mb-4 min-h-12 w-full rounded-full bg-gradient-to-r from-[#a50034] to-[#e0577f] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(165,0,52,0.25)] transition-all duration-300 hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            >
              {isGenerating ? 'AI가 오늘 기록을 정리하는 중...' : 'AI 자동 일기 만들기'}
            </button>
          )}
          <div className="flex flex-wrap justify-start gap-3">
            {(Object.keys(ENTRY_KIND_STYLES) as DiaryCalendarEntryKind[]).map((kind) => (
              <span key={kind} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className={`h-2 w-2 rounded-full ${ENTRY_KIND_STYLES[kind].dotClass}`} />
                {ENTRY_KIND_STYLES[kind].label}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex h-11 min-w-[44px] items-center justify-center rounded-full px-3 text-sm text-gray-500 hover:bg-gray-50"
            >
              ‹
            </button>
            <p className="text-sm font-semibold text-gray-900">
              {viewYear}년 {viewMonth + 1}월
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="flex h-11 min-w-[44px] items-center justify-center rounded-full px-3 text-sm text-gray-500 hover:bg-gray-50"
            >
              ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400">
            {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {monthCells.map((cell, index) => {
              if (!cell) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const dateEntries = entryMap.get(cell.date) ?? []
              const entryKinds = Array.from(new Set(dateEntries.map(getEntryKind)))
              const hasEntry = dateEntries.length > 0
              const isSelected = selectedDate === cell.date

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  className={`relative flex aspect-square min-h-[40px] flex-col items-center justify-center rounded-xl text-xs transition ${
                    isSelected
                      ? 'bg-rose-500 font-semibold text-white'
                      : hasEntry
                        ? 'bg-rose-50 font-medium text-rose-600 hover:bg-rose-100'
                        : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cell.day}
                  {hasEntry && (
                    <span className="absolute bottom-1 flex gap-0.5">
                      {entryKinds.map((kind) => (
                        <span
                          key={kind}
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected ? 'bg-white' : ENTRY_KIND_STYLES[kind].dotClass
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-5 space-y-3">
            {selectedEntries.length > 0 ? (
              selectedEntries.map((entry, index) => {
                const kind = getEntryKind(entry)
                const style = ENTRY_KIND_STYLES[kind]

                return (
                  <article key={`${entry.date}-${entry.title}-${index}`} className="rounded-2xl bg-gray-50 px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.badgeClass}`}>
                      {style.label}
                    </span>
                    <p className="mt-3 text-sm font-semibold text-gray-900">{entry.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700">{entry.content}</p>
                    {entry.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-100"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })
            ) : (
              <div className="rounded-2xl bg-gray-50 px-4 py-4">
                <p className="text-sm leading-relaxed text-gray-500">
                  이 날짜에는 아직 기록이 없어요. 케어와 순간이 쌓이면 따뜻한 기록으로 채워질 거예요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
