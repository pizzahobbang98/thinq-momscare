'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

type DailyCard = {
  title: string
  content: string
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
  const router = useRouter()
  const [latestDeviceEvent, setLatestDeviceEvent] = useState<DeviceEvent | null>(null)
  const [kickCount, setKickCount] = useState(0)
  const [diaryLogs, setDiaryLogs] = useState<SymptomLog[]>([])
  const [dailyCareCard, setDailyCareCard] = useState<DailyCard | null>(null)
  const [messageText, setMessageText] = useState('')
  const [isMessageLoading, setIsMessageLoading] = useState(false)

  useEffect(() => {
    async function fetchDailyCareCard() {
      const { data, error } = await supabase
        .from('daily_cards')
        .select('title, content')
        .eq('card_date', getTodayDateString())
        .eq('target_role', 'husband')
        .maybeSingle()

      if (error) {
        console.error('오늘의 케어 카드 조회 실패:', error)
        return
      }

      if (data) {
        setDailyCareCard(data as DailyCard)
      }
    }

    fetchDailyCareCard()
  }, [])

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

  async function handleSendMessage() {
    const content = messageText.trim()
    if (!content) return

    setIsMessageLoading(true)

    try {
      const { error } = await supabase.from('messages').insert({
        from_role: 'husband',
        content,
      })

      if (error) throw error

      setMessageText('')
    } catch (error) {
      console.error('응원 메시지 전송 실패:', error)
    } finally {
      setIsMessageLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-sky-50 via-teal-50 to-cyan-100">
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col gap-5 px-4 py-6">
        <header className="relative text-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="absolute left-0 top-0 text-xs text-sky-400 transition hover:text-sky-600"
          >
            ← 홈으로
          </button>
          <h1 className="text-2xl font-bold text-sky-700">아내 상태 모니터링 👨</h1>
          <p className="mt-1 text-sm text-teal-500">{getTodayLabel()}</p>
        </header>

        {dailyCareCard && (
          <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white/80 shadow-sm backdrop-blur-sm">
            <div className="h-1 bg-sky-400" />
            <div className="p-5">
              <h2 className="mb-2 text-base font-semibold text-sky-700">{dailyCareCard.title}</h2>
              <p className="text-sm leading-relaxed text-teal-600">{dailyCareCard.content}</p>
            </div>
          </section>
        )}

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

        {/* 카드 4 - 응원 메시지 */}
        <section className="rounded-2xl border border-sky-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-sky-600">아내에게 응원 메시지 💌</h2>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="오늘도 수고했어 ❤️"
            rows={3}
            className="w-full resize-none rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm text-sky-800 placeholder:text-teal-300 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={isMessageLoading || !messageText.trim()}
            className="mt-3 w-full rounded-xl bg-sky-400 py-3 font-medium text-white transition hover:bg-sky-500 disabled:opacity-60"
          >
            {isMessageLoading ? '보내는 중...' : '보내기'}
          </button>
        </section>
      </div>
    </div>
  )
}
