'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'
import { controlAirPurifier, type ThinQCommand } from '@/lib/thinq-mock'

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

type VoiceStatus = 'idle' | 'recording' | 'processing' | 'done'

type VoiceAction = ThinQCommand | 'UNKNOWN'

type VoiceApiResponse = {
  action: VoiceAction
  message: string
  transcript?: string
  error?: string
}

type BabyVoiceResponse = {
  triggered: boolean
  message?: string
  audioBase64?: string
  error?: string
}

const DEVICE_COMMANDS: ThinQCommand[] = ['NAUSEA_MODE', 'SLEEP_MODE', 'AIR_ON', 'AIR_OFF']

type DeviceMode = 'AUTO' | 'TURBO' | 'SLEEP' | 'SAVING' | 'OFF'

const DEVICE_MODES: DeviceMode[] = ['AUTO', 'TURBO', 'SLEEP', 'SAVING', 'OFF']

const MODE_LABELS: Record<DeviceMode, string> = {
  AUTO: '자동',
  TURBO: '터보',
  SLEEP: '취침',
  SAVING: '절전',
  OFF: 'OFF',
}

function getControlCommand(mode: DeviceMode): ThinQCommand {
  if (mode === 'SLEEP') return 'SLEEP_MODE'
  if (mode === 'OFF') return 'AIR_OFF'
  return 'AIR_ON'
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
  const [currentTime, setCurrentTime] = useState('')
  const [latestDeviceEvent, setLatestDeviceEvent] = useState<DeviceEvent | null>(null)
  const [nauseaCount, setNauseaCount] = useState(0)
  const [kickCount, setKickCount] = useState(0)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [selectedMode, setSelectedMode] = useState<DeviceMode | null>(null)
  const [isModeLoading, setIsModeLoading] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceMessage, setVoiceMessage] = useState('')
  const [babyMessage, setBabyMessage] = useState('')
  const [audioBase64, setAudioBase64] = useState('')

  useEffect(() => {
    if (!latestDeviceEvent) return

    const { power, mode } = latestDeviceEvent.device_status

    if (power === 'OFF') {
      setSelectedMode('OFF')
    } else if (DEVICE_MODES.includes(mode as DeviceMode)) {
      setSelectedMode(mode as DeviceMode)
    }
  }, [latestDeviceEvent])

  useEffect(() => {
    const updateTime = () => setCurrentTime(getCurrentTimeLabel())

    updateTime()
    const timer = setInterval(updateTime, 1000)

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

  async function handleVoiceRecord() {
    if (voiceStatus === 'recording' || voiceStatus === 'processing') return

    setVoiceMessage('')
    setBabyMessage('')
    setAudioBase64('')
    setVoiceStatus('recording')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      await new Promise<void>((resolve, reject) => {
        mediaRecorder.onstop = () => resolve()
        mediaRecorder.onerror = () => reject(new Error('녹음 실패'))
        mediaRecorder.start()
        setTimeout(() => mediaRecorder.stop(), 5000)
      })

      stream.getTracks().forEach((track) => track.stop())

      if (chunks.length === 0) {
        throw new Error('녹음된 오디오가 없습니다.')
      }

      setVoiceStatus('processing')

      const blob = new Blob(chunks, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as VoiceApiResponse

      console.log('[hub voice] /api/voice 응답:', data)

      if (!response.ok) {
        throw new Error(data.error ?? '음성 API 요청 실패')
      }

      console.log('[hub voice] transcript 추출:', data.transcript ?? '(없음)')

      if (data.transcript) {
        try {
          console.log('[hub voice] /api/baby-voice 요청:', { transcript: data.transcript })

          const babyResponse = await fetch('/api/baby-voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: data.transcript }),
          })

          const babyData = (await babyResponse.json()) as BabyVoiceResponse

          console.log('[hub voice] /api/baby-voice 응답:', {
            ok: babyResponse.ok,
            triggered: babyData.triggered,
            hasMessage: !!babyData.message,
            hasAudio: !!babyData.audioBase64,
            error: babyData.error,
          })

          if (babyResponse.ok && babyData.triggered && babyData.message && babyData.audioBase64) {
            console.log('[hub voice] 아가 모드 활성화 — state 세팅')
            setBabyMessage(babyData.message)
            setAudioBase64(babyData.audioBase64)
            setVoiceMessage('')
            setVoiceStatus('done')
            return
          }

          if (babyResponse.ok && babyData.triggered) {
            console.warn('[hub voice] triggered=true 이지만 message/audioBase64 누락 — 일반 voice 흐름으로 폴백')
          } else if (babyResponse.ok) {
            console.log('[hub voice] triggered=false — 일반 voice 흐름으로 진행')
          }

          if (!babyResponse.ok) {
            console.error('태명 호출 실패:', babyData.error)
          }
        } catch (babyError) {
          console.error('태명 호출 요청 실패:', babyError)
        }
      } else {
        console.log('[hub voice] transcript 없음 — baby-voice 호출 생략')
      }

      console.log('[hub voice] 일반 voice 메시지 표시:', data.message)
      setBabyMessage('')
      setAudioBase64('')
      setVoiceMessage(data.message)
      setVoiceStatus('done')

      if (DEVICE_COMMANDS.includes(data.action as ThinQCommand)) {
        const command = data.action as ThinQCommand
        const result = await controlAirPurifier(command)

        const { error } = await supabase.from('device_events').insert({
          user_id: DEMO_WIFE_ID,
          event_type: command,
          triggered_by: 'VOICE',
          device_status: result.deviceStatus,
        })

        if (error) throw error
      }
    } catch (error) {
      console.error('음성 트리거 실패:', error)
      setBabyMessage('')
      setAudioBase64('')
      setVoiceMessage('음성 처리에 실패했어요. 다시 시도해 주세요.')
      setVoiceStatus('done')
    }
  }

  function handlePlayBabyVoice() {
    if (!audioBase64) return

    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`)
    audio.play().catch((error) => {
      console.error('아가 음성 재생 실패:', error)
    })
  }

  async function handleModeSelect(mode: DeviceMode) {
    if (isModeLoading) return

    setIsModeLoading(true)

    try {
      const command = getControlCommand(mode)
      const result = await controlAirPurifier(command)

      const device_status = {
        power: mode === 'OFF' ? 'OFF' : 'ON',
        mode,
        pm25: result.deviceStatus.pm25,
      }

      const { error } = await supabase.from('device_events').insert({
        user_id: DEMO_WIFE_ID,
        event_type: mode,
        triggered_by: 'APP',
        device_status,
      })

      if (error) throw error

      setSelectedMode(mode)
    } catch (error) {
      console.error(`공기청정기 모드 ${mode} 실패:`, error)
    } finally {
      setIsModeLoading(false)
    }
  }

  const deviceStatus = latestDeviceEvent?.device_status
  const isPowerOn = deviceStatus?.power === 'ON'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-100 to-gray-100 text-gray-800">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <header className="relative mb-8 border-b-2 border-blue-400 pb-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="absolute left-0 top-0 text-xs text-gray-500 transition hover:text-gray-700"
          >
            ← 홈으로
          </button>
          <h1 className="text-3xl font-bold text-gray-900">ThinQ ON 허브 🖥️</h1>
          <p className="mt-2 text-sm text-gray-500">
            {getTodayLabel()}
            {currentTime && ` · ${currentTime}`}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 왼쪽 컬럼 */}
          <div className="flex flex-col gap-6">
            {/* 카드 1 - 공기청정기 현재 상태 */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">공기청정기 현재 상태</h2>
              {deviceStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        isPowerOn
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      {deviceStatus.power}
                    </span>
                    <span className="text-gray-700">모드: {deviceStatus.mode}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    PM2.5{' '}
                    <span className="text-blue-600">
                      {deviceStatus.pm25 ?? '-'}
                    </span>
                    <span className="ml-1 text-sm font-normal text-gray-500">μg/m³</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">아직 기록이 없어요</p>
              )}
            </section>

            {/* 카드 2 - 오늘 통계 */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">오늘 통계</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <p className="mb-1 text-xs text-gray-500">입덧 모드 발동</p>
                  <p className="text-4xl font-bold text-blue-600">{nauseaCount}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <p className="mb-1 text-xs text-gray-500">태동 횟수</p>
                  <p className="text-4xl font-bold text-blue-600">{kickCount}</p>
                </div>
              </div>
            </section>
          </div>

          {/* 오른쪽 컬럼 */}
          <div className="flex flex-col gap-6">
            {/* 카드 3 - 실시간 이벤트 피드 */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">실시간 이벤트 피드</h2>
              {feed.length === 0 ? (
                <p className="text-center text-sm text-gray-500">아직 이벤트가 없어요</p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {feed.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <span className="shrink-0 font-mono text-xs text-gray-500">
                        {formatTime(item.created_at)}
                      </span>
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 카드 4 - 수동 기기 제어 */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">수동 기기 제어</h2>
              <p className="mb-4 text-sm text-gray-500">
                현재 모드:{' '}
                <span className="font-medium text-blue-600">
                  {selectedMode ? MODE_LABELS[selectedMode] : '선택 안 됨'}
                </span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEVICE_MODES.map((mode) => {
                  const isSelected = selectedMode === mode
                  const isOff = mode === 'OFF'

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleModeSelect(mode)}
                      disabled={isModeLoading}
                      className={`rounded-lg border py-2.5 text-sm font-medium transition disabled:opacity-60 ${
                        isSelected
                          ? isOff
                            ? 'border-gray-300 bg-gray-300 text-gray-700'
                            : 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {MODE_LABELS[mode]}
                    </button>
                  )
                })}
              </div>
              {isModeLoading && (
                <p className="mt-3 text-center text-xs text-gray-500">처리 중...</p>
              )}
            </section>
          </div>
        </div>

        {/* 카드 5 - 음성 트리거 */}
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">음성 트리거</h2>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleVoiceRecord}
              disabled={voiceStatus === 'recording' || voiceStatus === 'processing'}
              className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition disabled:cursor-not-allowed disabled:opacity-60 ${
                voiceStatus === 'recording'
                  ? 'animate-pulse bg-red-500 text-white'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              🎤
            </button>
            {voiceStatus === 'recording' && (
              <p className="text-sm text-red-500">🎤 듣고 있어요...</p>
            )}
            {voiceStatus === 'processing' && (
              <p className="text-sm text-blue-600">🤔 분석 중...</p>
            )}
            {voiceStatus === 'done' && babyMessage && (
              <div className="flex w-full flex-col items-center gap-2">
                <p className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-700">
                  👶 아가: {babyMessage}
                </p>
                {babyMessage && audioBase64 && (
                  <button
                    type="button"
                    onClick={handlePlayBabyVoice}
                    className="rounded-md border border-blue-200 bg-blue-500 px-3 py-1.5 text-xs text-white transition hover:bg-blue-600"
                  >
                    🔊 아가 목소리 듣기
                  </button>
                )}
              </div>
            )}
            {voiceStatus === 'done' && voiceMessage && !babyMessage && (
              <p className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-700">
                {voiceMessage}
              </p>
            )}
            {voiceStatus === 'idle' && (
              <p className="text-xs text-gray-500">마이크 버튼을 눌러 5초간 말씀해 주세요</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
