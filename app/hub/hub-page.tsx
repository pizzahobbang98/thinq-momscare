'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'
import type { DeviceAction } from '@/lib/mode-actions'
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
  | 'ai-care'
  | 'recent-care'
  | 'feed'
  | 'weekly-stats'
  | 'briefing'
  | 'voice-trigger'

const EXPANDED_CARD_TITLES: Record<ExpandedCard, string> = {
  'wife-status': '아내 컨디션 요약',
  'air-purifier': '현재 가전 상태',
  'today-stats': '오늘 기록',
  'ai-care': '현재 케어 상태',
  'recent-care': '최근 실행된 케어',
  feed: '실시간 이벤트 피드',
  'weekly-stats': '주간/월간 통계',
  briefing: '오늘의 브리핑',
  'voice-trigger': '말로 케어 요청하기',
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
type VoiceState = 'idle' | 'recording' | 'analyzing' | 'executing'

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

type MotherTogetherExecuteResponse = {
  success: boolean
  redirect?: boolean
  type?: 'MORNING_BRIEFING'
  mode: string
  modeLabel: string
  signals: string[]
  reply: string
  audioBase64: string
  wifeCard: string
  husbandCard: string
  deviceResults: DeviceAction[]
  error?: string
}

type MorningBriefingResponse = {
  success: boolean
  type?: 'MORNING_BRIEFING'
  wifeBriefing: string
  husbandBriefing: string
  audioBase64: string
  recommendedModes: string[]
  error?: string
}

type LastModeResult = {
  mode: string
  modeLabel: string
  signals: string[]
  reply: string
  wifeCard: string
  husbandCard: string
  deviceResults: DeviceAction[]
  recommendedModes?: string[]
}

type ModeRunLog = {
  id: string
  mode: string
  mode_label: string
  created_at: string
  reply?: string | null
  device_results?: DeviceAction[] | null
}

type DeviceMode = 'AUTO' | 'TURBO' | 'SLEEP' | 'SAVING' | 'ON' | 'OFF'

const MODE_LABELS: Record<DeviceMode, string> = {
  AUTO: '자동',
  TURBO: '강풍',
  SLEEP: '수면',
  SAVING: '절전(저풍)',
  ON: '켜짐',
  OFF: '꺼짐',
}

const EXAMPLE_PROMPTS = [
  '🤢 나 지금 입덧이 심해',
  '😴 나 이제 잘 거야',
  '오늘 몸이 너무 무거워',
  '바다 보고 싶어',
  '세탁 끝났는데 못 일어나겠어',
  '굿모닝',
] as const

const MODE_ACTION_DESCRIPTIONS: Record<string, string> = {
  NAUSEA_MODE: '공기청정기 터보 모드로 전환',
  AIR_OFF: '공기청정기 전원 끄기',
  SLEEP_MODE: '잠들기 좋은 침실 조건으로 전환',
  HOUSEWORK_MODE: '집안일 타이밍을 무리 없이 조정',
  TRAVEL_MODE: '집 안을 잠시 다른 장소처럼 전환',
  MORNING_BRIEFING: '오늘의 컨디션과 케어 루틴을 브리핑',
  UNKNOWN: '추가 정보가 필요해요',
}

const MODE_EMOJIS: Record<string, string> = {
  NAUSEA_MODE: '🍋',
  AIR_OFF: '⏹️',
  SLEEP_MODE: '😴',
  HOUSEWORK_MODE: '🧺',
  TRAVEL_MODE: '🚗',
  MORNING_BRIEFING: '✨',
  UNKNOWN: '✨',
}

const CARE_ACTION_LABELS: Record<string, string> = {
  NAUSEA_MODE: '공기청정기 터보 모드 실행됨',
  SLEEP_MODE: '수면 모드 전환됨',
  AIR_ON: '공기청정기 켜기',
  AIR_OFF: '공기청정기 끄기',
  AUTO: '자동 모드 전환됨',
  TURBO: '강풍 모드 전환됨',
  SAVING: '절전(저풍) 모드 전환됨',
  OFF: '공기청정기 끄기',
  ON: '공기청정기 켜기',
}

function getDetectedCareState(
  latestEvent: DeviceEvent | null,
  mood: WifeMood | null,
  diary: WifeDiary | null,
): string {
  if (latestEvent?.event_type === 'NAUSEA_MODE') return '입덧 감지'
  if (latestEvent?.event_type === 'SLEEP_MODE') return '수면 필요'

  const diaryText = diary?.symptom_text ?? ''
  if (/입덧|메스꺼|구역|토할/.test(diaryText)) return '입덧 감지'
  if (/피곤|피로|힘들|지쳐/.test(diaryText)) return '피로 감지'
  if (/수면|잠|불면|졸려/.test(diaryText)) return '수면 필요'

  if (mood?.emoji === '😣' || mood?.emoji === '🤒') return '피로 감지'
  if (mood?.emoji === '😔') return '수면 필요'

  return '일반'
}

function getCareActionLabel(eventType: string): string {
  return CARE_ACTION_LABELS[eventType] ?? 'AI 케어 실행'
}

function getModeDisplayLabel(uiMode: DeviceMode | null | undefined, rawMode?: string): string {
  if (uiMode) return MODE_LABELS[uiMode]
  if (rawMode) return rawMode
  return '-'
}

type ThinQStateResponse = {
  power: 'ON' | 'OFF'
  mode: string
  jobMode?: string
  fanSpeed?: string
  pm25: number
  uiMode: DeviceMode | null
  mock: boolean
  fallback: boolean
  error?: string
}

async function fetchThinQStateFromApi(): Promise<ThinQStateResponse> {
  console.log('[hub] calling /api/thinq/state')
  const response = await fetch('/api/thinq/state', { cache: 'no-store' })
  const data = (await response.json()) as ThinQStateResponse & { error?: string }

  console.log('[hub] thinq state response:', data)

  if (!response.ok) {
    throw new Error(data.error ?? 'ThinQ state failed')
  }

  return data
}

function thinQStateToDeviceStatus(state: ThinQStateResponse) {
  return {
    power: state.power,
    mode: state.uiMode ?? state.mode,
    pm25: state.pm25,
  }
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

type RealtimeStatus = 'connected' | 'connecting' | 'disconnected'

function createHubRealtimeChannelName() {
  return `hub-realtime-${crypto.randomUUID?.() ?? Date.now()}`
}

function getRealtimeStatusBadge(status: RealtimeStatus) {
  if (status === 'connected') {
    return {
      label: '실시간 연결됨 🟢',
      className: 'bg-green-100 text-green-700 ring-1 ring-green-200',
    }
  }
  if (status === 'connecting') {
    return {
      label: '실시간 연결 대기 중',
      className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    }
  }
  return {
    label: '실시간 연결 실패, 자동 새로고침 중',
    className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  }
}

/*
 * Supabase Realtime 설정 체크리스트 (Dashboard)
 *
 * 1. Database > Replication (또는 Realtime)에서 아래 테이블 Realtime 활성화
 *    - device_events, messages, alerts, hearts, symptom_logs, moods
 *
 * 2. publication에 테이블 추가 (SQL Editor — already member 오류는 무시):
 *    alter publication supabase_realtime add table device_events;
 *    alter publication supabase_realtime add table messages;
 *    alter publication supabase_realtime add table alerts;
 *    alter publication supabase_realtime add table hearts;
 *    alter publication supabase_realtime add table symptom_logs;
 *    alter publication supabase_realtime add table moods;
 *
 * 3. RLS가 켜져 있다면 anon SELECT 정책 필요 (개발/시연용 — 운영 시 user_id 기반 강화):
 *    create policy "Allow anon read device_events"
 *    on device_events for select to anon using (true);
 *
 *    create policy "Allow anon read messages"
 *    on messages for select to anon using (true);
 *
 *    create policy "Allow anon read alerts"
 *    on alerts for select to anon using (true);
 *
 *    create policy "Allow anon read hearts"
 *    on hearts for select to anon using (true);
 *
 *    create policy "Allow anon read symptom_logs"
 *    on symptom_logs for select to anon using (true);
 *
 *    create policy "Allow anon read moods"
 *    on moods for select to anon using (true);
 *
 * 4. .env.local 확인: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

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
    NAUSEA_MODE: '🍋 입덧 모드 ON',
    SLEEP_MODE: '😴 수면 모드 ON',
    AIR_ON: '🟢 공기청정기 ON',
    AIR_OFF: '⏹️ 공기청정기 OFF',
    AUTO: '🟢 자동 모드',
    TURBO: '🍋 터보 모드',
    SAVING: '🟢 절전 모드',
    OFF: '⏹️ 전원 OFF',
    ON: '🟢 공기청정기 ON',
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
      label: '🐣 태동 감지',
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
  const [thinQState, setThinQState] = useState<ThinQStateResponse | null>(null)
  const [thinQFallbackWarning, setThinQFallbackWarning] = useState<string | null>(null)
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceMessage, setVoiceMessage] = useState('')
  const [voiceNeedsRetry, setVoiceNeedsRetry] = useState(false)
  const [voiceSpeakStatus, setVoiceSpeakStatus] = useState<
    'idle' | 'preparing' | 'speaking' | 'done' | 'failed'
  >('idle')
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
  const [isBriefingPlaying, setIsBriefingPlaying] = useState(false)
  const [briefingLoadFailed, setBriefingLoadFailed] = useState(false)
  const [briefingPlayed, setBriefingPlayed] = useState(false)
  const [lastModeResult, setLastModeResult] = useState<LastModeResult | null>(null)
  const [naturalLanguageText, setNaturalLanguageText] = useState('')
  const [inputText, setInputText] = useState('')
  const [lastSubmittedText, setLastSubmittedText] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [modeRunLogs, setModeRunLogs] = useState<ModeRunLog[]>([])
  const [recentModeRuns, setRecentModeRuns] = useState<ModeRunLog[]>([])
  const briefingAudioRef = useRef<HTMLAudioElement | null>(null)
  const voiceResponseAudioRef = useRef<HTMLAudioElement | null>(null)
  const voiceAudioUrlRef = useRef<string | null>(null)
  const { toast, showToast } = useToast()
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceStreamRef = useRef<MediaStream | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const isPointerRecordingRef = useRef(false)
  const hubRealtimeChannelRef = useRef<RealtimeChannel | null>(null)
  const hubRealtimeReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchHubSnapshotRef = useRef<(() => Promise<void>) | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')

  const fetchHubSnapshot = useCallback(async () => {
    const todayStart = getTodayStartISO()

    try {
      const [
        deviceResult,
        nauseaResult,
        kickResult,
        deviceFeedResult,
        symptomFeedResult,
        moodResult,
        diaryResult,
        messagesResult,
        alertsResult,
        modeRunsResult,
      ] = await Promise.all([
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
        supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5),
        supabase
          .from('mode_runs')
          .select('id, mode, mode_label, reply, created_at, device_results')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (deviceResult.error) {
        console.warn('[Hub polling] device_events latest 조회 실패:', deviceResult.error)
      } else if (deviceResult.data) {
        setLatestDeviceEvent(deviceResult.data as DeviceEvent)
      }

      if (nauseaResult.error) {
        console.warn('[Hub polling] 입덧 모드 횟수 조회 실패:', nauseaResult.error)
      } else {
        setNauseaCount(nauseaResult.count ?? 0)
      }

      if (kickResult.error) {
        console.warn('[Hub polling] 태동 횟수 조회 실패:', kickResult.error)
      } else {
        setKickCount(kickResult.count ?? 0)
      }

      if (deviceFeedResult.error) {
        console.warn('[Hub polling] device_events feed 조회 실패:', deviceFeedResult.error)
      }

      if (symptomFeedResult.error) {
        console.warn('[Hub polling] symptom_logs feed 조회 실패:', symptomFeedResult.error)
      }

      if (!deviceFeedResult.error && !symptomFeedResult.error) {
        setFeed(
          mergeFeedItems(
            (deviceFeedResult.data as DeviceEvent[]) ?? [],
            (symptomFeedResult.data as SymptomLog[]) ?? [],
          ),
        )
      }

      if (moodResult.error) {
        console.warn('[Hub polling] moods 조회 실패:', moodResult.error)
      } else if (moodResult.data) {
        setWifeTodayMood(moodResult.data as WifeMood)
      }

      if (diaryResult.error) {
        console.warn('[Hub polling] symptom_logs diary 조회 실패:', diaryResult.error)
      } else if (diaryResult.data) {
        setWifeLatestDiary(diaryResult.data as WifeDiary)
      }

      if (messagesResult.error) {
        console.warn('[Hub polling] messages 조회 실패:', messagesResult.error)
      }

      if (alertsResult.error) {
        console.warn('[Hub polling] alerts 조회 실패:', alertsResult.error)
      }

      if (modeRunsResult.error) {
        console.warn('[Hub polling] mode_runs 조회 실패:', modeRunsResult.error)
      } else {
        const latestModeRuns = ((modeRunsResult.data as ModeRunLog[]) ?? []).slice(0, 5)
        setModeRunLogs(latestModeRuns)
        setRecentModeRuns(latestModeRuns)
      }
    } catch (error) {
      console.warn('[Hub polling] snapshot fetch failed:', error)
    }
  }, [])

  fetchHubSnapshotRef.current = fetchHubSnapshot

  function applyThinQState(state: ThinQStateResponse) {
    setThinQState(state)
    setPm25(state.pm25)

    if (state.fallback) {
      setThinQFallbackWarning('실제 ThinQ API 실패, mock 응답 사용됨')
    }
  }

  async function refreshThinQStateAfterVoice() {
    try {
      const state = await fetchThinQStateFromApi()
      applyThinQState(state)
    } catch (error) {
      console.error('[hub voice] ThinQ state refresh failed:', error)
    }
  }

  useEffect(() => {
    async function pollThinQState() {
      try {
        const state = await fetchThinQStateFromApi()
        applyThinQState(state)
      } catch (error) {
        console.error('[hub] ThinQ 상태 조회 실패:', error)
      }
    }

    void pollThinQState()
    const timer = setInterval(pollThinQState, 30_000)

    return () => clearInterval(timer)
  }, [])

  async function fetchBriefing() {
    setIsBriefingLoading(true)
    setBriefingLoadFailed(false)

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
      return data.audioBase64 ?? ''
    } catch (error) {
      console.error('브리핑 생성 실패:', error)
      setBriefingLoadFailed(true)
      showToast('브리핑을 준비하지 못했어요', 'error')
      return ''
    } finally {
      setIsBriefingLoading(false)
    }
  }

  function getBriefingButtonLabel() {
    if (briefingLoadFailed) return '브리핑을 불러오지 못했어요'
    if (isBriefingLoading) return '브리핑 준비 중…'
    if (isBriefingPlaying) return '브리핑 재생 중'
    return '브리핑 듣기'
  }

  async function handlePlayBriefing() {
    if (isBriefingLoading || isBriefingPlaying) return

    try {
      let audioBase64 = briefingAudio

      if (!audioBase64) {
        audioBase64 = await fetchBriefing()
        if (!audioBase64) {
          setBriefingLoadFailed(true)
          return
        }
      }

      setBriefingLoadFailed(false)

      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`)
      briefingAudioRef.current = audio

      audio.onplay = () => {
        setIsBriefingPlaying(true)
        setIsBriefingLoading(false)
      }

      audio.onended = () => {
        setIsBriefingPlaying(false)
        setBriefingPlayed(true)
        briefingAudioRef.current = null
      }

      audio.onerror = () => {
        setIsBriefingPlaying(false)
        setIsBriefingLoading(false)
        setBriefingLoadFailed(true)
        briefingAudioRef.current = null
        showToast('브리핑 재생에 실패했어요', 'error')
      }

      await audio.play()
    } catch (error) {
      console.error('브리핑 재생 실패:', error)
      setIsBriefingLoading(false)
      setIsBriefingPlaying(false)
      setBriefingLoadFailed(true)
      showToast('브리핑 재생에 실패했어요', 'error')
    }
  }

  useEffect(() => {
    // 브리핑은 페이지 접속만으로 생성/재생하지 않고 버튼 클릭이나 사용자 발화 때만 호출해요.
  }, [])

  useEffect(() => {
    return () => {
      briefingAudioRef.current?.pause()
      briefingAudioRef.current = null
      stopVoiceResponseAudio()
    }
  }, [])

  function stopVoiceResponseAudio() {
    if (voiceResponseAudioRef.current) {
      voiceResponseAudioRef.current.pause()
      voiceResponseAudioRef.current = null
    }
    if (voiceAudioUrlRef.current) {
      URL.revokeObjectURL(voiceAudioUrlRef.current)
      voiceAudioUrlRef.current = null
    }
  }

  function stripTextForTts(text: string) {
    return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()
  }

  async function playVoiceResponse(text: string) {
    const cleaned = stripTextForTts(text)
    if (!cleaned) return

    stopVoiceResponseAudio()

    try {
      setVoiceSpeakStatus('preparing')

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleaned, voice: 'hub' }),
      })

      if (!res.ok) {
        throw new Error('TTS 생성 실패')
      }

      const audioBlob = await res.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      voiceAudioUrlRef.current = audioUrl

      const audio = new Audio(audioUrl)
      voiceResponseAudioRef.current = audio

      audio.onplay = () => setVoiceSpeakStatus('speaking')

      audio.onended = () => {
        setVoiceSpeakStatus('done')
        stopVoiceResponseAudio()
      }

      audio.onerror = () => {
        setVoiceSpeakStatus('failed')
        stopVoiceResponseAudio()
      }

      await audio.play()
    } catch (error) {
      console.error('AI 응답 음성 재생 실패:', error)
      setVoiceSpeakStatus('failed')
      stopVoiceResponseAudio()
    }
  }

  async function playBabyVoiceAudio(base64: string) {
    stopVoiceResponseAudio()

    try {
      setVoiceSpeakStatus('preparing')
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`)
      voiceResponseAudioRef.current = audio

      audio.onplay = () => setVoiceSpeakStatus('speaking')
      audio.onended = () => {
        setVoiceSpeakStatus('done')
        voiceResponseAudioRef.current = null
      }
      audio.onerror = () => {
        setVoiceSpeakStatus('failed')
        voiceResponseAudioRef.current = null
      }

      await audio.play()
    } catch (error) {
      console.error('아가 음성 자동 재생 실패:', error)
      setVoiceSpeakStatus('failed')
      voiceResponseAudioRef.current = null
    }
  }

  function getVoiceSpeakStatusLabel() {
    if (voiceSpeakStatus === 'preparing') return '음성 준비 중…'
    if (voiceSpeakStatus === 'speaking') return 'AI가 답변 중이에요 🔊'
    if (voiceSpeakStatus === 'done') return '음성 재생 완료'
    if (voiceSpeakStatus === 'failed') return '음성 재생에 실패했지만 요청은 처리되었어요.'
    return ''
  }

  useEffect(() => {
    const updateTime = () => setCurrentTime(getCurrentTimeLabel())

    updateTime()
    const timer = setInterval(updateTime, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    function clearReconnectTimer() {
      if (hubRealtimeReconnectTimerRef.current) {
        clearTimeout(hubRealtimeReconnectTimerRef.current)
        hubRealtimeReconnectTimerRef.current = null
      }
    }

    function removeHubRealtimeChannel() {
      if (hubRealtimeChannelRef.current) {
        supabase.removeChannel(hubRealtimeChannelRef.current)
        hubRealtimeChannelRef.current = null
      }
    }

    function scheduleReconnect() {
      clearReconnectTimer()
      hubRealtimeReconnectTimerRef.current = setTimeout(() => {
        hubRealtimeReconnectTimerRef.current = null
        if (!cancelled) {
          setRealtimeStatus('connecting')
          subscribeHubRealtime()
        }
      }, 30_000)
    }

    function handleDeviceEventInsert(payload: { new: Record<string, unknown> }) {
      const event = payload.new as DeviceEvent

      setLatestDeviceEvent(event)

      if (event.event_type === 'NAUSEA_MODE' && isToday(event.created_at)) {
        setNauseaCount((prev) => prev + 1)
      }

      setFeed((prev) => [deviceEventToFeedItem(event), ...prev].slice(0, 10))
    }

    function handleSymptomLogInsert(payload: { new: Record<string, unknown> }) {
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

      setFeed((prev) => [symptomLogToFeedItem(log), ...prev].slice(0, 10))
    }

    function handleMoodInsert(payload: { new: Record<string, unknown> }) {
      const mood = payload.new as WifeMood & { created_at: string }
      if (isToday(mood.created_at)) {
        setWifeTodayMood({ mood: mood.mood, emoji: mood.emoji })
      }
    }

    function subscribeHubRealtime() {
      removeHubRealtimeChannel()

      const channel = supabase
        .channel(createHubRealtimeChannelName())
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'device_events',
            filter: `user_id=eq.${DEMO_WIFE_ID}`,
          },
          handleDeviceEventInsert,
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'symptom_logs',
            filter: `user_id=eq.${DEMO_WIFE_ID}`,
          },
          handleSymptomLogInsert,
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'moods',
            filter: `user_id=eq.${DEMO_WIFE_ID}`,
          },
          handleMoodInsert,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          () => {
            void fetchHubSnapshotRef.current?.()
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'alerts',
          },
          () => {
            void fetchHubSnapshotRef.current?.()
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hearts',
          },
          () => {
            void fetchHubSnapshotRef.current?.()
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mode_runs',
          },
          () => {
            void fetchHubSnapshotRef.current?.()
          },
        )
        .subscribe((status) => {
          console.log('[Realtime] hub status:', status)

          if (status === 'SUBSCRIBED') {
            clearReconnectTimer()
            setRealtimeStatus('connected')
            return
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            console.warn('[Realtime] Hub 구독 대기 중:', status)
            setRealtimeStatus('disconnected')
            scheduleReconnect()
          }
        })

      hubRealtimeChannelRef.current = channel
    }

    subscribeHubRealtime()

    return () => {
      cancelled = true
      clearReconnectTimer()
      removeHubRealtimeChannel()
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function runSnapshot() {
      if (!mounted) return
      await fetchHubSnapshot()
    }

    void runSnapshot()
    const interval = window.setInterval(() => {
      void runSnapshot()
    }, 30_000)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [fetchHubSnapshot])

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

  function getPregnancyWeekFromUrl() {
    const weeksParam = searchParams.get('weeks')
    const parsedWeeks = weeksParam ? Number(weeksParam) : undefined
    return parsedWeeks !== undefined &&
      Number.isInteger(parsedWeeks) &&
      parsedWeeks >= 1 &&
      parsedWeeks <= 42
      ? parsedWeeks
      : undefined
  }

  function isMorningBriefingPrompt(text: string) {
    return /굿모닝|좋은\s*아침|나\s*일어났어|기상|일어났어/.test(text)
  }

  async function playBase64Voice(audioBase64: string) {
    if (!audioBase64) return
    await playBabyVoiceAudio(audioBase64)
  }

  async function executeNaturalLanguage(text: string, source = 'hub_voice') {
    const trimmed = text.trim()
    if (!trimmed || isExecuting) return

    console.log('[hub] natural language execute start:', { text: trimmed, source })

    setLastSubmittedText(trimmed)
    stopVoiceResponseAudio()
    setIsExecuting(true)
    setVoiceState('executing')
    setVoiceSpeakStatus('idle')
    setVoiceMessage('')
    setVoiceNeedsRetry(false)
    setBabyMessage('')
    setAudioBase64('')

    try {
      const pregnancyWeek = getPregnancyWeekFromUrl()
      console.log('[hub] natural language pregnancy week:', pregnancyWeek)

      if (isMorningBriefingPrompt(trimmed)) {
        const response = await fetch('/api/briefing/morning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, triggerText: trimmed, pregnancyWeek }),
        })
        const data = (await response.json()) as MorningBriefingResponse

        if (!response.ok || !data.success) {
          throw new Error(data.error ?? '굿모닝 브리핑 생성 실패')
        }

        const result: LastModeResult = {
          mode: 'MORNING_BRIEFING',
          modeLabel: '굿모닝 브리핑',
          signals: ['기상', '아침 인사'],
          reply: data.wifeBriefing,
          wifeCard: data.wifeBriefing,
          husbandCard: data.husbandBriefing,
          deviceResults: [],
          recommendedModes: data.recommendedModes,
        }

        setLastModeResult(result)
        setVoiceMessage(data.wifeBriefing)
        setBriefingText(data.wifeBriefing)
        setBriefingAudio(data.audioBase64)
        setVoiceStatus('done')
        await playBase64Voice(data.audioBase64)
        await fetchHubSnapshot()
        return
      }

      const response = await fetch('/api/mother-together/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, source, pregnancyWeek }),
      })
      const data = (await response.json()) as MotherTogetherExecuteResponse

      console.log('[hub] mother-together execute response:', {
        ok: response.ok,
        success: data.success,
        mode: data.mode,
        deviceResults: data.deviceResults,
        error: data.error,
      })

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'AI 모드 실행 실패')
      }

      if (data.redirect && data.type === 'MORNING_BRIEFING') {
        const briefingResponse = await fetch('/api/briefing/morning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, triggerText: trimmed, pregnancyWeek }),
        })
        const briefingData = (await briefingResponse.json()) as MorningBriefingResponse

        if (!briefingResponse.ok || !briefingData.success) {
          throw new Error(briefingData.error ?? '굿모닝 브리핑 생성 실패')
        }

        const result: LastModeResult = {
          mode: 'MORNING_BRIEFING',
          modeLabel: '굿모닝 브리핑',
          signals: ['기상', '아침 인사'],
          reply: briefingData.wifeBriefing,
          wifeCard: briefingData.wifeBriefing,
          husbandCard: briefingData.husbandBriefing,
          deviceResults: [],
          recommendedModes: briefingData.recommendedModes,
        }

        setLastModeResult(result)
        setVoiceMessage(briefingData.wifeBriefing)
        setBriefingText(briefingData.wifeBriefing)
        setBriefingAudio(briefingData.audioBase64)
        setVoiceStatus('done')
        await playBase64Voice(briefingData.audioBase64)
        await fetchHubSnapshot()
        return
      }

      const result: LastModeResult = {
        mode: data.mode,
        modeLabel: data.modeLabel,
        signals: data.signals,
        reply: data.reply,
        wifeCard: data.wifeCard,
        husbandCard: data.husbandCard,
        deviceResults: data.deviceResults,
      }

      setLastModeResult(result)
      setVoiceMessage(data.reply)
      setVoiceStatus('done')
      await playBase64Voice(data.audioBase64)
      await refreshThinQStateAfterVoice()
      await fetchHubSnapshot()
      console.log('[hub] natural language execute complete:', {
        mode: data.mode,
        source,
      })
    } catch (error) {
      console.error('AI 자연어 실행 실패:', error)
      setVoiceStatus('idle')
      setVoiceMessage('')
      showToast('AI가 요청을 처리하지 못했어요. 다시 시도해주세요', 'error')
    } finally {
      setIsExecuting(false)
      setVoiceState('idle')
    }
  }

  function handleNaturalLanguageSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) {
      showToast('상태를 한 문장으로 입력해주세요', 'error')
      return
    }

    void executeNaturalLanguage(trimmed, 'hub_text')
  }

  function handleExamplePromptClick(prompt: string) {
    setInputText(prompt)
    setNaturalLanguageText(prompt)
    void executeNaturalLanguage(prompt, 'example_chip')
  }

  async function processVoiceAudio(blob: Blob) {
    setVoiceState('analyzing')
    setVoiceStatus('processing')

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as VoiceApiResponse
      if (!response.ok) {
        throw new Error(data.error ?? '음성 API 요청 실패')
      }

      const transcript = data.transcript?.trim()
      if (!transcript) {
        setVoiceStatus('idle')
        setVoiceState('idle')
        showToast('음성을 이해하지 못했어요. 다시 말해주세요', 'error')
        return
      }

      await executeNaturalLanguage(transcript, 'hub_voice')
    } catch (error) {
      console.error('음성 트리거 실패:', error)
      setVoiceState('idle')
      setVoiceStatus('idle')
      setVoiceMessage('')
      showToast('음성 분석에 실패했어요. 다시 시도해주세요', 'error')
    }
  }

  async function handleVoicePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault()
    if (voiceState !== 'idle' || isExecuting) return

    stopVoiceResponseAudio()
    setVoiceSpeakStatus('idle')
    setVoiceMessage('')
    setVoiceNeedsRetry(false)
    setBabyMessage('')
    setAudioBase64('')
    setVoiceStatus('recording')
    setVoiceState('recording')
    isPointerRecordingRef.current = true
    recordingStartTimeRef.current = Date.now()
    voiceChunksRef.current = []

    try {
      e.currentTarget.setPointerCapture(e.pointerId)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      if (!isPointerRecordingRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        setVoiceStatus('idle')
        setVoiceState('idle')
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
          setVoiceState('idle')
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
        setVoiceState('idle')
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
      setVoiceState('idle')
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
    setVoiceState('idle')
  }

  function handlePlayBabyVoice() {
    if (!audioBase64) return

    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`)
    audio.play().catch((error) => {
      console.error('아가 음성 재생 실패:', error)
    })
  }

  const detectedCareState = getDetectedCareState(latestDeviceEvent, wifeTodayMood, wifeLatestDiary)
  const latestCareAction = latestDeviceEvent
    ? getCareActionLabel(latestDeviceEvent.event_type)
    : '아직 AI 케어 실행 없음'
  const careResultLabel = thinQState?.fallback
    ? 'mock 응답 — 실제 기기 미확인'
    : thinQState
      ? '적용 완료'
      : '확인 중'

  const recentCareItems = feed.filter(
    (item) => item.device_status || item.triggered_by === 'VOICE' || item.triggered_by === 'APP',
  ).slice(0, 5)

  const deviceStatus =
    thinQState != null
      ? thinQStateToDeviceStatus(thinQState)
      : latestDeviceEvent?.device_status
  const isPowerOn = deviceStatus?.power === 'ON'
  const wifeMoodStyle = getMoodStyle(wifeTodayMood?.emoji)
  const pm25Status = getPm25Status(pm25)
  const pm25GaugeWidth = Math.min((pm25 / 76) * 100, 100)
  const realtimeBadge = getRealtimeStatusBadge(realtimeStatus)

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
          {thinQState?.fallback
            ? '⚠️ mock 데이터 — ThinQ API 연결 실패'
            : pm25 === 0
              ? '공기질 정보를 불러오는 중...'
              : '* ThinQ GET /state 실시간 데이터'}
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

  function renderCareStatus(large = false) {
    return (
      <div className={`space-y-3 ${large ? 'space-y-4' : ''}`}>
        <div className={`rounded-xl bg-purple-50 px-4 py-3 ${large ? 'py-4' : ''}`}>
          <p className={`text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>AI 감지 상태</p>
          <p className={`mt-1 font-semibold text-purple-700 ${large ? 'text-xl' : 'text-base'}`}>
            {detectedCareState}
          </p>
        </div>
        <div className={`rounded-xl bg-blue-50 px-4 py-3 ${large ? 'py-4' : ''}`}>
          <p className={`text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>실행 액션</p>
          <p className={`mt-1 font-semibold text-blue-700 ${large ? 'text-lg' : 'text-sm'}`}>
            {latestCareAction}
          </p>
          {latestDeviceEvent && (
            <p className={`mt-1 text-gray-400 ${large ? 'text-sm' : 'text-xs'}`}>
              {latestDeviceEvent.triggered_by === 'VOICE' ? '음성 명령 🎙️' : 'AI 자동 ✨'} ·{' '}
              {formatTime(latestDeviceEvent.created_at)}
            </p>
          )}
        </div>
        <div className={`rounded-xl px-4 py-3 ${large ? 'py-4' : ''} ${
          careResultLabel === '적용 완료' ? 'bg-green-50' : 'bg-amber-50'
        }`}>
          <p className={`text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>실행 결과</p>
          <p className={`mt-1 font-semibold ${
            careResultLabel === '적용 완료' ? 'text-green-700' : 'text-amber-700'
          } ${large ? 'text-lg' : 'text-sm'}`}>
            {careResultLabel}
          </p>
        </div>
      </div>
    )
  }

  function renderRecentCare(large = false) {
    if (recentCareItems.length === 0) {
      return <p className="text-sm text-gray-500">아직 AI 케어 기록이 없어요</p>
    }

    return (
      <ul className={large ? 'space-y-3' : 'space-y-2'}>
        {recentCareItems.map((item) => (
          <li
            key={item.id}
            className={`rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 ${large ? 'px-4 py-3' : ''}`}
          >
            <p className={`text-gray-800 ${large ? 'text-base' : 'text-sm'}`}>{item.label}</p>
            <p className={`mt-1 text-gray-400 ${large ? 'text-sm' : 'text-xs'}`}>
              {formatTime(item.created_at)}
              {item.triggered_by && ` · ${item.triggered_by === 'VOICE' ? '음성' : 'AI'}`}
            </p>
          </li>
        ))}
      </ul>
    )
  }

  function renderApplianceStatusCompact(large = false) {
    if (!deviceStatus) {
      return <p className="text-sm text-gray-500">기기 상태 조회 중…</p>
    }

    return (
      <div className={`space-y-3 ${large ? 'space-y-4' : ''}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full font-medium ${
              isPowerOn ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
            } ${large ? 'px-4 py-1.5 text-base' : 'px-3 py-1 text-sm'}`}
          >
            전원 {deviceStatus.power}
          </span>
          <span className={`text-gray-700 ${large ? 'text-base' : 'text-sm'}`}>
            모드: {getModeDisplayLabel(thinQState?.uiMode, deviceStatus.mode)}
          </span>
        </div>
        <p className={`font-bold text-gray-800 ${large ? 'text-3xl' : 'text-xl'}`}>
          PM2.5 <span className={pm25Status.textColor}>{pm25}</span>
          <span className={`ml-2 font-normal ${pm25Status.textColor} ${large ? 'text-base' : 'text-sm'}`}>
            {pm25Status.label}
          </span>
        </p>
        {thinQFallbackWarning && (
          <p className={`rounded-lg bg-red-50 px-3 py-2 text-red-600 ${large ? 'text-sm' : 'text-xs'}`}>
            ⚠️ {thinQFallbackWarning}
          </p>
        )}
        <p className={`text-gray-300 ${large ? 'text-xs' : 'text-[10px]'}`}>
          {thinQState?.fallback ? 'mock 데이터' : 'ThinQ GET /state 실시간'}
        </p>
      </div>
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
          필요할 때 브리핑을 들어보세요
        </p>
        <div className="mt-4">
          {isBriefingLoading && !briefingText ? (
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
            onClick={() => void handlePlayBriefing()}
            disabled={isBriefingLoading || isBriefingPlaying || briefingLoadFailed}
            className={`rounded-2xl bg-blue-500 font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60 ${
              large ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
            }`}
          >
            {getBriefingButtonLabel()} 🔊
          </button>
          <button
            type="button"
            onClick={() => void fetchBriefing()}
            disabled={isBriefingLoading || isBriefingPlaying}
            className={`text-blue-600 transition hover:text-blue-700 disabled:opacity-60 ${
              large ? 'text-base' : 'text-sm'
            }`}
          >
            다시 생성 🔄
          </button>
          {briefingPlayed && <span className="text-xs text-gray-400">재생 완료</span>}
        </div>
      </>
    )
  }

  function handleVoiceRetry() {
    stopVoiceResponseAudio()
    setVoiceSpeakStatus('idle')
    setVoiceMessage('')
    setVoiceNeedsRetry(false)
    setVoiceStatus('idle')
    setVoiceState('idle')
  }

  function getVoiceButtonLabel() {
    if (voiceState === 'recording') return '듣는 중... 🎙️'
    if (voiceState === 'analyzing') return '해석 중... ✨'
    if (voiceState === 'executing') return '환경 바꾸는 중... ✨'
    return '말하기 🎙️'
  }

  function getVoiceButtonClass() {
    if (voiceState === 'recording') return 'animate-pulse bg-red-500 text-white'
    if (voiceState === 'analyzing') return 'bg-purple-500 text-white'
    if (voiceState === 'executing') return 'bg-blue-500 text-white'
    return 'bg-gray-900 text-white hover:bg-gray-800'
  }

  function getDeviceStatusBadge(action: DeviceAction) {
    if (action.status === 'actual' && action.success === false) {
      return 'bg-red-100 text-red-700'
    }
    if (action.status === 'actual' && action.success !== false) {
      return 'bg-green-100 text-green-700'
    }
    if (action.status === 'planned') {
      return 'bg-yellow-100 text-yellow-700'
    }
    return 'bg-gray-100 text-gray-600'
  }

  function getDeviceStatusLabel(action: DeviceAction) {
    if (action.status === 'actual' && action.success === false) return '연결 실패 🩺'
    if (action.status === 'actual') return '실제 적용됨 🟢'
    if (action.status === 'planned') return '확장 예정 ✨'
    return '시연/Mock ✨'
  }

  function getModeCardBackground(mode: string) {
    if (mode === 'NAUSEA_MODE') return 'bg-rose-50 border-rose-100'
    if (mode === 'SLEEP_MODE') return 'bg-blue-50 border-blue-100'
    if (mode === 'HOUSEWORK_MODE') return 'bg-green-50 border-green-100'
    if (mode === 'TRAVEL_MODE') return 'bg-purple-50 border-purple-100'
    if (mode === 'MORNING_BRIEFING') return 'bg-amber-50 border-amber-100'
    return 'bg-gray-50 border-gray-100'
  }

  function getReplyFirstLine(reply?: string | null) {
    return reply?.split('\n').find((line) => line.trim())?.trim() ?? '실행 결과를 기록했어요.'
  }

  function renderAIInterpretationCard() {
    if (!lastModeResult) return null

    return (
      <section className={`rounded-[20px] border p-5 shadow-sm ${getModeCardBackground(lastModeResult.mode)}`}>
        <p className="text-sm font-semibold text-gray-700">AI 해석</p>
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500">감지된 생활 신호</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lastModeResult.signals.length > 0
                ? lastModeResult.signals.map((signal) => (
                    <span key={signal} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700">
                      {signal}
                    </span>
                  ))
                : <span className="text-sm text-gray-500">감지된 신호 없음</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">선택된 모드</p>
            <p className="mt-1 text-2xl font-bold text-gray-950">
              {MODE_EMOJIS[lastModeResult.mode] ?? '✨'} {lastModeResult.modeLabel}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">AI 응답</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-800">{lastModeResult.reply}</p>
            {getVoiceSpeakStatusLabel() && (
              <p className="mt-2 text-xs font-medium text-gray-500">{getVoiceSpeakStatusLabel()}</p>
            )}
          </div>
        </div>
      </section>
    )
  }

  function renderSelectedModeCard() {
    if (!lastModeResult) {
      return (
        <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">자동 선택된 모드</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            AI가 입력을 해석하면 입덧모드, 수면모드, 가사케어 모드, 여행 모드, 굿모닝 브리핑 중 하나를 선택해요.
          </p>
        </section>
      )
    }

    return (
      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">자동 선택된 모드</p>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-blue-50 px-5 py-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {MODE_EMOJIS[lastModeResult.mode] ?? '✨'} {lastModeResult.modeLabel}
            </p>
            <p className="mt-1 text-sm text-blue-700">
              {MODE_ACTION_DESCRIPTIONS[lastModeResult.mode] ?? 'ThinQ Mom이 집안 환경을 자동 조정합니다.'}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
            {lastModeResult.mode}
          </span>
        </div>
        {lastModeResult.recommendedModes && lastModeResult.recommendedModes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lastModeResult.recommendedModes.map((mode) => (
              <span key={mode} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                추천 {mode}
              </span>
            ))}
          </div>
        )}
      </section>
    )
  }

  function renderEnvironmentCard() {
    const deviceResults = lastModeResult?.deviceResults ?? []
    if (deviceResults.length === 0) return null

    return (
      <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">집이 바꾼 환경</h2>
        <ul className="mt-4 space-y-3">
          {deviceResults.map((action) => (
            <li key={`${action.device}-${action.action}`} className="rounded-[16px] border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{action.device}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-700">{action.label}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getDeviceStatusBadge(action)}`}>
                  {getDeviceStatusLabel(action)}
                </span>
              </div>
              {(action.message || action.executionMessage) && (
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                  {action.message ?? action.executionMessage}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  function renderVoiceTrigger(large = false) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex w-max gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleExamplePromptClick(prompt)}
                disabled={isExecuting || voiceState !== 'idle'}
                className="min-h-[44px] shrink-0 rounded-full border border-purple-100 bg-white px-4 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleNaturalLanguageSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              id="hub-natural-language"
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value)
                setNaturalLanguageText(e.target.value)
              }}
              placeholder="평소처럼 말씀해주세요"
              disabled={isExecuting}
              className={`min-h-[44px] min-w-0 flex-1 rounded-[16px] border border-gray-200 bg-white px-4 text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 disabled:opacity-60 ${
                large ? 'text-base' : 'text-sm'
              }`}
            />
            <button
              type="submit"
              disabled={isExecuting || !inputText.trim()}
              className={`min-h-[44px] shrink-0 rounded-[16px] bg-purple-600 px-4 font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 ${
                large ? 'text-base' : 'text-sm'
              }`}
            >
              전송
            </button>
          </div>
        </form>

        {lastSubmittedText && (
          <div className="rounded-[16px] border border-purple-100 bg-white/80 px-4 py-3">
            <p className="text-xs font-semibold text-purple-500">마지막 입력</p>
            <p className="mt-1 text-sm text-gray-800">&quot;{lastSubmittedText}&quot;</p>
          </div>
        )}

        <button
          type="button"
          onPointerDown={handleVoicePointerDown}
          onPointerUp={handleVoicePointerEnd}
          onPointerLeave={handleVoicePointerEnd}
          onPointerCancel={handleVoicePointerEnd}
          disabled={voiceState !== 'idle' && voiceState !== 'recording'}
          className={`min-h-[56px] w-full rounded-[20px] font-semibold transition select-none disabled:cursor-not-allowed disabled:opacity-60 ${
            large ? 'px-8 text-lg' : 'px-6 text-base'
          } ${getVoiceButtonClass()}`}
        >
          {voiceState === 'analyzing' || voiceState === 'executing' ? (
            <Spinner text={getVoiceButtonLabel()} />
          ) : getVoiceButtonLabel()}
        </button>
        <p className={`text-center text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>
          마이크 권한이 없어도 위 텍스트 입력과 예시 칩으로 같은 흐름을 테스트할 수 있어요.
        </p>
      </div>
    )
  }

  function renderModeRunLogs() {
    const logs = recentModeRuns.length > 0 ? recentModeRuns : modeRunLogs

    if (logs.length === 0) {
      return <p className="mt-3 text-sm text-gray-500">아직 실행 로그가 없어요</p>
    }

    return (
      <ul className="mt-4 space-y-3">
        {logs.map((log) => (
          <li key={log.id} className="rounded-[16px] border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">{MODE_EMOJIS[log.mode] ?? '✨'}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {log.mode_label || log.mode}
                </p>
                <p className="mt-1 text-xs text-gray-400">{formatTime(log.created_at)}</p>
                <p className="mt-2 line-clamp-1 text-xs text-gray-600">{getReplyFirstLine(log.reply)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  async function callHiddenThinQControl(command: string) {
    try {
      const response = await fetch('/api/thinq/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'ThinQ 제어 실패')
      await refreshThinQStateAfterVoice()
    } catch (error) {
      console.warn('[hub hidden manual control] failed:', error)
      showToast('수동 제어에 실패했어요', 'error')
    }
  }

  function renderHiddenManualControls() {
    return (
      <div className="hidden">
        {/* 비상 복구용 수동 ThinQ 제어. 필요하면 className="hidden"을 제거해 다시 노출할 수 있어요. */}
        {(['MODE_AUTO', 'MODE_TURBO', 'MODE_SLEEP', 'MODE_SAVING', 'POWER_ON', 'POWER_OFF'] as const).map((command) => (
          <button
            key={command}
            type="button"
            onClick={() => void callHiddenThinQControl(command)}
            className="min-h-[44px] rounded-[16px] bg-gray-900 px-4 text-sm font-semibold text-white"
          >
            {command}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-gradient-to-b from-slate-50 to-white text-gray-900">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="mx-auto min-h-dvh w-full max-w-[430px] px-4 pb-28 pt-5">
        <header className="mb-5">
          <button
            type="button"
            onClick={navigateToSelect}
            className="mb-4 min-h-[44px] text-sm font-medium text-gray-500 transition hover:text-gray-700"
          >
            ← 홈으로
          </button>
          <h1 className="flex items-center gap-3 text-[26px] font-bold leading-tight text-gray-950">
            <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <ellipse cx="16" cy="14" rx="12" ry="11" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
              <circle cx="13" cy="11" r="1.5" fill="#CBD5E1" />
              <circle cx="16" cy="10" r="1.5" fill="#CBD5E1" />
              <circle cx="19" cy="11" r="1.5" fill="#CBD5E1" />
              <ellipse cx="16" cy="24" rx="12" ry="3" fill="#DBEAFE" />
              <ellipse cx="16" cy="24" rx="8" ry="1.5" fill="#3B82F6" opacity="0.8" />
            </svg>
            LG ThinQ ON AI Hub
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            평소처럼 말하면 AI가 집안 환경을 바꿔줘요.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500 shadow-sm">
              {getTodayLabel()}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${realtimeBadge.className}`}>
              {realtimeStatus === 'connected' ? realtimeBadge.label : '실시간 연결 대기 중'}
            </span>
          </div>
        </header>

        <section className="rounded-[20px] border border-purple-100 bg-gradient-to-br from-purple-50 via-blue-50 to-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-purple-700">음성/텍스트 입력 🎙️</p>
          {renderVoiceTrigger()}
        </section>

        <main className="mt-5 space-y-5">
          {renderAIInterpretationCard()}
          {renderEnvironmentCard()}

          <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">실행 로그 📝</h2>
            <p className="mt-1 text-sm text-gray-500">최근 5개 AI 모드 실행 기록이에요.</p>
            {renderModeRunLogs()}
          </section>

          <section className="rounded-[20px] border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">오늘의 브리핑 🔊</h2>
            <p className="mt-1 text-sm text-gray-500">버튼을 눌렀을 때만 음성이 재생돼요.</p>
            {renderBriefingContent()}
          </section>

          <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">ThinQ 연결 상태</h2>
                <p className="mt-1 text-sm text-gray-500">
                  수동 조작은 숨기고 현재 상태만 확인해요.
                </p>
              </div>
            </div>
            {renderApplianceStatusCompact()}
          </section>
        </main>

        {renderHiddenManualControls()}

        <div className="hidden">
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
                <CardTitleRow title="아내 컨디션 요약 🌸" cardId="wife-status" onExpand={setExpandedCard} className="mb-3" />
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
                <CardTitleRow title="현재 케어 상태 🫶" cardId="ai-care" onExpand={setExpandedCard} />
                {renderCareStatus()}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <CardTitleRow title="현재 가전 상태 🟢" cardId="air-purifier" onExpand={setExpandedCard} />
                {renderApplianceStatusCompact()}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <CardTitleRow title="최근 실행된 케어 📋" cardId="recent-care" onExpand={setExpandedCard} />
                {renderRecentCare()}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <CardTitleRow title="오늘 기록" cardId="today-stats" onExpand={setExpandedCard} />
                {renderTodayStats()}
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

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-100 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="min-h-[44px] rounded-[16px] bg-gray-900 text-xs font-semibold text-white">
            AI Hub 🎙️
          </button>
          <button
            type="button"
            onClick={() => router.push('/wife')}
            className="min-h-[44px] rounded-[16px] bg-gray-100 text-xs font-semibold text-gray-600"
          >
            아내 화면 🌸
          </button>
          <button
            type="button"
            onClick={() => router.push('/husband')}
            className="min-h-[44px] rounded-[16px] bg-gray-100 text-xs font-semibold text-gray-600"
          >
            남편 화면 💙
          </button>
        </div>
      </nav>

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

            {expandedCard === 'ai-care' && renderCareStatus(true)}

            {expandedCard === 'recent-care' && renderRecentCare(true)}

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

            <h2 className="pr-8 text-base font-semibold text-gray-900">아내 현재 상태 🌸</h2>
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

            <h2 className="mb-4 pr-8 text-base font-semibold text-gray-900">실시간 이벤트 피드 전체 📝</h2>

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
