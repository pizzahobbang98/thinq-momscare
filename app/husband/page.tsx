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

type HusbandTab = 'home' | 'status'

export default function HusbandPage() {
  const router = useRouter()
  const [latestDeviceEvent, setLatestDeviceEvent] = useState<DeviceEvent | null>(null)
  const [kickCount, setKickCount] = useState(0)
  const [diaryLogs, setDiaryLogs] = useState<SymptomLog[]>([])
  const [dailyCareCard, setDailyCareCard] = useState<DailyCard | null>(null)
  const [messageText, setMessageText] = useState('')
  const [isMessageLoading, setIsMessageLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<HusbandTab>('home')

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

  const husbandTabs: { id: HusbandTab; label: string }[] = [
    { id: 'home', label: '홈' },
    { id: 'status', label: '아내 상태' },
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <header className="bg-blue-50 px-5 pb-4 pt-5">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mb-3 text-sm text-gray-500 transition hover:text-gray-700"
          >
            ← 홈으로
          </button>
          <h1 className="text-xl font-bold text-gray-900">당신의 관심이 큰 힘이 돼요 💙</h1>
          <p className="mt-2 text-sm text-gray-400">{getTodayLabel()}</p>
        </header>

        <nav className="flex border-b border-gray-100 bg-white px-5">
          {husbandTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 px-5 py-5">
        {activeTab === 'home' && (
          <>
            {dailyCareCard && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold text-gray-900">{dailyCareCard.title}</h2>
                <p className="text-sm leading-relaxed text-gray-500">{dailyCareCard.content}</p>
              </section>
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">최근 증상 기록</h2>
              {diaryLogs.length === 0 ? (
                <p className="text-sm text-gray-500">아직 기록이 없어요</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {diaryLogs.map((log) => (
                    <li key={log.id} className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="mb-1 text-sm text-gray-400">{formatTime(log.created_at)}</p>
                      <p className="text-sm text-gray-700">{log.symptom_text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">아내에게 응원 메시지 💌</h2>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="오늘도 수고했어 ❤️"
                rows={3}
                className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isMessageLoading || !messageText.trim()}
                className="mt-4 w-full rounded-2xl bg-blue-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60"
              >
                {isMessageLoading ? '보내는 중...' : '보내기'}
              </button>
            </section>
          </>
        )}

        {activeTab === 'status' && (
          <>
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">공기청정기 상태</h2>
              <p className="text-center text-2xl font-bold text-gray-900">
                {formatDeviceStatus(latestDeviceEvent)}
              </p>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">오늘 태동 횟수</h2>
              <p className="text-center text-6xl font-bold text-gray-900">{kickCount}</p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
