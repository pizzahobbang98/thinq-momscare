'use client'

import { useEffect, useState } from 'react'
import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'

type DeviceStatus = {
  power: string
  mode: string
}

type DeviceEvent = {
  id: string
  user_id: string
  event_type: string
  triggered_by: string
  device_status: DeviceStatus
  created_at: string
}

type SymptomLog = {
  id: string
  user_id: string
  symptom_text: string
  parsed_category: string
  created_at: string
}

function getTodayLabel() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function getTodayStartISO() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDeviceStatus(event: DeviceEvent | null) {
  if (!event) return '아직 기록이 없어요'

  const { power, mode } = event.device_status
  if (power === 'OFF') return '공기청정기 OFF'

  return `공기청정기 ${power} · ${mode} 모드`
}

function isToday(iso: string) {
  return new Date(iso) >= new Date(getTodayStartISO())
}

export default function HusbandPage() {
  const [latestDeviceEvent, setLatestDeviceEvent] = useState<DeviceEvent | null>(null)
  const [kickCount, setKickCount] = useState(0)
  const [diaryLogs, setDiaryLogs] = useState<SymptomLog[]>([])

  useEffect(() => {
    async function fetchInitialData() {
      const [deviceResult, kickResult, diaryResult] = await Promise.all([
        supabase
          .from('device_events')
          .select('*')
          .eq('user_id', DEMO_WIFE_ID)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('symptom_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', DEMO_WIFE_ID)
          .eq('parsed_category', 'KICK')
          .gte('created_at', getTodayStartISO()),
        supabase
          .from('symptom_logs')
          .select('*')
          .eq('user_id', DEMO_WIFE_ID)
          .eq('parsed_category', 'DIARY')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (deviceResult.error) {
        console.error('공기청정기 상태 조회 실패:', deviceResult.error)
      } else if (deviceResult.data) {
        setLatestDeviceEvent(deviceResult.data as DeviceEvent)
      }

      if (kickResult.error) {
        console.error('태동 횟수 조회 실패:', kickResult.error)
      } else {
        setKickCount(kickResult.count ?? 0)
      }

      if (diaryResult.error) {
        console.error('증상 기록 조회 실패:', diaryResult.error)
      } else {
        setDiaryLogs((diaryResult.data as SymptomLog[]) ?? [])
      }
    }

    fetchInitialData()

    const channel = supabase
      .channel('husband-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_events',
          filter: `user_id=eq.${DEMO_WIFE_ID}`,
        },
        (payload) => {
          setLatestDeviceEvent(payload.new as DeviceEvent)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'symptom_logs',
          filter: `user_id=eq.${DEMO_WIFE_ID}`,
        },
        (payload) => {
          const log = payload.new as SymptomLog

          if (log.parsed_category === 'KICK' && isToday(log.created_at)) {
            setKickCount((prev) => prev + 1)
          }

          if (log.parsed_category === 'DIARY') {
            setDiaryLogs((prev) => [log, ...prev].slice(0, 5))
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime 구독 실패: husband-monitor')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="min-h-full bg-gradient-to-b from-sky-50 via-teal-50 to-cyan-100">
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col gap-5 px-4 py-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-sky-700">아내 상태 모니터링 👨</h1>
          <p className="mt-1 text-sm text-teal-500">{getTodayLabel()}</p>
        </header>

        {/* 카드 1 - 공기청정기 상태 */}
        <section className="rounded-2xl border border-sky-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
          <h2 className="mb-3 text-lg font-semibold text-sky-600">공기청정기 상태</h2>
          <p className="text-center text-xl font-medium text-teal-700">
            {formatDeviceStatus(latestDeviceEvent)}
          </p>
        </section>

        {/* 카드 2 - 오늘 태동 횟수 */}
        <section className="rounded-2xl border border-sky-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
          <h2 className="mb-2 text-lg font-semibold text-sky-600">오늘 태동 횟수</h2>
          <p className="text-center text-5xl font-bold text-cyan-500">{kickCount}</p>
        </section>

        {/* 카드 3 - 최근 증상 기록 */}
        <section className="rounded-2xl border border-sky-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-sky-600">최근 증상 기록</h2>
          {diaryLogs.length === 0 ? (
            <p className="text-center text-sm text-teal-400">아직 기록이 없어요</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {diaryLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl border border-sky-50 bg-sky-50/60 px-4 py-3"
                >
                  <p className="mb-1 text-xs text-teal-400">{formatTime(log.created_at)}</p>
                  <p className="text-sm text-sky-800">{log.symptom_text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
