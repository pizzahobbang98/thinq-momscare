'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'
import { controlAirPurifier } from '@/lib/thinq-mock'

type DeviceStatus = {
  power: string
  mode: string
  pm25?: number
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

type FeedItem = {
  id: string
  created_at: string
  label: string
}

function getTodayLabel() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
    second: '2-digit',
  })
}

function isToday(iso: string) {
  return new Date(iso) >= new Date(getTodayStartISO())
}

function deviceEventToFeedItem(event: DeviceEvent): FeedItem {
  const labels: Record<string, string> = {
    NAUSEA_MODE: '🌬️ 입덧 모드 ON',
  }

  return {
    id: `device-${event.id}`,
    created_at: event.created_at,
    label: labels[event.event_type] ?? '📋 이벤트',
  }
}

function symptomLogToFeedItem(log: SymptomLog): FeedItem {
  if (log.parsed_category === 'KICK') {
    return {
      id: `symptom-${log.id}`,
      created_at: log.created_at,
      label: '👶 태동 감지',
    }
  }

  if (log.parsed_category === 'DIARY') {
    return {
      id: `symptom-${log.id}`,
      created_at: log.created_at,
      label: `📝 일기 기록: ${log.symptom_text}`,
    }
  }

  return {
    id: `symptom-${log.id}`,
    created_at: log.created_at,
    label: '📋 이벤트',
  }
}

function mergeFeedItems(deviceEvents: DeviceEvent[], symptomLogs: SymptomLog[]): FeedItem[] {
  const items = [
    ...deviceEvents.map(deviceEventToFeedItem),
    ...symptomLogs.map(symptomLogToFeedItem),
  ]

  return items
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
}

export default function HubPage() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(getCurrentTimeLabel())
  const [latestDeviceEvent, setLatestDeviceEvent] = useState<DeviceEvent | null>(null)
  const [nauseaCount, setNauseaCount] = useState(0)
  const [kickCount, setKickCount] = useState(0)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [isAirOnLoading, setIsAirOnLoading] = useState(false)
  const [isAirOffLoading, setIsAirOffLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeLabel())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function fetchInitialData() {
      const todayStart = getTodayStartISO()

      const [deviceResult, nauseaResult, kickResult, deviceFeedResult, symptomFeedResult] =
        await Promise.all([
          supabase
            .from('device_events')
            .select('*')
            .eq('user_id', DEMO_WIFE_ID)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('device_events')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', DEMO_WIFE_ID)
            .eq('event_type', 'NAUSEA_MODE')
            .gte('created_at', todayStart),
          supabase
            .from('symptom_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', DEMO_WIFE_ID)
            .eq('parsed_category', 'KICK')
            .gte('created_at', todayStart),
          supabase
            .from('device_events')
            .select('*')
            .eq('user_id', DEMO_WIFE_ID)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('symptom_logs')
            .select('*')
            .eq('user_id', DEMO_WIFE_ID)
            .order('created_at', { ascending: false })
            .limit(10),
        ])

      if (deviceResult.error) {
        console.error('공기청정기 상태 조회 실패:', deviceResult.error)
      } else if (deviceResult.data) {
        setLatestDeviceEvent(deviceResult.data as DeviceEvent)
      }

      if (nauseaResult.error) {
        console.error('입덧 모드 횟수 조회 실패:', nauseaResult.error)
      } else {
        setNauseaCount(nauseaResult.count ?? 0)
      }

      if (kickResult.error) {
        console.error('태동 횟수 조회 실패:', kickResult.error)
      } else {
        setKickCount(kickResult.count ?? 0)
      }

      if (deviceFeedResult.error) {
        console.error('이벤트 피드 조회 실패 (device_events):', deviceFeedResult.error)
      }

      if (symptomFeedResult.error) {
        console.error('이벤트 피드 조회 실패 (symptom_logs):', symptomFeedResult.error)
      }

      if (!deviceFeedResult.error && !symptomFeedResult.error) {
        setFeed(
          mergeFeedItems(
            (deviceFeedResult.data as DeviceEvent[]) ?? [],
            (symptomFeedResult.data as SymptomLog[]) ?? [],
          ),
        )
      }
    }

    fetchInitialData()

    const channel = supabase
      .channel('hub-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_events',
          filter: `user_id=eq.${DEMO_WIFE_ID}`,
        },
        (payload) => {
          const event = payload.new as DeviceEvent

          setLatestDeviceEvent(event)

          if (event.event_type === 'NAUSEA_MODE' && isToday(event.created_at)) {
            setNauseaCount((prev) => prev + 1)
          }

          setFeed((prev) => [deviceEventToFeedItem(event), ...prev].slice(0, 10))
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

          setFeed((prev) => [symptomLogToFeedItem(log), ...prev].slice(0, 10))
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime 구독 실패: hub-monitor')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleDeviceControl(command: 'AIR_ON' | 'AIR_OFF') {
    const setLoading = command === 'AIR_ON' ? setIsAirOnLoading : setIsAirOffLoading
    setLoading(true)

    try {
      const result = await controlAirPurifier(command)

      const { error } = await supabase.from('device_events').insert({
        user_id: DEMO_WIFE_ID,
        event_type: command,
        triggered_by: 'APP',
        device_status: result.deviceStatus,
      })

      if (error) throw error
    } catch (error) {
      console.error(`공기청정기 ${command} 실패:`, error)
    } finally {
      setLoading(false)
    }
  }

  const deviceStatus = latestDeviceEvent?.device_status
  const isPowerOn = deviceStatus?.power === 'ON'

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-800 text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <header className="relative mb-8 border-b border-slate-700 pb-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="absolute left-0 top-0 text-xs text-slate-400 transition hover:text-slate-200"
          >
            ← 홈으로
          </button>
          <h1 className="text-3xl font-bold text-slate-100">ThinQ ON 허브 🖥️</h1>
          <p className="mt-2 text-sm text-slate-400">
            {getTodayLabel()} · {currentTime}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 왼쪽 컬럼 */}
          <div className="flex flex-col gap-6">
            {/* 카드 1 - 공기청정기 현재 상태 */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">공기청정기 현재 상태</h2>
              {deviceStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        isPowerOn
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-600/50 text-slate-400'
                      }`}
                    >
                      {deviceStatus.power}
                    </span>
                    <span className="text-slate-300">모드: {deviceStatus.mode}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-100">
                    PM2.5{' '}
                    <span className="text-emerald-400">
                      {deviceStatus.pm25 ?? '-'}
                    </span>
                    <span className="ml-1 text-sm font-normal text-slate-400">μg/m³</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">아직 기록이 없어요</p>
              )}
            </section>

            {/* 카드 2 - 오늘 통계 */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">오늘 통계</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-700/40 p-4 text-center">
                  <p className="mb-1 text-xs text-slate-400">입덧 모드 발동</p>
                  <p className="text-4xl font-bold text-amber-400">{nauseaCount}</p>
                </div>
                <div className="rounded-lg bg-slate-700/40 p-4 text-center">
                  <p className="mb-1 text-xs text-slate-400">태동 횟수</p>
                  <p className="text-4xl font-bold text-cyan-400">{kickCount}</p>
                </div>
              </div>
            </section>
          </div>

          {/* 오른쪽 컬럼 */}
          <div className="flex flex-col gap-6">
            {/* 카드 3 - 실시간 이벤트 피드 */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">실시간 이벤트 피드</h2>
              {feed.length === 0 ? (
                <p className="text-center text-sm text-slate-500">아직 이벤트가 없어요</p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {feed.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-700/30 px-3 py-2"
                    >
                      <span className="shrink-0 font-mono text-xs text-slate-500">
                        {formatTime(item.created_at)}
                      </span>
                      <span className="text-sm text-slate-300">{item.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 카드 4 - 수동 기기 제어 */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">수동 기기 제어</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDeviceControl('AIR_ON')}
                  disabled={isAirOnLoading}
                  className="rounded-lg bg-emerald-600 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  {isAirOnLoading ? '처리 중...' : '공기청정기 ON'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeviceControl('AIR_OFF')}
                  disabled={isAirOffLoading}
                  className="rounded-lg bg-slate-600 py-3 font-medium text-white transition hover:bg-slate-500 disabled:opacity-60"
                >
                  {isAirOffLoading ? '처리 중...' : '공기청정기 OFF'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
