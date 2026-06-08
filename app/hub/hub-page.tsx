'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'
import type { ThinQCommand } from '@/lib/thinq-mock'
import Spinner from '@/components/Spinner'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'

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

type WifeMood = {
  mood: string
  emoji: string
}

type WifeDiary = {
  symptom_text: string
  created_at: string
}

type MoodStyle = {
  bg: string
  border: string
  text: string
}

const MOOD_CARD_STYLES: Record<string, MoodStyle> = {
  '😊': { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-600' },
  '😌': { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-600' },
  '😔': { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-600' },
  '😣': { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-600' },
  '🤒': { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-600' },
}

const DEFAULT_MOOD_STYLE: MoodStyle = {
  bg: 'bg-gray-50',
  border: 'border-gray-300',
  text: 'text-gray-600',
}

function getMoodStyle(emoji?: string): MoodStyle {
  if (!emoji) return DEFAULT_MOOD_STYLE
  return MOOD_CARD_STYLES[emoji] ?? DEFAULT_MOOD_STYLE
}

function getTodayDateOnly() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

type Pm25StatusInfo = {
  label: string
  emoji: string
  textColor: string
  barColor: string
}

function getPm25Status(value: number): Pm25StatusInfo {
  if (value <= 15) {
    return { label: '좋음 🟢', emoji: '🟢', textColor: 'text-green-500', barColor: 'bg-green-500' }
  }
  if (value <= 35) {
    return { label: '보통 🟡', emoji: '🟡', textColor: 'text-yellow-500', barColor: 'bg-yellow-500' }
  }
  if (value <= 75) {
    return { label: '나쁨 🔴', emoji: '🔴', textColor: 'text-red-500', barColor: 'bg-red-500' }
  }
  return { label: '나쁨 🔴', emoji: '🔴', textColor: 'text-red-700', barColor: 'bg-red-700' }
}

type FeedItem = {
  id: string
  created_at: string
  label: string
  triggered_by?: string
  device_status?: { power: string; mode: string; pm25?: number }
  symptom_text?: string
}

type PeriodStats = {
  nauseaMode: number
  sleepMode: number
  kick: number
  voice: number
}

type ExpandedCard =
  | 'wife-status'
  | 'air-purifier'
  | 'today-stats'
  | 'device-control'
  | 'feed'
  | 'weekly-stats'
  | 'briefing'
  | 'voice-trigger'

const EXPANDED_CARD_TITLES: Record<ExpandedCard, string> = {
  'wife-status': '아내 현재 상태',
  'air-purifier': '공기청정기 상태',
  'today-stats': '오늘 기록',
  'device-control': '공기청정기 직접 조절',
  feed: '실시간 이벤트 피드',
  'weekly-stats': '주간/월간 통계',
  briefing: '오늘의 브리핑',
  'voice-trigger': '말로 조절하기',
}

function CardTitleRow({
  title,
  cardId,
  onExpand,
  className = 'mb-4',
}: {
  title: string
  cardId: ExpandedCard
  onExpand: (id: ExpandedCard) => void
  className?: string
}) {
  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onExpand(cardId)
        }}
        className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
        aria-label="확대"
      >
        ⛶
      </button>
    </div>
  )
}

type VoiceStatus = 'idle' | 'recording' | 'processing' | 'done'

type VoiceAction = ThinQCommand | 'SYMPTOM_LOG' | 'UNKNOWN'

type VoiceApiResponse = {
  action: VoiceAction
  message: string
  transcript?: string
  symptom_text?: string | null
  error?: string
}

type BabyVoiceAction = 'NAUSEA_MODE' | 'SLEEP_MODE' | 'AIR_ON' | 'AIR_OFF' | 'NONE'

type BabyVoiceResponse = {
  triggered: boolean
  message?: string
  audioBase64?: string
  action?: BabyVoiceAction
  error?: string
}

const DEVICE_COMMANDS: ThinQCommand[] = ['NAUSEA_MODE', 'SLEEP_MODE', 'AIR_ON', 'AIR_OFF']

type DeviceMode = 'AUTO' | 'TURBO' | 'SLEEP' | 'SAVING' | 'OFF'

const DEVICE_MODES: DeviceMode[] = ['AUTO', 'TURBO', 'SLEEP', 'SAVING', 'OFF']

const MODE_LABELS: Record<DeviceMode, string> = {
  AUTO: '자동',
  TURBO: '강력',
  SLEEP: '수면',
  SAVING: '절전',
  OFF: '끄기',
}

const MODE_API_LABELS: Record<DeviceMode, string> = {
  AUTO: 'windStrength AUTO',
  TURBO: 'windStrength POWER',
  SLEEP: 'jobMode SLEEP',
  SAVING: 'windStrength LOW',
  OFF: 'POWER OFF',
}

function getControlCommand(mode: DeviceMode): ThinQCommand {
  if (mode === 'SLEEP') return 'SLEEP_MODE'
  if (mode === 'OFF') return 'AIR_OFF'
  if (mode === 'AUTO') return 'AUTO'
  if (mode === 'TURBO') return 'TURBO'
  if (mode === 'SAVING') return 'SAVING'
  return 'AIR_ON'
}

type ThinQControlResponse = {
  success: boolean
  mock?: boolean
  fallback?: boolean
  deviceStatus: {
    power: string
    mode: string
    pm25?: number
  }
}

async function callThinQControl(command: ThinQCommand): Promise<ThinQControlResponse> {
  const response = await fetch('/api/thinq/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })

  const data = (await response.json()) as ThinQControlResponse & { error?: string }

  if (!response.ok) {
    throw new Error(data.error ?? 'ThinQ control failed')
  }

  return data
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

function getDaysAgoISO(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function formatFeedDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function computePeriodStats(
  deviceEvents: DeviceEvent[],
  symptomLogs: SymptomLog[],
): PeriodStats {
  let nauseaMode = 0
  let sleepMode = 0
  let voice = 0
  let kick = 0

  for (const event of deviceEvents) {
    if (event.event_type === 'NAUSEA_MODE') nauseaMode += 1
    if (event.event_type === 'SLEEP_MODE') sleepMode += 1
    if (event.triggered_by === 'VOICE') voice += 1
  }

  for (const log of symptomLogs) {
    if (log.parsed_category === 'KICK') kick += 1
  }

  return { nauseaMode, sleepMode, kick, voice }
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
    SLEEP_MODE: '🌙 수면 모드 ON',
    AIR_ON: '🌬️ 공기청정기 ON',
    AIR_OFF: '⏹️ 공기청정기 OFF',
    AUTO: '⚙️ 자동 모드',
    TURBO: '💨 터보 모드',
    SAVING: '🔋 절전 모드',
    OFF: '⏹️ 전원 OFF',
  }

  return {
    id: `device-${event.id}`,
    created_at: event.created_at,
    label: labels[event.event_type] ?? '📋 이벤트',
    triggered_by: event.triggered_by,
    device_status: event.device_status,
  }
}

function symptomLogToFeedItem(log: SymptomLog): FeedItem {
  if (log.parsed_category === 'KICK') {
    return {
      id: `symptom-${log.id}`,
      created_at: log.created_at,
      label: '👶 태동 감지',
      symptom_text: log.symptom_text,
    }
  }

  if (log.parsed_category === 'DIARY') {
    return {
      id: `symptom-${log.id}`,
      created_at: log.created_at,
      label: `📝 일기 기록: ${log.symptom_text}`,
      symptom_text: log.symptom_text,
    }
  }

  return {
    id: `symptom-${log.id}`,
    created_at: log.created_at,
    label: '📋 이벤트',
    symptom_text: log.symptom_text,
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
  const searchParams = useSearchParams()
  const [currentTime, setCurrentTime] = useState('')

  function navigateToSelect() {
    const query = searchParams.toString()
    router.push(query ? `/select?${query}` : '/select')
  }
  const [latestDeviceEvent, setLatestDeviceEvent] = useState<DeviceEvent | null>(null)
  const [nauseaCount, setNauseaCount] = useState(0)
  const [kickCount, setKickCount] = useState(0)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [selectedMode, setSelectedMode] = useState<DeviceMode | null>(null)
  const [isModeLoading, setIsModeLoading] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceMessage, setVoiceMessage] = useState('')
  const [voiceNeedsRetry, setVoiceNeedsRetry] = useState(false)
  const [babyMessage, setBabyMessage] = useState('')
  const [audioBase64, setAudioBase64] = useState('')
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<PeriodStats | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<PeriodStats | null>(null)
  const [wifeTodayMood, setWifeTodayMood] = useState<WifeMood | null>(null)
  const [wifeLatestDiary, setWifeLatestDiary] = useState<WifeDiary | null>(null)
  const [showWifeStatusModal, setShowWifeStatusModal] = useState(false)
  const [showFeedModal, setShowFeedModal] = useState(false)
  const [expandedCard, setExpandedCard] = useState<ExpandedCard | null>(null)
  const [pm25, setPm25] = useState<number>(0)
  const [briefingText, setBriefingText] = useState('')
  const [briefingAudio, setBriefingAudio] = useState('')
  const [isBriefingLoading, setIsBriefingLoading] = useState(false)
  const [briefingPlayed, setBriefingPlayed] = useState(false)
  const briefingPlayedRef = useRef(false)
  const { toast, showToast } = useToast()
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceStreamRef = useRef<MediaStream | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const isPointerRecordingRef = useRef(false)

  useEffect(() => {
    const devicePm25 = latestDeviceEvent?.device_status?.pm25

    if (devicePm25 != null) {
      setPm25(devicePm25)
    }
  }, [latestDeviceEvent?.device_status?.pm25])

  useEffect(() => {
    async function fetchThinQState() {
      try {
        const response = await fetch('/api/thinq/state')
        if (!response.ok) return

        const data = (await response.json()) as { pm25?: number }
        if (typeof data.pm25 === 'number') {
          setPm25(data.pm25)
        }
      } catch (error) {
        console.error('ThinQ 상태 조회 실패:', error)
      }
    }

    void fetchThinQState()
    const timer = setInterval(fetchThinQState, 30_000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!latestDeviceEvent) return

    const { power, mode } = latestDeviceEvent.device_status

    if (power === 'OFF') {
      setSelectedMode('OFF')
    } else if (DEVICE_MODES.includes(mode as DeviceMode)) {
      setSelectedMode(mode as DeviceMode)
    }
  }, [latestDeviceEvent])

  async function fetchBriefing(autoPlay = false) {
    setIsBriefingLoading(true)

    try {
      const weeksParam = searchParams.get('weeks')
      const parsedWeeks = weeksParam ? Number(weeksParam) : undefined
      const body =
        parsedWeeks !== undefined &&
        Number.isInteger(parsedWeeks) &&
        parsedWeeks >= 1 &&
        parsedWeeks <= 42
          ? { weeks: parsedWeeks }
          : {}

      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await response.json()) as {
        text?: string
        audioBase64?: string
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error ?? '브리핑 생성 실패')
      }

      setBriefingText(data.text ?? '')
      setBriefingAudio(data.audioBase64 ?? '')

      if (autoPlay && !briefingPlayedRef.current && data.audioBase64) {
        try {
          const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`)
          await audio.play()
          briefingPlayedRef.current = true
          setBriefingPlayed(true)
        } catch (playError) {
          console.warn('브리핑 자동 재생 차단:', playError)
        }
      }
    } catch (error) {
      console.error('브리핑 생성 실패:', error)
      showToast('브리핑을 준비하지 못했어요', 'error')
    } finally {
      setIsBriefingLoading(false)
    }
  }

  function handlePlayBriefing() {
    if (!briefingAudio) return

    const audio = new Audio(`data:audio/mpeg;base64,${briefingAudio}`)
    audio.play()
      .then(() => {
        briefingPlayedRef.current = true
        setBriefingPlayed(true)
      })
      .catch((error) => {
        console.error('브리핑 재생 실패:', error)
        showToast('브리핑 재생에 실패했어요', 'error')
      })
  }

  useEffect(() => {
    void fetchBriefing(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  useEffect(() => {
    async function fetchPeriodStats() {
      const sevenDaysAgo = getDaysAgoISO(7)
      const thirtyDaysAgo = getDaysAgoISO(30)

      const [weekDeviceResult, weekSymptomResult, monthDeviceResult, monthSymptomResult] =
        await Promise.all([
          supabase
            .from('device_events')
            .select('*')
            .eq('user_id', DEMO_WIFE_ID)
            .gte('created_at', sevenDaysAgo),
          supabase
            .from('symptom_logs')
            .select('*')
            .eq('user_id', DEMO_WIFE_ID)
            .gte('created_at', sevenDaysAgo),
          supabase
            .from('device_events')
            .select('*')
            .eq('user_id', DEMO_WIFE_ID)
            .gte('created_at', thirtyDaysAgo),
          supabase
            .from('symptom_logs')
            .select('*')
            .eq('user_id', DEMO_WIFE_ID)
            .gte('created_at', thirtyDaysAgo),
        ])

      if (weekDeviceResult.error) {
        console.error('주간 device_events 조회 실패:', weekDeviceResult.error)
      }
      if (weekSymptomResult.error) {
        console.error('주간 symptom_logs 조회 실패:', weekSymptomResult.error)
      }
      if (monthDeviceResult.error) {
        console.error('월간 device_events 조회 실패:', monthDeviceResult.error)
      }
      if (monthSymptomResult.error) {
        console.error('월간 symptom_logs 조회 실패:', monthSymptomResult.error)
      }

      if (!weekDeviceResult.error && !weekSymptomResult.error) {
        setWeeklyStats(
          computePeriodStats(
            (weekDeviceResult.data as DeviceEvent[]) ?? [],
            (weekSymptomResult.data as SymptomLog[]) ?? [],
          ),
        )
      }

      if (!monthDeviceResult.error && !monthSymptomResult.error) {
        setMonthlyStats(
          computePeriodStats(
            (monthDeviceResult.data as DeviceEvent[]) ?? [],
            (monthSymptomResult.data as SymptomLog[]) ?? [],
          ),
        )
      }
    }

    fetchPeriodStats()
  }, [])

  useEffect(() => {
    async function fetchWifeStatus() {
      const todayStart = getTodayStartISO()

      const [moodResult, diaryResult] = await Promise.all([
        supabase
          .from('moods')
          .select('mood, emoji')
          .eq('user_id', DEMO_WIFE_ID)
          .gte('created_at', todayStart)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('symptom_logs')
          .select('symptom_text, created_at')
          .eq('user_id', DEMO_WIFE_ID)
          .eq('parsed_category', 'DIARY')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (moodResult.error) {
        console.error('아내 기분 조회 실패:', moodResult.error)
      } else if (moodResult.data) {
        setWifeTodayMood(moodResult.data as WifeMood)
      }

      if (diaryResult.error) {
        console.error('아내 최근 증상 조회 실패:', diaryResult.error)
      } else if (diaryResult.data) {
        setWifeLatestDiary(diaryResult.data as WifeDiary)
      }
    }

    fetchWifeStatus()

    const channel = supabase
      .channel('hub-wife-status')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moods',
          filter: `user_id=eq.${DEMO_WIFE_ID}`,
        },
        (payload) => {
          const mood = payload.new as WifeMood & { created_at: string }
          if (isToday(mood.created_at)) {
            setWifeTodayMood({ mood: mood.mood, emoji: mood.emoji })
          }
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
            setWifeLatestDiary({
              symptom_text: log.symptom_text,
              created_at: log.created_at,
            })
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime 구독 실패: hub-wife-status')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function processVoiceAudio(blob: Blob) {
    setVoiceStatus('processing')

    try {
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
            action: babyData.action,
            hasMessage: !!babyData.message,
            hasAudio: !!babyData.audioBase64,
            error: babyData.error,
          })

          if (babyResponse.ok && babyData.triggered && babyData.message && babyData.audioBase64) {
            console.log('[hub voice] 아가 모드 활성화 — state 세팅')
            setBabyMessage(babyData.message)
            setAudioBase64(babyData.audioBase64)
            setVoiceMessage('')
            setVoiceNeedsRetry(false)
            setVoiceStatus('done')

            if (
              babyData.action &&
              babyData.action !== 'NONE' &&
              DEVICE_COMMANDS.includes(babyData.action as ThinQCommand)
            ) {
              const command = babyData.action as ThinQCommand
              const result = await callThinQControl(command)

              const { error } = await supabase.from('device_events').insert({
                user_id: DEMO_WIFE_ID,
                event_type: command,
                triggered_by: 'VOICE',
                device_status: result.deviceStatus,
              })

              if (error) throw error
            }

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

      if (data.action === 'SYMPTOM_LOG' && data.symptom_text) {
        const { error } = await supabase.from('symptom_logs').insert({
          user_id: DEMO_WIFE_ID,
          symptom_text: data.symptom_text,
          parsed_category: 'VOICE_LOG',
        })

        if (error) throw error

        setVoiceMessage(`📝 ${data.symptom_text} 기록됐어요`)
        setVoiceNeedsRetry(false)
        setVoiceStatus('done')
        return
      }

      if (data.action === 'UNKNOWN') {
        setVoiceMessage('다시 한번 말씀해주세요 🎤')
        setVoiceNeedsRetry(true)
        setVoiceStatus('done')
        return
      }

      setVoiceMessage(data.message)
      setVoiceNeedsRetry(false)
      setVoiceStatus('done')

      if (DEVICE_COMMANDS.includes(data.action as ThinQCommand)) {
        const command = data.action as ThinQCommand
        const result = await callThinQControl(command)

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
      setVoiceMessage('')
      setVoiceNeedsRetry(false)
      setVoiceStatus('idle')
      showToast('음성 분석에 실패했어요. 다시 시도해주세요', 'error')
    }
  }

  async function handleVoicePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault()
    if (voiceStatus === 'processing') return

    setVoiceMessage('')
    setVoiceNeedsRetry(false)
    setBabyMessage('')
    setAudioBase64('')
    setVoiceStatus('recording')
    isPointerRecordingRef.current = true
    recordingStartTimeRef.current = Date.now()
    voiceChunksRef.current = []

    try {
      e.currentTarget.setPointerCapture(e.pointerId)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      if (!isPointerRecordingRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        setVoiceStatus('idle')
        return
      }

      voiceStreamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      voiceRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
        voiceStreamRef.current = null
        voiceRecorderRef.current = null

        const duration = Date.now() - recordingStartTimeRef.current
        if (duration < 500 || voiceChunksRef.current.length === 0) {
          setVoiceStatus('idle')
          return
        }

        const recordedBlob = new Blob(voiceChunksRef.current, { type: 'audio/webm' })
        void processVoiceAudio(recordedBlob)
      }

      mediaRecorder.onerror = () => {
        console.error('녹음 실패')
        isPointerRecordingRef.current = false
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
        voiceStreamRef.current = null
        voiceRecorderRef.current = null
        setVoiceStatus('idle')
      }

      mediaRecorder.start()

      if (!isPointerRecordingRef.current) {
        mediaRecorder.stop()
      }
    } catch (error) {
      console.error('녹음 시작 실패:', error)
      isPointerRecordingRef.current = false
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
      voiceStreamRef.current = null
      voiceRecorderRef.current = null
      setVoiceStatus('idle')
    }
  }

  function handleVoicePointerEnd(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    if (!isPointerRecordingRef.current) return
    isPointerRecordingRef.current = false

    const recorder = voiceRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      return
    }

    voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
    voiceStreamRef.current = null
    voiceRecorderRef.current = null
    setVoiceStatus('idle')
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
      const result = await callThinQControl(command)

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
      showToast('기기 제어에 실패했어요', 'error')
    } finally {
      setIsModeLoading(false)
    }
  }

  const deviceStatus = latestDeviceEvent?.device_status
  const isPowerOn = deviceStatus?.power === 'ON'
  const wifeMoodStyle = getMoodStyle(wifeTodayMood?.emoji)
  const pm25Status = getPm25Status(pm25)
  const pm25GaugeWidth = Math.min((pm25 / 76) * 100, 100)

  function renderWifeStatusContent(large = false) {
    return (
      <div className="space-y-4">
        <div className={`rounded-xl p-5 text-center ${wifeMoodStyle.bg}`}>
          <p className="mb-1 text-sm text-gray-500">오늘 기분</p>
          {wifeTodayMood ? (
            <>
              <p className={large ? 'text-6xl' : 'text-4xl'}>{wifeTodayMood.emoji}</p>
              <p className={`mt-2 font-bold ${wifeMoodStyle.text} ${large ? 'text-2xl' : 'text-xl'}`}>
                {wifeTodayMood.mood}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">아직 기록 없음</p>
          )}
        </div>

        <div className={`rounded-xl bg-gray-50 ${large ? 'p-5' : 'p-4'}`}>
          <p className="mb-2 text-sm font-semibold text-gray-700">최근 증상</p>
          {wifeLatestDiary ? (
            <>
              <p className={`leading-relaxed text-gray-800 ${large ? 'text-base' : 'text-sm'}`}>
                {wifeLatestDiary.symptom_text}
              </p>
              <p className="mt-2 text-xs text-gray-400">{formatTime(wifeLatestDiary.created_at)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">-</p>
          )}
        </div>

        <div className="rounded-xl bg-blue-50 p-5 text-center">
          <p className="mb-2 text-sm text-gray-600">오늘 태동</p>
          <p className={`font-bold ${wifeMoodStyle.text} ${large ? 'text-7xl' : 'text-5xl'}`}>
            {kickCount}
          </p>
          <p className="mt-1 text-sm text-gray-500">회</p>
        </div>
      </div>
    )
  }

  function renderAirPurifierContent(large = false) {
    if (!deviceStatus) {
      return <p className="text-sm text-gray-500">아직 기록이 없어요</p>
    }

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <span
            className={`rounded-full font-medium ${
              isPowerOn ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
            } ${large ? 'px-5 py-2 text-lg' : 'px-3 py-1 text-sm'}`}
          >
            {deviceStatus.power}
          </span>
          <span className={`text-gray-700 ${large ? 'text-lg' : ''}`}>모드: {deviceStatus.mode}</span>
        </div>

        <div>
          <p className={`mb-2 text-gray-500 ${large ? 'text-base' : 'text-sm'}`}>실시간 공기질</p>
          <p className={`font-bold text-gray-800 ${large ? 'text-4xl' : 'text-2xl'}`}>
            공기 속 먼지 <span className={pm25Status.textColor}>{pm25}</span>
          </p>
          <div className={`mt-4 w-full overflow-hidden rounded-full bg-gray-100 ${large ? 'h-5' : 'h-3'}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${pm25Status.barColor}`}
              style={{ width: `${pm25GaugeWidth}%` }}
            />
          </div>
          <p className={`mt-3 font-medium ${pm25Status.textColor} ${large ? 'text-lg' : 'text-sm'}`}>
            {pm25Status.label}
          </p>
        </div>

        <div
          className={`rounded-xl px-4 py-3 text-center font-medium ${
            pm25 >= 36 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
          } ${large ? 'text-base' : 'text-sm'}`}
        >
          {pm25 >= 36
            ? '공기가 많이 탁해요 — 켜는 게 좋아요'
            : pm25 >= 16
              ? '공기가 조금 탁해요'
              : '공기가 좋아요!'}
        </div>

        <p className="text-center text-xs text-gray-300">
          {pm25 === 0 ? '공기질 정보를 불러오는 중...' : '* ThinQ API 실시간 데이터'}
        </p>
      </div>
    )
  }

  function renderTodayStats(large = false) {
    return (
      <div className={`grid grid-cols-2 gap-4 ${large ? 'gap-6' : ''}`}>
        <div className={`rounded-lg bg-gray-50 text-center ${large ? 'p-8' : 'p-4'}`}>
          <p className={`mb-2 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>입덧 모드 켠 횟수</p>
          <p className={`font-bold text-blue-600 ${large ? 'text-6xl' : 'text-4xl'}`}>{nauseaCount}</p>
        </div>
        <div className={`rounded-lg bg-gray-50 text-center ${large ? 'p-8' : 'p-4'}`}>
          <p className={`mb-2 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>아기 움직인 횟수</p>
          <p className={`font-bold text-blue-600 ${large ? 'text-6xl' : 'text-4xl'}`}>{kickCount}</p>
        </div>
      </div>
    )
  }

  function renderDeviceControl(large = false) {
    return (
      <>
        <p className={`mb-4 text-gray-500 ${large ? 'text-base' : 'text-sm'}`}>
          현재 모드:{' '}
          <span className="font-medium text-blue-600">
            {selectedMode ? `${MODE_LABELS[selectedMode]} (${MODE_API_LABELS[selectedMode]})` : '선택 안 됨'}
          </span>
        </p>
        <div className={`grid gap-3 ${large ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-3'}`}>
          {DEVICE_MODES.map((mode) => {
            const isSelected = selectedMode === mode
            const isOff = mode === 'OFF'

            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeSelect(mode)}
                disabled={isModeLoading}
                className={`rounded-2xl border font-semibold transition disabled:opacity-60 ${
                  large ? 'py-5 text-base' : 'py-3 text-sm'
                } ${
                  isSelected
                    ? isOff
                      ? 'border-gray-300 bg-gray-300 text-gray-700'
                      : 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="block">{MODE_LABELS[mode]}</span>
                <span
                  className={`mt-0.5 block font-normal opacity-70 ${
                    large ? 'text-xs' : 'text-[10px]'
                  }`}
                >
                  {MODE_API_LABELS[mode]}
                </span>
              </button>
            )
          })}
        </div>
        {isModeLoading && (
          <p className="mt-4 flex justify-center text-sm text-gray-500">
            <Spinner text="실행 중..." />
          </p>
        )}
      </>
    )
  }

  function renderPeriodStatsBlock(stats: PeriodStats, label: string, large: boolean, colorClass: string) {
    return (
      <div>
        <h3 className={`mb-4 font-semibold text-gray-800 ${large ? 'text-lg' : 'text-base'}`}>{label}</h3>
        <div className={`grid grid-cols-2 gap-3 ${large ? 'gap-4' : ''}`}>
          <div className={`rounded-lg bg-blue-50 text-center ${large ? 'p-6' : 'p-4'}`}>
            <p className={`mb-1 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>입덧 모드</p>
            <p className={`font-bold ${colorClass} ${large ? 'text-5xl' : 'text-3xl'}`}>{stats.nauseaMode}</p>
          </div>
          <div className={`rounded-lg bg-blue-50 text-center ${large ? 'p-6' : 'p-4'}`}>
            <p className={`mb-1 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>수면 모드</p>
            <p className={`font-bold ${colorClass} ${large ? 'text-5xl' : 'text-3xl'}`}>{stats.sleepMode}</p>
          </div>
          <div className={`rounded-lg bg-blue-50 text-center ${large ? 'p-6' : 'p-4'}`}>
            <p className={`mb-1 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>태동 횟수</p>
            <p className={`font-bold ${colorClass} ${large ? 'text-5xl' : 'text-3xl'}`}>{stats.kick}</p>
          </div>
          <div className={`rounded-lg bg-blue-50 text-center ${large ? 'p-6' : 'p-4'}`}>
            <p className={`mb-1 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>음성 트리거</p>
            <p className={`font-bold ${colorClass} ${large ? 'text-5xl' : 'text-3xl'}`}>{stats.voice}</p>
          </div>
        </div>
      </div>
    )
  }

  function renderFeedList(large = false) {
    if (feed.length === 0) {
      return <p className="text-center text-sm text-gray-500">아직 이벤트가 없어요</p>
    }

    return (
      <ul className={large ? 'divide-y divide-gray-100' : 'space-y-2'}>
        {feed.map((item) => (
          <li
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedFeedItem(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedFeedItem(item)
              }
            }}
            className={`cursor-pointer transition hover:border-blue-200 hover:bg-blue-50/50 ${
              large
                ? 'py-4 first:pt-0 last:pb-0'
                : 'flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2'
            }`}
          >
            {large ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-sm text-gray-400">{formatTime(item.created_at)}</span>
                  <span className="text-right text-base text-gray-800">{item.label}</span>
                </div>
                {item.triggered_by && (
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.triggered_by === 'VOICE'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.triggered_by}
                  </span>
                )}
                {item.device_status && (
                  <p className="mt-2 text-sm text-gray-500">
                    전원: {item.device_status.power} · 모드: {item.device_status.mode}
                  </p>
                )}
                {item.symptom_text && (
                  <p className="mt-1 text-sm text-gray-600">{item.symptom_text}</p>
                )}
              </>
            ) : (
              <>
                <span className="shrink-0 font-mono text-xs text-gray-500">
                  {formatTime(item.created_at)}
                </span>
                <span className="text-sm text-gray-700">{item.label}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    )
  }

  function renderBriefingContent(large = false) {
    return (
      <>
        <p className={`text-gray-500 ${large ? 'text-base' : 'text-sm'}`}>
          아내 상태를 음성으로 알려드려요
        </p>
        <div className="mt-4">
          {isBriefingLoading ? (
            <p className={`text-gray-500 ${large ? 'text-base' : 'text-sm'}`}>브리핑 준비 중이에요...</p>
          ) : briefingText ? (
            <p className={`italic leading-relaxed text-gray-700 ${large ? 'text-lg' : 'text-sm'}`}>
              {briefingText}
            </p>
          ) : (
            <p className={`text-gray-500 ${large ? 'text-base' : 'text-sm'}`}>브리핑을 불러오지 못했어요</p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePlayBriefing}
            disabled={!briefingAudio || isBriefingLoading}
            className={`rounded-2xl bg-blue-500 font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60 ${
              large ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
            }`}
          >
            🔊 브리핑 듣기
          </button>
          <button
            type="button"
            onClick={() => void fetchBriefing(false)}
            disabled={isBriefingLoading}
            className={`text-blue-600 transition hover:text-blue-700 disabled:opacity-60 ${
              large ? 'text-base' : 'text-sm'
            }`}
          >
            🔄 다시 생성
          </button>
          {briefingPlayed && <span className="text-xs text-gray-400">재생 완료</span>}
        </div>
      </>
    )
  }

  function handleVoiceRetry() {
    setVoiceMessage('')
    setVoiceNeedsRetry(false)
    setVoiceStatus('idle')
  }

  function renderVoiceResult(large = false) {
    return (
      <>
        {voiceStatus === 'done' && babyMessage && (
          <div className="flex w-full flex-col items-center gap-2">
            <p
              className={`w-full rounded-lg border border-gray-200 bg-gray-50 text-center text-gray-700 ${
                large ? 'px-5 py-4 text-base' : 'px-4 py-3 text-sm'
              }`}
            >
              👶 아가: {babyMessage}
            </p>
            {audioBase64 && (
              <button
                type="button"
                onClick={handlePlayBabyVoice}
                className={`rounded-2xl border border-blue-200 bg-blue-500 font-semibold text-white transition hover:bg-blue-600 ${
                  large ? 'px-5 py-3 text-sm' : 'px-4 py-2 text-xs'
                }`}
              >
                🔊 아가 목소리 듣기
              </button>
            )}
          </div>
        )}
        {voiceStatus === 'done' && voiceMessage && !babyMessage && (
          <div className="flex w-full flex-col items-center gap-2">
            <p
              className={`w-full rounded-lg border border-gray-200 bg-gray-50 text-center text-gray-700 ${
                large ? 'px-5 py-4 text-base' : 'px-4 py-3 text-sm'
              }`}
            >
              {voiceMessage}
            </p>
            {voiceNeedsRetry && (
              <button
                type="button"
                onClick={handleVoiceRetry}
                className={`rounded-2xl bg-blue-500 font-semibold text-white transition hover:bg-blue-600 ${
                  large ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                }`}
              >
                🎤 다시 말하기
              </button>
            )}
          </div>
        )}
      </>
    )
  }

  function renderVoiceTrigger(large = false) {
    return (
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onPointerDown={handleVoicePointerDown}
          onPointerUp={handleVoicePointerEnd}
          onPointerLeave={handleVoicePointerEnd}
          onPointerCancel={handleVoicePointerEnd}
          disabled={voiceStatus === 'processing'}
          className={`w-full rounded-2xl font-semibold transition select-none disabled:cursor-not-allowed disabled:opacity-60 ${
            large ? 'px-8 py-8 text-lg' : 'px-6 py-4 text-sm'
          } ${
            voiceStatus === 'recording'
              ? 'animate-pulse bg-red-500 text-white'
              : voiceStatus === 'processing'
                ? 'bg-blue-400 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {voiceStatus === 'recording' ? (
            '🔴 듣고 있어요...'
          ) : voiceStatus === 'processing' ? (
            <Spinner text="🤔 이해하는 중..." />
          ) : (
            '🎤 눌러서 말하기'
          )}
        </button>
        <p className={`text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>
          버튼을 누르고 있는 동안 말해보세요
        </p>
        {renderVoiceResult(large)}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-100 to-gray-100 text-gray-800">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <header className="mb-8 border-b border-gray-200 pb-6">
          <button
            type="button"
            onClick={navigateToSelect}
            className="mb-4 text-sm text-gray-500 transition hover:text-gray-700"
          >
            ← 홈으로
          </button>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <ellipse cx="16" cy="14" rx="12" ry="11" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
              <circle cx="13" cy="11" r="1.5" fill="#CBD5E1" />
              <circle cx="16" cy="10" r="1.5" fill="#CBD5E1" />
              <circle cx="19" cy="11" r="1.5" fill="#CBD5E1" />
              <ellipse cx="16" cy="24" rx="12" ry="3" fill="#DBEAFE" />
              <ellipse cx="16" cy="24" rx="8" ry="1.5" fill="#3B82F6" opacity="0.8" />
            </svg>
            ThinQ ON Hub
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {getTodayLabel()}
            {currentTime && ` · ${currentTime}`}
          </p>
        </header>

        <section className="mb-8 rounded-2xl border-t-4 border-blue-400 bg-blue-50 p-5 shadow-sm">
          <CardTitleRow title="오늘의 브리핑 📢" cardId="briefing" onExpand={setExpandedCard} className="mb-0" />
          <p className="mt-1 text-sm text-gray-500">아내 상태를 음성으로 알려드려요</p>

          <div className="mt-4">
            {isBriefingLoading ? (
              <p className="text-sm text-gray-500">브리핑 준비 중이에요...</p>
            ) : briefingText ? (
              <p className="line-clamp-3 text-sm italic leading-relaxed text-gray-700">{briefingText}</p>
            ) : (
              <p className="text-sm text-gray-500">브리핑을 불러오지 못했어요</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePlayBriefing}
              disabled={!briefingAudio || isBriefingLoading}
              className="rounded-2xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60"
            >
              🔊 브리핑 듣기
            </button>
            <button
              type="button"
              onClick={() => void fetchBriefing(false)}
              disabled={isBriefingLoading}
              className="text-sm text-blue-600 transition hover:text-blue-700 disabled:opacity-60"
            >
              🔄 다시 생성
            </button>
            {briefingPlayed && (
              <span className="text-xs text-gray-400">재생 완료</span>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <section
                role="button"
                tabIndex={0}
                onClick={() => setShowWifeStatusModal(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setShowWifeStatusModal(true)
                  }
                }}
                className={`cursor-pointer rounded-xl border-t-4 p-4 shadow-sm transition hover:opacity-90 ${wifeMoodStyle.bg} ${wifeMoodStyle.border}`}
              >
                <CardTitleRow title="아내 현재 상태 👩" cardId="wife-status" onExpand={setExpandedCard} className="mb-3" />
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="text-gray-500">기분: </span>
                    {wifeTodayMood ? (
                      <span className="font-medium">
                        {wifeTodayMood.emoji} {wifeTodayMood.mood}
                      </span>
                    ) : (
                      <span className="text-gray-400">아직 기록 없음</span>
                    )}
                  </p>
                  <p>
                    <span className="text-gray-500">최근 증상: </span>
                    {wifeLatestDiary ? (
                      <span>
                        {wifeLatestDiary.symptom_text} · {formatTime(wifeLatestDiary.created_at)}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </p>
                  <p>
                    <span className="text-gray-500">오늘 태동: </span>
                    <span className={`font-semibold ${wifeMoodStyle.text}`}>{kickCount}회</span>
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <CardTitleRow title="공기청정기 상태 🌬️" cardId="air-purifier" onExpand={setExpandedCard} />
                {deviceStatus ? (
                  <div className="space-y-4">
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

                    <div>
                      <p className="mb-2 text-sm text-gray-500">실시간 공기질</p>
                      <p className="text-2xl font-bold text-gray-800">
                        공기 속 먼지{' '}
                        <span className={pm25Status.textColor}>{pm25}</span>
                      </p>
                      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${pm25Status.barColor}`}
                          style={{ width: `${pm25GaugeWidth}%` }}
                        />
                      </div>
                      <p className={`mt-2 text-sm font-medium ${pm25Status.textColor}`}>
                        {pm25Status.label}
                      </p>
                    </div>

                    <div
                      className={`rounded-xl px-4 py-3 text-center text-sm font-medium ${
                        pm25 >= 36
                          ? 'bg-red-50 text-red-500'
                          : 'bg-green-50 text-green-500'
                      }`}
                    >
                      {pm25 >= 36
                        ? '공기가 많이 탁해요 — 켜는 게 좋아요'
                        : pm25 >= 16
                          ? '공기가 조금 탁해요'
                          : '공기가 좋아요!'}
                    </div>

                    <p className="text-center text-xs text-gray-300">
                      * ThinQ API 실시간 데이터
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">아직 기록이 없어요</p>
                )}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <CardTitleRow title="오늘 기록" cardId="today-stats" onExpand={setExpandedCard} />
                {renderTodayStats()}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <CardTitleRow title="공기청정기 직접 조절하기" cardId="device-control" onExpand={setExpandedCard} className="mb-2" />
                {renderDeviceControl()}
              </section>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <CardTitleRow title="주간 통계" cardId="weekly-stats" onExpand={setExpandedCard} />
                {weeklyStats ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <p className="mb-1 text-xs text-gray-500">입덧 모드</p>
                      <p className="text-3xl font-bold text-blue-600">{weeklyStats.nauseaMode}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <p className="mb-1 text-xs text-gray-500">수면 모드</p>
                      <p className="text-3xl font-bold text-blue-600">{weeklyStats.sleepMode}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <p className="mb-1 text-xs text-gray-500">태동 횟수</p>
                      <p className="text-3xl font-bold text-blue-600">{weeklyStats.kick}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <p className="mb-1 text-xs text-gray-500">음성 트리거</p>
                      <p className="text-3xl font-bold text-blue-600">{weeklyStats.voice}</p>
                    </div>
                  </div>
                ) : (
                  <p className="flex justify-center text-sm text-gray-500">
                    <Spinner text="불러오는 중..." />
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <CardTitleRow title="월간 통계" cardId="weekly-stats" onExpand={setExpandedCard} />
                {monthlyStats ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-indigo-50 p-4 text-center">
                      <p className="mb-1 text-xs text-gray-500">입덧 모드</p>
                      <p className="text-3xl font-bold text-indigo-600">{monthlyStats.nauseaMode}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-4 text-center">
                      <p className="mb-1 text-xs text-gray-500">수면 모드</p>
                      <p className="text-3xl font-bold text-indigo-600">{monthlyStats.sleepMode}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-4 text-center">
                      <p className="mb-1 text-xs text-gray-500">태동 횟수</p>
                      <p className="text-3xl font-bold text-indigo-600">{monthlyStats.kick}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-4 text-center">
                      <p className="mb-1 text-xs text-gray-500">음성 트리거</p>
                      <p className="text-3xl font-bold text-indigo-600">{monthlyStats.voice}</p>
                    </div>
                  </div>
                ) : (
                  <p className="flex justify-center text-sm text-gray-500">
                    <Spinner text="불러오는 중..." />
                  </p>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="말로 조절하기 🎤" cardId="voice-trigger" onExpand={setExpandedCard} />
              {renderVoiceTrigger()}
            </section>
          </div>

          <section
            role="button"
            tabIndex={0}
            onClick={() => setShowFeedModal(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setShowFeedModal(true)
              }
            }}
            className="flex min-h-[600px] cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-200 lg:col-span-1"
          >
            <CardTitleRow title="실시간 이벤트 피드" cardId="feed" onExpand={setExpandedCard} className="mb-4 shrink-0" />
            {feed.length === 0 ? (
              <p className="flex flex-1 items-center justify-center text-center text-sm text-gray-500">
                아직 이벤트가 없어요
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {feed.map((item) => (
                  <li
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFeedItem(item)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedFeedItem(item)
                      }
                    }}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50/50"
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
        </div>
      </div>

      {expandedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setExpandedCard(null)}
        >
          <div
            className="fixed bottom-0 left-1/2 h-[90vh] w-full max-w-5xl -translate-x-1/2 overflow-y-auto rounded-t-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">
                {EXPANDED_CARD_TITLES[expandedCard]}
              </h2>
              <button
                type="button"
                onClick={() => setExpandedCard(null)}
                className="shrink-0 text-xl text-gray-400 transition hover:text-gray-600"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {expandedCard === 'wife-status' && renderWifeStatusContent(true)}

            {expandedCard === 'air-purifier' && renderAirPurifierContent(true)}

            {expandedCard === 'today-stats' && renderTodayStats(true)}

            {expandedCard === 'device-control' && renderDeviceControl(true)}

            {expandedCard === 'feed' && renderFeedList(true)}

            {expandedCard === 'weekly-stats' && (
              <div className="space-y-8">
                {weeklyStats ? (
                  renderPeriodStatsBlock(weeklyStats, '주간 통계', true, 'text-blue-600')
                ) : (
                  <p className="flex justify-center text-base text-gray-500">
                    <Spinner text="주간 통계 불러오는 중..." />
                  </p>
                )}
                <hr className="border-gray-100" />
                {monthlyStats ? (
                  renderPeriodStatsBlock(monthlyStats, '월간 통계', true, 'text-indigo-600')
                ) : (
                  <p className="flex justify-center text-base text-gray-500">
                    <Spinner text="월간 통계 불러오는 중..." />
                  </p>
                )}
              </div>
            )}

            {expandedCard === 'briefing' && renderBriefingContent(true)}

            {expandedCard === 'voice-trigger' && renderVoiceTrigger(true)}
          </div>
        </div>
      )}

      {showWifeStatusModal && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50"
          onClick={() => setShowWifeStatusModal(false)}
        >
          <div
            className="relative mx-4 mt-16 max-h-[75vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowWifeStatusModal(false)}
              className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>

            <h2 className="pr-8 text-base font-semibold text-gray-900">👩 아내 현재 상태</h2>
            <p className="mt-1 text-sm text-gray-400">{getTodayDateOnly()}</p>
            <hr className="my-4 border-gray-100" />

            <div className={`mb-4 rounded-xl p-5 text-center ${wifeMoodStyle.bg}`}>
              <p className="mb-1 text-sm text-gray-500">오늘 기분</p>
              {wifeTodayMood ? (
                <>
                  <p className="text-4xl">{wifeTodayMood.emoji}</p>
                  <p className={`mt-2 text-xl font-bold ${wifeMoodStyle.text}`}>{wifeTodayMood.mood}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">아직 기록 없음</p>
              )}
            </div>

            <div className="mb-4 rounded-xl bg-gray-50 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">최근 증상</p>
              {wifeLatestDiary ? (
                <>
                  <p className="text-sm leading-relaxed text-gray-800">{wifeLatestDiary.symptom_text}</p>
                  <p className="mt-2 text-xs text-gray-400">{formatTime(wifeLatestDiary.created_at)}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">-</p>
              )}
            </div>

            <div className="rounded-xl bg-blue-50 p-4 text-center">
              <p className="mb-2 text-sm text-gray-600">오늘 태동</p>
              <p className={`text-5xl font-bold ${wifeMoodStyle.text}`}>{kickCount}</p>
              <p className="mt-1 text-sm text-gray-500">회</p>
            </div>
          </div>
        </div>
      )}

      {showFeedModal && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50"
          onClick={() => setShowFeedModal(false)}
        >
          <div
            className="relative mx-4 mt-16 max-h-[75vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowFeedModal(false)}
              className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>

            <h2 className="mb-4 pr-8 text-base font-semibold text-gray-900">📋 실시간 이벤트 피드 전체</h2>

            {feed.length === 0 ? (
              <p className="text-center text-sm text-gray-500">아직 이벤트가 없어요</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {feed.map((item) => (
                  <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="shrink-0 text-xs text-gray-400">{formatTime(item.created_at)}</span>
                      <span className="text-right text-sm text-gray-800">{item.label}</span>
                    </div>
                    {item.triggered_by && (
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.triggered_by === 'VOICE'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.triggered_by}
                      </span>
                    )}
                    {item.device_status && (
                      <p className="mt-2 text-xs text-gray-500">
                        전원: {item.device_status.power} · 모드: {item.device_status.mode}
                      </p>
                    )}
                    {item.symptom_text && (
                      <p className="mt-1 text-xs text-gray-600">{item.symptom_text}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {selectedFeedItem && (
        <div
          className="fixed inset-0 z-[60] flex justify-center bg-black/50"
          onClick={() => setSelectedFeedItem(null)}
        >
          <div
            className="relative mx-4 mt-20 max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedFeedItem(null)}
              className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>

            <h2 className="mb-4 pr-8 text-base font-semibold text-gray-900">이벤트 상세</h2>

            <div className="space-y-3">
              <div className="rounded-2xl bg-blue-50 px-4 py-3">
                <p className="mb-1 text-xs text-gray-500">시간</p>
                <p className="text-sm text-gray-800">{formatFeedDateTime(selectedFeedItem.created_at)}</p>
              </div>

              <div className="rounded-2xl bg-blue-50 px-4 py-3">
                <p className="mb-1 text-xs text-gray-500">이벤트 유형</p>
                <p className="text-sm text-gray-800">{selectedFeedItem.label}</p>
              </div>

              {selectedFeedItem.triggered_by && (
                <div className="rounded-2xl bg-blue-50 px-4 py-3">
                  <p className="mb-1 text-xs text-gray-500">트리거 방식</p>
                  <p className="text-sm text-gray-800">{selectedFeedItem.triggered_by}</p>
                </div>
              )}

              {selectedFeedItem.device_status && (
                <div className="rounded-2xl bg-blue-50 px-4 py-3">
                  <p className="mb-1 text-xs text-gray-500">기기 상태</p>
                  <p className="text-sm text-gray-800">
                    전원: {selectedFeedItem.device_status.power}
                  </p>
                  <p className="text-sm text-gray-800">
                    모드: {selectedFeedItem.device_status.mode}
                  </p>
                  {selectedFeedItem.device_status.pm25 !== undefined && (
                    <p className="text-sm text-gray-800">
                      공기 속 먼지: {selectedFeedItem.device_status.pm25}
                    </p>
                  )}
                </div>
              )}

              {selectedFeedItem.symptom_text && (
                <div className="rounded-2xl bg-blue-50 px-4 py-3">
                  <p className="mb-1 text-xs text-gray-500">증상 내용</p>
                  <p className="text-sm leading-relaxed text-gray-800">
                    {selectedFeedItem.symptom_text}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
