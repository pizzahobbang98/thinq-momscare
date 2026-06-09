'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'

export type Appointment = {
  id: string
  title: string
  hospital: string | null
  memo: string | null
  appointment_date: string
}

type AppointmentCalendarProps = {
  open?: boolean
  onClose: () => void
  role: 'wife' | 'husband'
  onAppointmentsChange?: () => void
  onUpdate?: () => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function toLocalDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getMonthRange(year: number, month: number) {
  const monthStr = String(month + 1).padStart(2, '0')
  const lastDay = new Date(year, month + 1, 0).getDate()
  return {
    start: `${year}-${monthStr}-01`,
    end: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
  }
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(year, month, 1 - firstDay.getDay())
  const days: Date[] = []

  for (let i = 0; i < 42; i++) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)
    days.push(day)
  }

  return days
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

function formatDetailDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function formatListDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function getDaysUntilAppointment(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const apptDate = new Date(dateStr)
  apptDate.setHours(0, 0, 0, 0)
  return Math.ceil((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function isPastDate(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return target < today
}

function isToday(date: Date) {
  return toLocalDateString(date) === toLocalDateString(new Date())
}

export default function AppointmentCalendar({
  open = true,
  onClose,
  role,
  onAppointmentsChange,
  onUpdate,
}: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newHospital, setNewHospital] = useState('')
  const [newMemo, setNewMemo] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const canEdit = role === 'wife'
  const todayStr = toLocalDateString(new Date())
  const appointmentDateSet = new Set(monthAppointments.map((a) => a.appointment_date))

  function notifyAppointmentsChange() {
    onAppointmentsChange?.()
    onUpdate?.()
  }

  async function fetchMonthAppointments() {
    setIsLoading(true)

    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const { start, end } = getMonthRange(year, month)

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', DEMO_WIFE_ID)
        .gte('appointment_date', start)
        .lte('appointment_date', end)
        .order('appointment_date', { ascending: true })

      if (error) {
        console.error('월별 예약 조회 실패:', error)
        return
      }

      setMonthAppointments((data as Appointment[]) ?? [])
    } catch (error) {
      console.error('월별 예약 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    fetchMonthAppointments()
  }, [currentMonth, open, refreshKey])

  useEffect(() => {
    if (open) return
    setSelectedDate(null)
    setDetailAppointment(null)
    setNewTitle('')
    setNewHospital('')
    setNewMemo('')
    setFormError(null)
    setCurrentMonth(new Date())
  }, [open])

  function handleClose() {
    onClose()
  }

  function handleDateClick(dateStr: string) {
    setSelectedDate(dateStr)
    setFormError(null)
    setNewTitle('')
    setNewHospital('')
    setNewMemo('')
  }

  async function handleAddAppointment() {
    if (!selectedDate || !newTitle.trim()) {
      setFormError('예약명을 입력해 주세요.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      const { error } = await supabase.from('appointments').insert({
        user_id: DEMO_WIFE_ID,
        title: newTitle.trim(),
        hospital: newHospital.trim() || null,
        memo: newMemo.trim() || null,
        appointment_date: selectedDate,
      })

      if (error) throw error

      setNewTitle('')
      setNewHospital('')
      setNewMemo('')
      setRefreshKey((prev) => prev + 1)
      notifyAppointmentsChange()
    } catch (error) {
      console.error('예약 추가 실패:', error)
      setFormError('예약 추가에 실패했어요.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteAppointment(appointment: Appointment) {
    setIsDeleting(true)

    try {
      const { error } = await supabase.from('appointments').delete().eq('id', appointment.id)

      if (error) throw error

      setDetailAppointment(null)
      setRefreshKey((prev) => prev + 1)
      notifyAppointmentsChange()
    } catch (error) {
      console.error('예약 삭제 실패:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!open) return null

  const calendarDays = buildCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth())
  const selectedDateAppointments = selectedDate
    ? monthAppointments.filter((a) => a.appointment_date === selectedDate)
    : []
  const detailDaysLeft = detailAppointment
    ? getDaysUntilAppointment(detailAppointment.appointment_date)
    : null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex justify-center bg-black/50"
        onClick={handleClose}
      >
        <div
          className="relative mx-2 mt-8 flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 text-xl text-gray-400 transition hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>

          <div className="mb-4 flex items-center justify-between pr-8">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
              className="rounded-lg px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100"
            >
              &lt;
            </button>
            <h2 className="text-base font-semibold text-gray-900">
              {formatMonthLabel(currentMonth)}
            </h2>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
              className="rounded-lg px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100"
            >
              &gt;
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day, index) => (
                <div
                  key={day}
                  className={`py-1 text-center text-xs font-medium ${
                    index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-500'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateStr = toLocalDateString(day)
                const inCurrentMonth = day.getMonth() === currentMonth.getMonth()
                const hasAppointment = appointmentDateSet.has(dateStr)
                const isSelected = selectedDate === dateStr
                const isTodayCell = isToday(day)
                const isPast = isPastDate(day)
                const dayOfWeek = day.getDay()

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleDateClick(dateStr)}
                    className={`flex w-full flex-col items-center justify-center text-sm transition ${
                      isTodayCell
                        ? ''
                        : isSelected
                          ? 'rounded-full bg-rose-100'
                          : 'rounded-full hover:bg-gray-50'
                    } ${!inCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <span
                      className={`flex aspect-square w-full items-center justify-center rounded-full ${
                        isTodayCell
                          ? 'bg-blue-500 text-white'
                          : isPast
                            ? 'text-gray-300'
                            : dayOfWeek === 0
                              ? 'text-red-500'
                              : dayOfWeek === 6
                                ? 'text-blue-500'
                                : 'text-gray-800'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {hasAppointment && inCurrentMonth && (
                      <span className="mx-auto mt-0.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
                    )}
                  </button>
                )
              })}
            </div>

            {selectedDate && (
              <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-800">
                  {formatDetailDate(selectedDate)}
                </p>

                {selectedDateAppointments.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedDateAppointments.map((appointment) => (
                      <li key={appointment.id}>
                        <button
                          type="button"
                          onClick={() => setDetailAppointment(appointment)}
                          className="w-full rounded-xl bg-white px-3 py-3 text-left shadow-sm transition hover:border-rose-200"
                        >
                          <p className="font-medium text-gray-900">{appointment.title}</p>
                          {appointment.hospital && (
                            <p className="mt-1 text-xs text-gray-500">{appointment.hospital}</p>
                          )}
                          {appointment.memo && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                              {appointment.memo}
                            </p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : canEdit ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">이 날에 일정 추가</p>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="예약명"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-rose-200 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newHospital}
                      onChange={(e) => setNewHospital(e.target.value)}
                      placeholder="병원명"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-rose-200 focus:outline-none"
                    />
                    <textarea
                      value={newMemo}
                      onChange={(e) => setNewMemo(e.target.value)}
                      placeholder="메모"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-rose-200 focus:outline-none"
                    />
                    {formError && <p className="text-xs text-red-500">{formError}</p>}
                    <button
                      type="button"
                      onClick={handleAddAppointment}
                      disabled={isSaving}
                      className="w-full rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
                    >
                      {isSaving ? '추가 중...' : '추가'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">일정 없는 날이에요</p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">이번 달 일정</h3>
              {isLoading ? (
                <p className="text-sm text-gray-400">불러오는 중...</p>
              ) : monthAppointments.length === 0 ? (
                <p className="text-sm text-gray-500">이번 달 예약이 없어요</p>
              ) : (
                <ul className="space-y-2">
                  {monthAppointments.map((appointment) => (
                    <li key={appointment.id}>
                      <button
                        type="button"
                        onClick={() => {
                          handleDateClick(appointment.appointment_date)
                          setDetailAppointment(appointment)
                        }}
                        className="flex w-full items-start justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-left transition hover:bg-rose-50"
                      >
                        <div>
                          <p className="text-xs text-gray-400">
                            {formatListDate(appointment.appointment_date)}
                          </p>
                          <p className="text-sm font-medium text-gray-900">{appointment.title}</p>
                          {appointment.hospital && (
                            <p className="text-xs text-gray-500">{appointment.hospital}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {detailAppointment && (
        <div
          className="fixed inset-0 z-[60] flex justify-center bg-black/50"
          onClick={() => setDetailAppointment(null)}
        >
          <div
            className="relative mx-4 mt-24 w-full max-w-sm rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-gray-400">
              {formatDetailDate(detailAppointment.appointment_date)}
            </p>
            <h3 className="mt-2 text-xl font-bold text-gray-900">{detailAppointment.title}</h3>
            {detailAppointment.hospital && (
              <p className="mt-3 text-sm text-gray-700">{detailAppointment.hospital}</p>
            )}
            {detailAppointment.memo && (
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{detailAppointment.memo}</p>
            )}
            {detailDaysLeft !== null && detailAppointment.appointment_date >= todayStr && (
              <span
                className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  detailDaysLeft <= 3
                    ? 'bg-red-100 text-red-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                D-{detailDaysLeft}
              </span>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setDetailAppointment(null)}
                className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                닫기
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(detailAppointment)}
                  disabled={isDeleting}
                  className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
