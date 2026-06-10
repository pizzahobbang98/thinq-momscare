'use client'

import { useMemo, useState } from 'react'
import type { DiaryCalendarEntry } from '@/lib/diary-calendar-types'

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
}

export default function DiaryCalendarModal({ open, onClose, entries }: DiaryCalendarModalProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(today))

  const entryMap = useMemo(() => {
    const map = new Map<string, DiaryCalendarEntry>()
    for (const entry of entries) {
      map.set(entry.date, entry)
    }
    return map
  }, [entries])

  const monthCells = useMemo(
    () => buildMonthDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  )

  const selectedEntry = entryMap.get(selectedDate) ?? null

  if (!open) return null

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="mx-4 mb-8 flex max-h-[90vh] w-full max-w-[430px] flex-col overflow-hidden rounded-3xl bg-white shadow-xl sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-rose-500">오늘의 마음 기록</p>
            <h2 className="text-lg font-bold text-gray-900">다이어리 캘린더</h2>
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

        <div className="overflow-y-auto px-5 py-4">
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

          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells.map((cell, index) => {
              if (!cell) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const hasEntry = entryMap.has(cell.date)
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
                  {hasEntry && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose-400" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-4">
            {selectedEntry ? (
              <>
                <p className="text-sm font-semibold text-gray-900">{selectedEntry.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{selectedEntry.content}</p>
                {selectedEntry.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedEntry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-100"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm leading-relaxed text-gray-500">
                이 날짜에는 아직 기록이 없어요. 케어와 순간이 쌓이면 따뜻한 기록으로 채워질 거예요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
