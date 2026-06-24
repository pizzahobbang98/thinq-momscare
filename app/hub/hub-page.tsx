'use client'

/* eslint-disable react-hooks/immutability, react-hooks/purity, react-hooks/refs */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'
import type { DeviceAction } from '@/lib/mode-actions'
import type { Mode } from '@/lib/ai-mode-router'
import type { ThinQCommand } from '@/lib/thinq-mock'
import Spinner from '@/components/Spinner'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import {
  formatDemoSceneUpdatedAt,
  getSimulationSceneLabel,
  persistDemoSceneChange,
  readDemoSceneFromStorage,
  type DemoSceneSnapshot,
} from '@/lib/demo-simulation'
import { buildSelectUrl, buildWifeUrl } from '@/lib/role-navigation'
import {
  backgroundSyncCareLog,
  buildCareLogFromExecution,
  careLogToHubModeResult,
  careLogToModeRunLog,
  createCareLogId,
  mergeModeRunLogsWithLocal,
  readCareLogsFromLocalStorage,
  retryPendingCareLogSync,
  saveCareLogToLocalStorage,
} from '@/lib/care-log-storage'
import {
  HUB_LISTENING_BROADCAST_CHANNEL,
  HUB_LISTENING_STORAGE_KEY,
  publishHubListeningState,
  readHubListeningState,
  sendModeToSimulation,
  sendSimulationReset,
  sendVoiceCommandToSimulation,
  type HubListeningMessage,
  type Simulation3DVoiceIntentResult,
} from '@/lib/simulation-broadcast'
import {
  buildHubExecutionContext,
  resolveHubTravelDestinationForMode,
  resolveHubSimulationRoutine,
  type HubExecutionContext,
  type HubNaturalLanguageSource,
} from '@/lib/hub-natural-language'
import {
  findHubDemoUtteranceByLabel,
  getHubDemoUtterancesForTab,
  HUB_DEMO_MODE_TABS,
  HUB_DEMO_TAB_STYLES,
  HUB_DEMO_TRAVEL_SUB_TABS,
  PREPARING_HUB_DEMO_MODE_TABS,
  PREPARING_HUB_DEMO_UTTERANCES,
  type HubDemoModeTab,
  type HubDemoUtterance,
} from '@/lib/hub-demo-utterances'
import {
  logSimulationTestModeApply,
  readSimulationTestMode,
  saveSimulationTestModeFromRoutine,
  SIMULATION_DESTINATION_STORAGE_KEY,
  SIMULATION_ROUTINE_STORAGE_KEY,
  SIMULATION_TEST_MODE_CHANGE_EVENT,
  SIMULATION_TEST_MODE_STORAGE_KEY,
  simulationTestModeToHubExecutionResult,
  shouldPreferSimulationTestMode,
  type SimulationTestModeSlug,
  type SimulationTestModeSnapshot,
} from '@/lib/simulation-test-mode-sync'
import {
  getTravelModeDisplayLabel,
  type SimulationRoutineId,
  type TravelDestination,
} from '@/lib/simulation-routine-bridge'
import { dispatchSimulationImmediately } from '@/lib/hub-simulation-dispatch'
import {
  buildOptimisticThinQState,
  dispatchThinQImmediatelyForHubMode,
  getThinQCommandForHubMode,
  type HubThinQStateSnapshot,
} from '@/lib/hub-thinq-dispatch'
import {
  buildPendingDeviceResults,
  resolveHubCareIntent,
} from '@/lib/voice-intent'
import {
  dispatchPreparationMode,
  resolvePreparationIntent,
} from '@/lib/preparation-intent'
import type { PreparationMode, SharedDemoState } from '@/lib/shared-demo-state'
import { triggerLocalLight } from '@/lib/hue-local-client'
import {
  DEFAULT_LIGHT_COLOR,
  getLightColorForHueMode,
  getLightPowerAction,
  resolveHueModeFromCareResult,
} from '@/lib/light-control'

type DeviceStatus = {
  power: string
  mode: string
  pm25?: number
}

const SIMULATION_VOICE_QUERY_TO_ROUTINE: Record<string, SimulationRoutineId> = {
  nausea: 'nausea_food',
  sleep: 'sleep_care',
  housework: 'housework_care',
  resort: 'destination_ocean',
  travel_ocean: 'destination_ocean',
  travel_forest: 'destination_forest',
  travel_city: 'destination_city',
}

const SIMULATION_VOICE_ROUTINE_TO_HUB_MODE: Record<SimulationRoutineId, Mode> = {
  nausea_food: 'NAUSEA_MODE',
  sleep_care: 'SLEEP_MODE',
  housework_care: 'HOUSEWORK_MODE',
  destination_ocean: 'TRAVEL_MODE',
  destination_forest: 'TRAVEL_MODE',
  destination_city: 'TRAVEL_MODE',
}

const DEMO_STATE_SYNC_INTERVAL_MS = 5_000

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
      <h2 className="hidden text-base font-semibold text-gray-900">{title}</h2>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onExpand(cardId)
        }}
        className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
        aria-label="확대"
      >
        <span className="hidden">⛶</span>
      </button>
    </div>
  )
}

type VoiceStatus = 'idle' | 'recording' | 'processing' | 'done'
type VoiceState = 'idle' | 'recording' | 'analyzing' | 'executing' | 'speaking'

const DEFAULT_CARE_RESET_DELAY_MS = 13_000
const HUB_COMMAND_DEDUPE_MS = 2400
const HUB_VOICE_LOCK_RELEASE_GRACE_MS = 2500

function getLightColorPatchFromCareResult(
  result: Pick<Simulation3DVoiceIntentResult, 'defaultMode' | 'lightAction' | 'lightPowerOff' | 'lightPowerOn' | 'routineId' | 'preparationMode' | 'queryMode'>,
): Pick<SharedDemoState, 'lightColor'> | Record<string, never> {
  const lightAction = getLightPowerAction(result)
  if (lightAction === 'off') return { lightColor: null }
  if (lightAction === 'on' || result.defaultMode) return { lightColor: DEFAULT_LIGHT_COLOR }

  const mode = resolveHueModeFromCareResult(result)
  return mode ? { lightColor: getLightColorForHueMode(mode) } : {}
}

function normalizeHubCommandKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?~。！？'"“”‘’()[\]{}<>:;·…，]/g, '')
    .replace(/\s+/g, '')
}

type VoiceApiResponse = {
  success?: boolean
  transcript?: string
  message?: string
  error?: string
}

type BrowserSpeechRecognitionResult = {
  isFinal: boolean
  0?: { transcript?: string }
}

type BrowserSpeechRecognitionEvent = {
  resultIndex: number
  results: {
    length: number
    [index: number]: BrowserSpeechRecognitionResult
  }
}

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: { error?: string; message?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type BabyVoiceAction = 'NAUSEA_MODE' | 'SLEEP_MODE' | 'AIR_ON' | 'AIR_OFF' | 'NONE'

type BabyVoiceResponse = {
  triggered: boolean
  message?: string
  audioBase64?: string
  action?: BabyVoiceAction
  error?: string
}

type ThinQMomExecuteResponse = {
  success: boolean
  partialSuccess?: boolean
  storageDelayed?: boolean
  redirect?: boolean
  type?: 'MORNING_BRIEFING'
  mode: string
  modeLabel: string
  confidence?: number
  signals: string[]
  reason?: string
  reply: string
  audioBase64: string
  wifeCard: string
  husbandCard: string
  deviceResults: DeviceAction[]
  simulationScene?: string | null
  simulationText?: string | null
  demoUpdatedAt?: string | null
  error?: string
}

type HubPanelNotice = {
  tone: 'info' | 'warning'
  message: string
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
  reason?: string
  reply: string
  wifeCard: string
  husbandCard: string
  deviceResults: DeviceAction[]
  recommendedModes?: string[]
  simulationScene?: string | null
  simulationText?: string | null
  demoUpdatedAt?: string | null
  partialSuccess?: boolean
  storageDelayed?: boolean
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

const HUB_MODE_DISPLAY_LABELS: Record<string, string> = {
  NAUSEA_MODE: '입덧모드',
  SLEEP_MODE: '수면모드',
  TRAVEL_MODE: '휴양지모드',
  MORNING_BRIEFING: '굿모닝 브리핑',
  AIR_ON: '공기청정기 켜기',
  AIR_OFF: '공기청정기 끄기',
  HOUSEWORK_MODE: '가사케어 모드',
  UNKNOWN: '다시 말해주세요',
}

const DEMO_MODE_TABS = HUB_DEMO_MODE_TABS

type DemoModeTab = HubDemoModeTab

function getHubModeDisplayLabel(mode: string, fallbackLabel?: string) {
  return HUB_MODE_DISPLAY_LABELS[mode] ?? fallbackLabel ?? mode
}

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

/** 패널이 열렸을 때만 텍스트/UI를 노출 */
function hubShow(panelVisible: boolean, className = '') {
  return panelVisible ? className.trim() : `hidden ${className}`.trim()
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

type ThinQControlResponse = {
  success?: boolean
  mock?: boolean
  fallback?: boolean
  error?: string
  deviceStatus?: Omit<ThinQStateResponse, 'mock' | 'fallback' | 'error'>
}

async function fetchThinQStateFromApi(): Promise<ThinQStateResponse> {
  console.log('[hub] calling /api/thinq/state')
  const response = await fetch('/api/thinq/state', { cache: 'no-store' })
  const data = (await response.json()) as ThinQStateResponse & { error?: string }

  console.log('[hub] thinq state response:', data)

  if (response.ok) {
    return data
  }

  console.warn('[hub] ThinQ state API failed, using client fallback:', data.error)
  return {
    power: 'ON',
    mode: 'NORMAL',
    pm25: 12,
    uiMode: 'AUTO',
    mock: true,
    fallback: true,
    error: data.error,
  }
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
    router.push(buildSelectUrl(searchParams.toString()))
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
  const [lastReply, setLastReply] = useState('')
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
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')
  const longestInterimTranscriptRef = useRef('')
  const voiceReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeRafRef = useRef<number | null>(null)
  const voiceLevelRef = useRef(0)
  const glowRef = useRef<HTMLDivElement | null>(null)
  const hubPressVibrationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hubRealtimeChannelRef = useRef<RealtimeChannel | null>(null)
  const lastHubExecutionTimestampRef = useRef(0)
  const recentHubCommandKeysRef = useRef<Map<string, number>>(new Map())
  const hubRealtimeReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const defaultCareResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hubVoiceLockReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchHubSnapshotRef = useRef<(() => Promise<void>) | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const [isHubPanelOpen, setIsHubPanelOpen] = useState(false)
  const [sharedCareState, setSharedCareState] = useState<'idle' | 'processing' | 'completed'>('idle')
  const sharedDemoContextRef = useRef<SharedDemoState | null>(null)
  const [sharedDemoContext, setSharedDemoContext] = useState<SharedDemoState | null>(null)
  const [demoSceneStatus, setDemoSceneStatus] = useState<DemoSceneSnapshot | null>(null)
  const [showDemoSceneLog, setShowDemoSceneLog] = useState(false)
  const [hubPanelNotice, setHubPanelNotice] = useState<HubPanelNotice | null>(null)
  const [hubVoiceNotice, setHubVoiceNotice] = useState<string | null>(null)
  const [activeDemoModeTab, setActiveDemoModeTab] = useState<DemoModeTab>('NAUSEA_MODE')
  const [activePreparationDemoMode, setActivePreparationDemoMode] =
    useState<PreparationMode>('condition')
  const [activeTravelDestinationTab, setActiveTravelDestinationTab] =
    useState<TravelDestination>('ocean')
  const [lastTravelDestination, setLastTravelDestination] =
    useState<TravelDestination | null>(null)
  const [lastSimulationRoutineId, setLastSimulationRoutineId] =
    useState<SimulationRoutineId | null>(null)
  const [externalHubListening, setExternalHubListening] = useState(() => readHubListeningState())

  useEffect(() => {
    return () => {
      if (volumeRafRef.current != null) {
        cancelAnimationFrame(volumeRafRef.current)
        volumeRafRef.current = null
      }
      const ctx = audioContextRef.current
      if (ctx) {
        void ctx.close().catch(() => {})
        audioContextRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const applyMessage = (message: Partial<HubListeningMessage>) => {
      if (message.type !== 'HUB_LISTENING_STATE') return
      setExternalHubListening(Boolean(message.listening))
    }

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(HUB_LISTENING_BROADCAST_CHANNEL)
      channel.onmessage = (event: MessageEvent<HubListeningMessage>) => {
        applyMessage(event.data)
      }
    } catch {
      channel = null
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== HUB_LISTENING_STORAGE_KEY || !event.newValue) return
      try {
        applyMessage(JSON.parse(event.newValue) as Partial<HubListeningMessage>)
      } catch {
        // Ignore malformed storage payloads from older sessions.
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      channel?.close()
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  function closeHubPanel() {
    setIsHubPanelOpen(false)
    setExpandedCard(null)
  }

  function refreshDemoSceneStatus() {
    setDemoSceneStatus(readDemoSceneFromStorage())
  }

  function applyDemoSceneFromExecute(data: Pick<
    ThinQMomExecuteResponse,
    'mode' | 'modeLabel' | 'simulationScene' | 'simulationText' | 'demoUpdatedAt'
  >) {
    if (!data.simulationScene) return

    persistDemoSceneChange({
      mode: data.mode,
      modeLabel: getHubModeDisplayLabel(data.mode, data.modeLabel),
      simulationScene: data.simulationScene,
      simulationText: data.simulationText,
      demoUpdatedAt: data.demoUpdatedAt,
    })
    refreshDemoSceneStatus()
  }

  function applySimulationTestModeSnapshot(snapshot: SimulationTestModeSnapshot) {
    const applied = simulationTestModeToHubExecutionResult(snapshot)
    setLastModeResult(applied)
    setLastSimulationRoutineId(snapshot.routineId)
    setLastTravelDestination(snapshot.travelDestination ?? null)
    logSimulationTestModeApply('apply', snapshot, applied)
  }

  const syncSimulationTestModeFromStorage = useCallback(() => {
    const snapshot = readSimulationTestMode()
    logSimulationTestModeApply('read', snapshot, null)

    if (!snapshot) return false

    if (!shouldPreferSimulationTestMode(snapshot, lastHubExecutionTimestampRef.current)) {
      return false
    }

    applySimulationTestModeSnapshot(snapshot)
    return true
  }, [])

  function commitHubModeExecution(options: {
    inputText: string
    source: string
    mode: string
    modeLabel: string
    signals: string[]
    reason?: string
    reply: string
    wifeCard: string
    husbandCard: string
    deviceResults: DeviceAction[]
    simulationScene?: string | null
    simulationText?: string | null
    demoUpdatedAt?: string | null
    partialSuccess?: boolean
    recommendedModes?: string[]
    careLogId?: string
    serverSynced?: boolean
    travelDestination?: TravelDestination | null
    forcedRoutineId?: SimulationRoutineId | null
    simulationModeSlug?: SimulationTestModeSlug | null
    lightMode?: string | null
    skipSimulation?: boolean
  }) {
    const baseLabel = getHubModeDisplayLabel(options.mode, options.modeLabel)
    const sharedContext = sharedDemoContextRef.current
    const contextPregnancyStatus =
      sharedContext?.pregnancyStatus ?? getPregnancyStatusFromUrl()
    const contextRole = sharedContext?.role ?? getRoleFromUrl()
    const contextPregnancyWeek =
      sharedContext?.pregnancyWeek ?? getPregnancyWeekFromUrl()
    const contextualSignals = Array.from(new Set([
      ...options.signals,
      `상태:${contextPregnancyStatus}`,
      `역할:${contextRole}`,
    ]))
    const travelDestination = resolveHubTravelDestinationForMode(
      options.mode,
      options.inputText,
      buildHubExecutionContext(options.inputText, {
        travelDestination: options.travelDestination,
      }),
    )
    const displayLabel =
      options.mode === 'TRAVEL_MODE'
        ? getTravelModeDisplayLabel(baseLabel, travelDestination)
        : baseLabel

    const careLog = buildCareLogFromExecution({
      id: options.careLogId,
      inputText: options.inputText,
      source: options.source,
      mode: options.mode,
      modeLabel: displayLabel,
      signals: contextualSignals,
      reason: options.reason,
      reply: options.reply,
      wifeCard: options.wifeCard,
      husbandCard: options.husbandCard,
      deviceResults: options.deviceResults,
      simulationScene: options.simulationScene,
      simulationText: options.simulationText,
      recommendedModes: options.recommendedModes,
      synced: options.serverSynced ?? false,
    })

    // 1) localStorage 즉시 저장 (Supabase보다 우선)
    const savedLog = saveCareLogToLocalStorage(careLog)

    // 2) 화면 상태 업데이트
    const result: LastModeResult = {
      mode: options.mode,
      modeLabel: displayLabel,
      signals: contextualSignals,
      reason: options.reason,
      reply: options.reply,
      wifeCard: options.wifeCard,
      husbandCard: options.husbandCard,
      deviceResults: options.deviceResults,
      recommendedModes: options.recommendedModes,
      simulationScene: options.simulationScene,
      simulationText: options.simulationText,
      demoUpdatedAt: options.demoUpdatedAt ?? savedLog.createdAt,
      partialSuccess: options.partialSuccess,
    }

    setLastModeResult(result)

    const localModeRun = careLogToModeRunLog(savedLog)
    setModeRunLogs((prev) => {
      const merged = mergeModeRunLogsWithLocal(prev, [savedLog])
      if (merged.some((log) => log.id === localModeRun.id)) return merged
      return [localModeRun, ...prev].slice(0, 5)
    })
    setRecentModeRuns((prev) => {
      const merged = mergeModeRunLogsWithLocal(prev, [savedLog])
      if (merged.some((log) => log.id === localModeRun.id)) return merged
      return [localModeRun, ...prev].slice(0, 5)
    })

    applyDemoSceneFromExecute({
      mode: options.mode,
      modeLabel: displayLabel,
      simulationScene: options.simulationScene,
      simulationText: options.simulationText,
      demoUpdatedAt: options.demoUpdatedAt,
    })

    const routineId =
      options.forcedRoutineId ??
      resolveHubSimulationRoutine(
        options.mode,
        options.inputText,
        buildHubExecutionContext(options.inputText, { travelDestination }),
      )

    console.log('[hub] 3D routine dispatch context:', {
      mode: options.mode,
      source: options.source,
      travelDestination,
      routineId,
      skipSimulation: options.skipSimulation ?? false,
    })

    if (!options.skipSimulation) {
      sendModeToSimulation(options.mode, displayLabel, {
        travelDestination: travelDestination ?? options.travelDestination ?? null,
        inputText: options.inputText,
      })
    }

    if (options.mode === 'TRAVEL_MODE') {
      setLastTravelDestination(travelDestination)
    } else {
      setLastTravelDestination(null)
    }

    if (routineId) {
      setLastSimulationRoutineId(routineId)
    }

    const lightMode =
      options.lightMode ??
      routineId ??
      (
        options.mode !== 'UNKNOWN' && options.mode !== 'MORNING_BRIEFING'
          ? options.mode
          : null
      )
    const lightColorPatch = routineId
      ? getLightColorPatchFromCareResult({ routineId })
      : lightMode === 'default'
        ? { lightColor: DEFAULT_LIGHT_COLOR }
        : {}
    if (lightMode) {
      void triggerLocalLight({
        action: 'mode',
        mode: lightMode,
        effect: options.mode === 'UNKNOWN' ? 'solid' : 'gradient',
        source: options.source,
        commandId: options.careLogId,
      })
    }

    const lightModeKey = String(lightMode ?? '').trim().replace(/_/g, '-').toLowerCase()
    if (
      lightModeKey &&
      !['default', 'idle', 'air-off', 'off', 'morning-briefing'].includes(lightModeKey) &&
      options.mode !== 'UNKNOWN' &&
      options.mode !== 'MORNING_BRIEFING'
    ) {
      scheduleDefaultCareReset('hub_mode_idle_timeout')
    }

    void fetch('/api/demo-state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pregnancyStatus: contextPregnancyStatus,
        pregnancyWeek: contextPregnancyWeek,
        role: contextRole,
        currentRoutine: routineId ? options.mode : null,
        simulationRoutine: routineId,
        lightPower: 'on',
        ...lightColorPatch,
        latestHubInput: options.inputText,
        latestCareModeLabel: routineId ? displayLabel : null,
        careState: routineId ? 'completed' : 'idle',
      }),
    }).then((response) => {
      if (!response.ok) {
        console.warn('[hub] shared care flow update failed:', response.status)
      }
    }).catch((error) => {
      console.warn('[hub] shared care flow update failed:', error)
    })

    if (
      !options.skipSimulation &&
      routineId &&
      options.mode !== 'UNKNOWN' &&
      options.mode !== 'MORNING_BRIEFING'
    ) {
      lastHubExecutionTimestampRef.current = Date.now()
      saveSimulationTestModeFromRoutine(routineId!, 'hub-execute', {
        slug: options.simulationModeSlug ?? undefined,
      })
    }

    // 3) Supabase는 백그라운드 동기화 (실패해도 화면은 유지)
    backgroundSyncCareLog(savedLog, options.serverSynced ?? false)

    const hasPendingDevice = options.deviceResults.some(
      (action) => action.executionMessage === '요청 중',
    )

    if (options.mode === 'UNKNOWN') {
      setHubPanelNotice({
        tone: 'info',
        message: '조금 더 구체적으로 말해주시면 케어 모드를 찾아볼게요.',
      })
    } else if (hasPendingDevice) {
      setHubPanelNotice({
        tone: 'info',
        message:
          options.skipSimulation
            ? '3D 공간을 먼저 적용했어요. 공기청정기 작동을 요청하고 있어요.'
            : '공기청정기 작동을 요청하고 있어요.',
      })
    } else if (options.partialSuccess) {
      setHubPanelNotice({
        tone: 'warning',
        message: '일부 실제 기기 연결을 확인해주세요. 3D scene과 화면 업데이트는 계속 진행됩니다.',
      })
    } else {
      setHubPanelNotice({
        tone: 'info',
        message: '오늘의 케어 기록에 추가됐어요.',
      })
    }
  }

  function getPhysicalDeviceResults(results: DeviceAction[] = []) {
    return results.filter((action) => action.device !== 'DEMO_SIMULATION')
  }

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
          .neq('mode', 'DEMO_STATE')
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
        const localLogs = readCareLogsFromLocalStorage()
        const localModeRuns = localLogs.map(careLogToModeRunLog).slice(0, 5)
        setModeRunLogs(localModeRuns)
        setRecentModeRuns(localModeRuns)
      } else {
        const remoteLogs = ((modeRunsResult.data as ModeRunLog[]) ?? []).slice(0, 5)
        const localLogs = readCareLogsFromLocalStorage()
        const mergedLogs = mergeModeRunLogsWithLocal(remoteLogs, localLogs)
        setModeRunLogs(mergedLogs)
        setRecentModeRuns(mergedLogs)
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
      const isDisconnected = state.error?.includes('Not connected device')
      setThinQFallbackWarning(
        isDisconnected
          ? '실물 공기청정기가 연결되지 않아 시연용 mock 상태를 표시하고 있어요.'
          : '실제 ThinQ API 실패, mock 응답 사용됨',
      )
    } else {
      setThinQFallbackWarning(null)
    }
  }

  function applyHubThinQSnapshot(state: HubThinQStateSnapshot) {
    applyThinQState(state)
  }

  function triggerImmediateThinQControl(hubMode: Mode, currentPm25 = pm25) {
    dispatchThinQImmediatelyForHubMode(hubMode, {
      currentPm25,
      onOptimisticState: applyHubThinQSnapshot,
      onResolvedState: applyHubThinQSnapshot,
      onError: () => {
        void refreshThinQStateAfterVoice()
      },
    })
  }

  function buildImmediateDeviceResults(hubMode: Mode, currentPm25 = pm25): DeviceAction[] {
    const command = getThinQCommandForHubMode(hubMode)
    if (!command) return []

    const snapshot = buildOptimisticThinQState(command, currentPm25)
    return [{
      device: '공기청정기',
      action: command,
      label: snapshot.uiMode === 'SLEEP' ? '공기청정기 수면 모드' : '공기청정기 자동 모드',
      status: 'actual',
      thinqCommand: command,
      success: true,
      executionStatus: 'success',
      executionMessage: '즉시 적용',
      executedAt: new Date().toISOString(),
      deviceStatus: {
        power: snapshot.power,
        mode: snapshot.mode,
        jobMode: snapshot.jobMode,
        fanSpeed: snapshot.fanSpeed,
        pm25: snapshot.pm25,
        uiMode: snapshot.uiMode,
      },
      mock: snapshot.mock,
      fallback: snapshot.fallback,
    }]
  }

  function buildPreparationEnvironmentResults(mode: PreparationMode): DeviceAction[] {
    const presentation = {
      condition: {
        screen: '모닝 스트레칭',
        light: '세이지 골드 자연광',
      },
      'sleep-rhythm': {
        screen: '수면 호흡 가이드',
        light: '문라이트 인디고 저자극 조명',
      },
      refresh: {
        screen: '숲길 호흡 영상',
        light: '민트 라벤더 조명',
      },
      'rest-ready': {
        screen: '잔잔한 휴식 플레이리스트',
        light: '코지 앰버 조명',
      },
      'couple-routine': {
        screen: '둘만의 플레이리스트',
        light: '로즈 앰버 라운지 조명',
      },
    }[mode]

    return [
      {
        device: '스탠바이미',
        action: presentation.screen,
        label: presentation.screen,
        status: 'actual',
        success: true,
        executionStatus: 'success',
        executionMessage: '3D 시연 화면 적용',
        executedAt: new Date().toISOString(),
      },
      {
        device: '거실 조명',
        action: presentation.light,
        label: presentation.light,
        status: 'actual',
        success: true,
        executionStatus: 'success',
        executionMessage: '3D 시연 화면 적용',
        executedAt: new Date().toISOString(),
      },
    ]
  }

  async function refreshThinQStateAfterVoice() {
    try {
      const state = await fetchThinQStateFromApi()
      applyThinQState(state)
    } catch (error) {
      console.warn('[hub voice] ThinQ state refresh failed:', error)
    }
  }

  useEffect(() => {
    async function pollThinQState() {
      try {
        const state = await fetchThinQStateFromApi()
        applyThinQState(state)
      } catch (error) {
        console.warn('[hub] ThinQ 상태 조회 실패:', error)
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
      if (voiceReleaseTimerRef.current) {
        clearTimeout(voiceReleaseTimerRef.current)
        voiceReleaseTimerRef.current = null
      }
      if (hubVoiceLockReleaseTimerRef.current) {
        clearTimeout(hubVoiceLockReleaseTimerRef.current)
        hubVoiceLockReleaseTimerRef.current = null
      }
      try {
        speechRecognitionRef.current?.abort()
      } catch {}
      speechRecognitionRef.current = null
      publishHubListeningState(false, 'hub')
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
    setVoiceState((current) => (current === 'speaking' ? 'idle' : current))
  }

  function stripTextForTts(text: string) {
    return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()
  }

  async function playFastHubVoiceResponse(text: string) {
    const cleaned = stripTextForTts(text)
    if (!cleaned) return

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      await playVoiceResponse(cleaned)
      return
    }

    stopVoiceResponseAudio()

    await new Promise<void>((resolve) => {
      try {
        window.speechSynthesis.cancel()
        setVoiceSpeakStatus('speaking')
        setVoiceState('speaking')

        const utterance = new SpeechSynthesisUtterance(cleaned)
        utterance.lang = 'ko-KR'
        utterance.rate = 1.08
        utterance.pitch = 1
        utterance.volume = 1

        const voices = window.speechSynthesis.getVoices()
        const koreanVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('ko'))
        if (koreanVoice) utterance.voice = koreanVoice

        utterance.onend = () => {
          setVoiceSpeakStatus('done')
          setVoiceState('idle')
          resolve()
        }
        utterance.onerror = () => {
          setVoiceSpeakStatus('failed')
          setVoiceState('idle')
          resolve()
        }

        window.speechSynthesis.speak(utterance)
      } catch (error) {
        console.warn('[hub voice] fast browser TTS failed:', error)
        setVoiceSpeakStatus('failed')
        setVoiceState('idle')
        resolve()
      }
    })
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

      audio.onplay = () => {
        setVoiceSpeakStatus('speaking')
        setVoiceState('speaking')
      }

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          setVoiceSpeakStatus('done')
          stopVoiceResponseAudio()
          resolve()
        }

        audio.onerror = () => {
          setVoiceSpeakStatus('failed')
          stopVoiceResponseAudio()
          resolve()
        }

        audio.play().catch(reject)
      })
    } catch (error) {
      console.warn('AI 응답 음성 재생 실패:', error)
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

      await new Promise<void>((resolve) => {
        audio.onplay = () => {
          setVoiceSpeakStatus('speaking')
          setVoiceState('speaking')
          vibrateHub()
        }
        audio.onended = () => {
          setVoiceSpeakStatus('done')
          setVoiceState('idle')
          voiceResponseAudioRef.current = null
          resolve()
        }
        audio.onerror = () => {
          setVoiceSpeakStatus('failed')
          setVoiceState('idle')
          voiceResponseAudioRef.current = null
          resolve()
        }

        audio.play().catch((error) => {
          console.error('아가 음성 자동 재생 실패:', error)
          setVoiceSpeakStatus('failed')
          setVoiceState('idle')
          voiceResponseAudioRef.current = null
          resolve()
        })
      })
    } catch (error) {
      console.error('아가 음성 자동 재생 실패:', error)
      setVoiceSpeakStatus('failed')
      voiceResponseAudioRef.current = null
    }
  }

  function vibrateHub() {
    navigator.vibrate?.([40, 30, 40, 30, 40])
  }

  function startHubPressVibration() {
    if (!navigator.vibrate || hubPressVibrationTimerRef.current) return

    navigator.vibrate(55)
    hubPressVibrationTimerRef.current = setInterval(() => {
      navigator.vibrate(55)
    }, 140)
  }

  function stopHubPressVibration() {
    if (hubPressVibrationTimerRef.current) {
      clearInterval(hubPressVibrationTimerRef.current)
      hubPressVibrationTimerRef.current = null
    }

    navigator.vibrate?.(0)
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

    return () => {
      clearInterval(timer)
      stopHubPressVibration()
    }
  }, [])

  useEffect(() => {
    if (isHubPanelOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isHubPanelOpen])

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    async function syncSharedCareState() {
      if (inFlight) return
      inFlight = true

      try {
        const response = await fetch('/api/demo-state', { cache: 'no-store' })
        if (!response.ok) return
        const payload = (await response.json()) as {
          state?: SharedDemoState
        }
        if (!cancelled && payload.state) {
          sharedDemoContextRef.current = payload.state
          setSharedDemoContext(payload.state)
          setSharedCareState(payload.state.careState)
        }
      } catch {
        // Existing Supabase polling and realtime subscriptions remain active.
      } finally {
        inFlight = false
      }
    }

    void syncSharedCareState()
    const timer = window.setInterval(syncSharedCareState, DEMO_STATE_SYNC_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
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
    if (syncSimulationTestModeFromStorage()) return

    const restoreTimer = window.setTimeout(() => {
      const localLogs = readCareLogsFromLocalStorage()
      const latestLog = localLogs[0]
      if (!latestLog) return

      setLastModeResult((prev) => prev ?? careLogToHubModeResult(latestLog))

      const localModeRuns = localLogs.slice(0, 5).map(careLogToModeRunLog)
      setModeRunLogs((prev) => (prev.length > 0 ? prev : localModeRuns))
      setRecentModeRuns((prev) => (prev.length > 0 ? prev : localModeRuns))
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [syncSimulationTestModeFromStorage])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== SIMULATION_TEST_MODE_STORAGE_KEY &&
        event.key !== SIMULATION_ROUTINE_STORAGE_KEY &&
        event.key !== SIMULATION_DESTINATION_STORAGE_KEY
      ) {
        return
      }
      syncSimulationTestModeFromStorage()
    }

    const handleCustomChange = () => {
      syncSimulationTestModeFromStorage()
    }

    const handleFocus = () => {
      syncSimulationTestModeFromStorage()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(SIMULATION_TEST_MODE_CHANGE_EVENT, handleCustomChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(SIMULATION_TEST_MODE_CHANGE_EVENT, handleCustomChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [syncSimulationTestModeFromStorage])

  useEffect(() => {
    let mounted = true

    async function runSnapshot() {
      if (!mounted) return
      await fetchHubSnapshot()
    }

    void retryPendingCareLogSync().then((syncedCount) => {
      if (syncedCount > 0 && mounted) {
        void runSnapshot()
      }
    })

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

      const statErrors = [
        ['주간 device_events', weekDeviceResult.error],
        ['주간 symptom_logs', weekSymptomResult.error],
        ['월간 device_events', monthDeviceResult.error],
        ['월간 symptom_logs', monthSymptomResult.error],
      ].filter(([, error]) => Boolean(error)) as Array<[string, { message?: string }]>

      if (statErrors.length > 0) {
        // 통계 카드는 보조 정보라 조회가 실패해도 화면 동작에는 영향이 없어요.
        // Supabase 미설정·RLS·테이블 부재 등으로 실패할 수 있어 경고로만 남깁니다.
        console.warn(
          '[hub] 기간 통계 조회 일부 생략:',
          statErrors.map(([label, error]) => `${label}(${error?.message ?? '권한/설정 확인 필요'})`).join(' / '),
        )
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

    void fetchPeriodStats().catch((error) => {
      console.warn('[hub] 기간 통계 조회를 건너뛰었어요:', error)
    })
  }, [])

  function getPregnancyWeekFromUrl() {
    const sharedWeek = sharedDemoContextRef.current?.pregnancyWeek
    if (sharedWeek && sharedWeek >= 1 && sharedWeek <= 42) return sharedWeek

    const weeksParam = searchParams.get('weeks')
    const parsedWeeks = weeksParam ? Number(weeksParam) : undefined
    return parsedWeeks !== undefined &&
      Number.isInteger(parsedWeeks) &&
      parsedWeeks >= 1 &&
      parsedWeeks <= 42
      ? parsedWeeks
      : undefined
  }

  function getPregnancyStatusFromUrl() {
    return sharedDemoContextRef.current?.pregnancyStatus
      ?? (searchParams.get('status') === 'preparing' ? 'preparing' : 'pregnant')
  }

  function getRoleFromUrl() {
    return sharedDemoContextRef.current?.role
      ?? (searchParams.get('role') === 'husband' ? 'husband' : 'wife')
  }

  function isMorningBriefingPrompt(text: string) {
    return /좋은\s*아침(?:이야|이에요|입니다)?/.test(text)
  }

  async function playBase64Voice(audioBase64: string) {
    if (!audioBase64) return
    await playBabyVoiceAudio(audioBase64)
  }

  function resetVoiceInputState() {
    setVoiceState('idle')
    setVoiceStatus('idle')
    releaseHubVoiceInputLock()
  }

  function holdHubVoiceInputLock() {
    if (hubVoiceLockReleaseTimerRef.current) {
      clearTimeout(hubVoiceLockReleaseTimerRef.current)
      hubVoiceLockReleaseTimerRef.current = null
    }
    publishHubListeningState(true, 'hub')
  }

  function releaseHubVoiceInputLock(delayMs = HUB_VOICE_LOCK_RELEASE_GRACE_MS) {
    if (hubVoiceLockReleaseTimerRef.current) {
      clearTimeout(hubVoiceLockReleaseTimerRef.current)
      hubVoiceLockReleaseTimerRef.current = null
    }

    hubVoiceLockReleaseTimerRef.current = setTimeout(() => {
      hubVoiceLockReleaseTimerRef.current = null
      publishHubListeningState(false, 'hub')
    }, Math.max(0, delayMs))
  }

  function clearDefaultCareResetTimer() {
    if (!defaultCareResetTimerRef.current) return
    clearTimeout(defaultCareResetTimerRef.current)
    defaultCareResetTimerRef.current = null
  }

  function runDefaultCareReset(reason: string) {
    clearDefaultCareResetTimer()
    const pregnancyStatus = getPregnancyStatusFromUrl()
    const role = getRoleFromUrl()
    const pregnancyWeek = getPregnancyWeekFromUrl()

    sendSimulationReset(reason)
    setSharedCareState('idle')
    setLastSimulationRoutineId(null)
    setLastTravelDestination(null)

    void fetch('/api/demo-state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pregnancyStatus,
        pregnancyWeek,
        role,
        currentRoutine: null,
        simulationRoutine: null,
        latestHubInput: null,
        latestCareModeLabel: null,
        latestVoiceCommand: null,
        careState: 'idle',
        careUpdatedAt: new Date().toISOString(),
      }),
    }).catch((error) => {
      console.warn('[hub] default care reset state update failed:', error)
    })
  }

  function scheduleDefaultCareReset(reason: string) {
    clearDefaultCareResetTimer()
    defaultCareResetTimerRef.current = setTimeout(() => {
      runDefaultCareReset(reason)
    }, DEFAULT_CARE_RESET_DELAY_MS)
  }

  useEffect(() => {
    return () => clearDefaultCareResetTimer()
  }, [])

  function resetVoiceTranscriptBuffers() {
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    longestInterimTranscriptRef.current = ''
  }

  function getBrowserSpeechRecognitionConstructor() {
    if (typeof window === 'undefined') return null
    const speechWindow = window as unknown as {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
    }
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
  }

  function getSelectedVoiceTranscript() {
    const finalTranscript = finalTranscriptRef.current.trim()
    if (finalTranscript) return finalTranscript

    const interimTranscript = longestInterimTranscriptRef.current.trim() || interimTranscriptRef.current.trim()
    return interimTranscript
  }

  function handleNoVoiceTranscript() {
    console.log('[app voice] no transcript')
    resetVoiceInputState()
    setVoiceMessage('')
    setHubVoiceNotice('다시 한 번 말씀해주세요')
  }

  function submitSelectedVoiceTranscript() {
    const transcript = getSelectedVoiceTranscript()
    console.log('[app voice] selected transcript:', transcript)

    if (!transcript) {
      handleNoVoiceTranscript()
      return
    }

    setNaturalLanguageText(transcript)
    setLastSubmittedText(transcript)
    setVoiceState('analyzing')
    setVoiceStatus('processing')
    submitHubNaturalLanguageInput(transcript, 'hub_voice')
  }

  function getSimulationVoiceDeviceAction(result: Simulation3DVoiceIntentResult) {
    return result.deviceAction ?? (result.airPowerOff ? 'off' : result.airPowerOn ? 'on' : null)
  }

  function resolveCurrentHueModeFromSharedContext() {
    const context = sharedDemoContextRef.current
    if (!context) return null

    if (context.pregnancyStatus === 'preparing') {
      return resolveHueModeFromCareResult({
        preparationMode: context.preparationMode,
      })
    }

    return resolveHueModeFromCareResult({
      routineId: context.simulationRoutine,
      queryMode: context.currentRoutine,
    })
  }

  function triggerLightForSimulationVoiceResult(
    result: Simulation3DVoiceIntentResult,
    options: { source: string; commandId: string },
  ) {
    const lightAction = getLightPowerAction(result)
    if (lightAction === 'off') {
      void triggerLocalLight({
        action: 'off',
        source: options.source,
        commandId: options.commandId,
      })
      return
    }

    if (lightAction === 'on') {
      const restoreMode = resolveCurrentHueModeFromSharedContext()
      void triggerLocalLight({
        action: restoreMode ? 'mode' : 'on',
        mode: restoreMode ?? undefined,
        effect: 'solid',
        source: options.source,
        commandId: options.commandId,
      })
      return
    }

    if (result.defaultMode) {
      void triggerLocalLight({
        action: 'mode',
        mode: 'default',
        effect: 'solid',
        source: options.source,
        commandId: options.commandId,
      })
      return
    }

    const lightMode = resolveHueModeFromCareResult(result)
    if (!lightMode) return

    void triggerLocalLight({
      action: 'mode',
      mode: lightMode,
      effect: 'solid',
      source: options.source,
      commandId: options.commandId,
    })
  }

  async function controlAirPurifierForHubVoice(action: 'on' | 'off') {
    const command = action === 'on' ? 'POWER_ON' : 'POWER_OFF'
    applyHubThinQSnapshot(buildOptimisticThinQState(command, pm25))

    try {
      const response = await fetch('/api/thinq/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const data = (await response.json().catch(() => ({}))) as ThinQControlResponse
      if (!response.ok || data.success === false) {
        throw new Error(data.error ?? 'ThinQ voice control failed')
      }
      if (data.deviceStatus) {
        applyThinQState({
          ...data.deviceStatus,
          mock: data.mock ?? false,
          fallback: data.fallback ?? false,
          error: data.error,
        })
      }
      return true
    } catch (error) {
      console.warn('[hub voice] device command failed; hidden from user display:', error)
      return false
    }
  }

  function publishHubVoiceCommandToSharedState(
    text: string,
    result: Simulation3DVoiceIntentResult,
    source: HubNaturalLanguageSource,
    deviceHandled: boolean,
  ) {
    const createdAt = new Date().toISOString()
    const commandId = `hub-voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const lightAction = getLightPowerAction(result)
    const routineId =
      result.routineId && result.routineId in SIMULATION_VOICE_ROUTINE_TO_HUB_MODE
        ? result.routineId as SimulationRoutineId
        : result.queryMode
          ? SIMULATION_VOICE_QUERY_TO_ROUTINE[result.queryMode] ?? null
          : null
    const mode = routineId ? SIMULATION_VOICE_ROUTINE_TO_HUB_MODE[routineId] : null
    const modeLabel =
      result.intentSentence ??
      result.executionText ??
      result.ttsText ??
      result.reply ??
      (routineId ? mode : null)
    const modeStatePatch =
      lightAction
        ? {}
        : result.defaultMode
          ? {
              currentRoutine: null,
              simulationRoutine: null,
              latestCareModeLabel: '기본 모드',
              careState: 'idle' as const,
            }
          : routineId || result.preparationMode || result.queryMode
            ? {
                currentRoutine: mode,
                simulationRoutine: routineId,
                ...(result.preparationMode ? { preparationMode: result.preparationMode } : {}),
                latestCareModeLabel: modeLabel,
                careState: 'completed' as const,
              }
            : {}
    const lightPowerPatch =
      lightAction
        ? {
            latestCareModeLabel: lightAction === 'off' ? '거실 전구 꺼짐' : '거실 전구 켜짐',
            lightPower: lightAction,
          }
        : result.routineId || result.preparationMode || result.defaultMode || result.queryMode
          ? { lightPower: 'on' as const }
          : {}
    const lightColorPatch = getLightColorPatchFromCareResult(result)

    void fetch('/api/demo-state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latestHubInput: text,
        ...modeStatePatch,
        ...lightPowerPatch,
        ...lightColorPatch,
        careState: lightAction
          ? sharedDemoContextRef.current?.careState ?? 'idle'
          : 'careState' in modeStatePatch
            ? modeStatePatch.careState
            : 'completed',
        latestVoiceCommand: {
          id: commandId,
          transcript: text,
          result,
          source,
          deviceHandled,
          createdAt,
        },
      }),
    }).then((response) => {
      if (!response.ok) {
        console.warn('[app voice] shared simulation publish failed:', response.status)
      }
    }).catch((error) => {
      console.warn('[app voice] shared simulation publish failed:', error)
    })
  }

  async function executeHubVoiceViaSimulation3D(
    text: string,
    source: HubNaturalLanguageSource,
    pregnancyWeek?: number,
  ) {
    const pregnancyStatus = getPregnancyStatusFromUrl()
    const role = getRoleFromUrl()

    console.log('[app voice] send to intent')
    const response = await fetch('/api/simulation-3d/voice-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source,
        pregnancyWeek,
        pregnancyStatus,
        role,
        allowAllCareModes: true,
      }),
    })

    const result = (await response.json()) as Simulation3DVoiceIntentResult
    if (!response.ok || result.success === false) {
      throw new Error(result.reply || result.executionText || '3D voice intent failed')
    }

    const commandId = `hub-voice-light-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const deviceAction = getSimulationVoiceDeviceAction(result)
    const deviceTask = deviceAction ? controlAirPurifierForHubVoice(deviceAction) : null

    console.log('[app voice] intent result:', result)
    console.log('[app voice] publish to simulation')
    sendVoiceCommandToSimulation(text, result, {
      source,
      deviceHandled: Boolean(deviceAction),
      commandId,
    })
    triggerLightForSimulationVoiceResult(result, { source, commandId })
    publishHubVoiceCommandToSharedState(text, result, source, Boolean(deviceAction))

    const reply = result.ttsText || result.executionText || result.reply || ''
    setVoiceMessage(reply)
    setLastReply(reply)
    setVoiceStatus('done')
    setHubPanelNotice({
      tone: 'info',
      message:
        result.routineId || result.preparationMode || result.defaultMode || result.queryMode
          ? '3D 공간에 음성 명령을 전달했어요.'
          : '3D 공간에 음성 답변을 전달했어요.',
    })

    if (deviceTask) void deviceTask
    if (reply) {
      await playFastHubVoiceResponse(reply)
    }

    const hasCareMode = Boolean(result.routineId || result.preparationMode || result.queryMode)
    if (hasCareMode && !result.defaultMode && deviceAction !== 'off') {
      scheduleDefaultCareReset('hub_voice_idle_timeout')
    }
  }

  function beginHubCommandOnce(key: string, windowMs = HUB_COMMAND_DEDUPE_MS) {
    const normalizedKey = normalizeHubCommandKey(key)
    if (!normalizedKey) return true

    const now = Date.now()
    for (const [storedKey, timestamp] of recentHubCommandKeysRef.current.entries()) {
      if (now - timestamp > windowMs) recentHubCommandKeysRef.current.delete(storedKey)
    }

    const previousAt = recentHubCommandKeysRef.current.get(normalizedKey)
    if (previousAt && now - previousAt <= windowMs) {
      console.log('[hub command] duplicate skipped:', normalizedKey)
      return false
    }

    recentHubCommandKeysRef.current.set(normalizedKey, now)
    return true
  }

  function submitHubNaturalLanguageInput(
    text: string,
    source: HubNaturalLanguageSource,
    options: {
      travelDestination?: TravelDestination | null
      demoUtterance?: HubDemoUtterance | null
    } = {},
  ) {
    const trimmed = text.trim()
    if (!beginHubCommandOnce(`${source}:${trimmed}`)) return

    clearDefaultCareResetTimer()
    setInputText(trimmed)
    setNaturalLanguageText(trimmed)

    const demoUtterance =
      options.demoUtterance ?? (source === 'example_chip' ? findHubDemoUtteranceByLabel(trimmed) : null)
    const travelDestination =
      demoUtterance?.destination ?? options.travelDestination ?? null
    const executionContext = buildHubExecutionContext(trimmed, { travelDestination })
    console.log('[hub] submit natural language input:', {
      source,
      text: trimmed,
      travelDestination: executionContext.travelDestination,
      demoUtteranceId: demoUtterance?.id ?? null,
    })

    void executeNaturalLanguage(trimmed, source, executionContext, demoUtterance)
  }

  async function executeNaturalLanguage(
    text: string,
    source: HubNaturalLanguageSource = 'hub_voice',
    executionContext: HubExecutionContext = buildHubExecutionContext(text),
    demoUtterance: HubDemoUtterance | null = null,
  ) {
    const trimmed = text.trim()
    if (!trimmed) {
      setHubPanelNotice({
        tone: 'info',
        message: '실행할 문장을 입력하거나 예시 문장을 선택해주세요.',
      })
      resetVoiceInputState()
      return
    }
    if (isExecuting) {
      console.warn('[hub] natural language execute skipped: already executing', { source })
      resetVoiceInputState()
      return
    }

    console.log('[hub] natural language execute start:', {
      text: trimmed,
      source,
      travelDestination: executionContext.travelDestination,
    })

    const careLogId = createCareLogId()
    const careIntent = resolveHubCareIntent(trimmed, demoUtterance)
    const pregnancyStatus = getPregnancyStatusFromUrl()
    const role = getRoleFromUrl()
    let earlyCareApplied = false

    setHubPanelNotice(null)
    setHubVoiceNotice(null)
    setLastSubmittedText(trimmed)
    stopVoiceResponseAudio()
    setIsExecuting(true)
    setVoiceState('executing')
    vibrateHub()
    setVoiceSpeakStatus('idle')
    setVoiceMessage('')
    setVoiceNeedsRetry(false)
    setBabyMessage('')
    setAudioBase64('')

    try {
      const pregnancyWeek = getPregnancyWeekFromUrl()
      console.log('[hub] natural language pregnancy week:', pregnancyWeek)

      if (source === 'hub_voice') {
        await executeHubVoiceViaSimulation3D(trimmed, source, pregnancyWeek)
        return
      }

      if (isMorningBriefingPrompt(trimmed)) {
        const response = await fetch('/api/briefing/morning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source,
            triggerText: trimmed,
            pregnancyWeek,
            pregnancyStatus,
            role,
          }),
        })
        const data = (await response.json()) as MorningBriefingResponse

        if (!response.ok || !data.success) {
          throw new Error(data.error ?? '굿모닝 브리핑 생성 실패')
        }
        const spokenBriefing = role === 'husband' ? data.husbandBriefing : data.wifeBriefing

        const result: LastModeResult = {
          mode: 'MORNING_BRIEFING',
          modeLabel: '굿모닝 브리핑',
          signals: ['기상', '아침 인사'],
          reply: spokenBriefing,
          wifeCard: data.wifeBriefing,
          husbandCard: data.husbandBriefing,
          deviceResults: [],
          recommendedModes: data.recommendedModes,
        }

        commitHubModeExecution({
          inputText: trimmed,
          source,
          mode: result.mode,
          modeLabel: result.modeLabel,
          signals: result.signals,
          reply: result.reply,
          wifeCard: result.wifeCard,
          husbandCard: result.husbandCard,
          deviceResults: result.deviceResults,
          recommendedModes: result.recommendedModes,
          careLogId,
          serverSynced: false,
        })
        setVoiceMessage(spokenBriefing)
        setLastReply(spokenBriefing)
        setBriefingText(spokenBriefing)
        setBriefingAudio(data.audioBase64)
        setVoiceStatus('done')
        if (role === 'wife') {
          await playBase64Voice(data.audioBase64)
        } else {
          await playVoiceResponse(spokenBriefing)
        }
        await fetchHubSnapshot()
        return
      }

      if (pregnancyStatus === 'preparing') {
        const preparationIntent = resolvePreparationIntent(trimmed, role)
        const roleMessage =
          role === 'husband'
            ? `${preparationIntent.reply} 둘이 편안하게 이어갈 수 있도록 오늘은 작은 생활 리듬부터 함께 맞춰보세요.`
            : preparationIntent.reply

        dispatchPreparationMode(preparationIntent, source)
        triggerImmediateThinQControl(preparationIntent.hubMode, pm25)
        void playVoiceResponse(roleMessage)

        const deviceResults = [
          ...buildImmediateDeviceResults(preparationIntent.hubMode, pm25),
          ...buildPreparationEnvironmentResults(preparationIntent.mode),
        ]

        void fetch('/api/demo-state', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pregnancyStatus: 'preparing',
            role,
            preparationMode: preparationIntent.mode,
            currentRoutine: null,
            simulationRoutine: null,
            lightPower: 'on',
            ...getLightColorPatchFromCareResult({ preparationMode: preparationIntent.mode }),
            latestHubInput: trimmed,
            latestCareModeLabel: preparationIntent.label,
            careState: 'completed',
          }),
        }).then((stateResponse) => {
          if (!stateResponse.ok) {
            console.warn('[hub] preparation shared state update failed:', stateResponse.status)
          }
        }).catch((error) => {
          console.warn('[hub] preparation shared state update failed:', error)
        })

        commitHubModeExecution({
          inputText: trimmed,
          source,
          mode: preparationIntent.hubMode,
          modeLabel: preparationIntent.label,
          signals: ['임신 준비', preparationIntent.label, '상태:preparing', `역할:${role}`],
          reason: '임신 준비중 사용자 발화에 맞는 준비 전용 홈 장면을 선택했어요.',
          reply: roleMessage,
          wifeCard: preparationIntent.reply,
          husbandCard: roleMessage,
          deviceResults,
          careLogId,
          serverSynced: false,
          lightMode: preparationIntent.mode,
          skipSimulation: true,
        })
        setVoiceMessage(roleMessage)
        setLastReply(roleMessage)
        setVoiceStatus('done')
        setHubPanelNotice({
          tone: 'info',
          message: `${preparationIntent.label} 모드를 3D 공간과 공기청정기에 반영했어요.`,
        })
        void fetchHubSnapshot()
        return
      }

      if (
        careIntent.confidence >= 0.5 &&
        careIntent.hubMode !== 'UNKNOWN' &&
        careIntent.routineId
      ) {
        earlyCareApplied = true
        dispatchSimulationImmediately({
          hubMode: careIntent.hubMode,
          routineId: careIntent.routineId,
          travelDestination: careIntent.destination,
          simulationModeSlug: careIntent.simulationModeSlug,
          inputText: trimmed,
          modeLabel: careIntent.modeLabel,
          source,
        })
        triggerImmediateThinQControl(careIntent.hubMode, pm25)

        if (careIntent.replyPreview) {
          setVoiceMessage(careIntent.replyPreview)
          setLastReply(careIntent.replyPreview)
          void playVoiceResponse(careIntent.replyPreview)
        }

        commitHubModeExecution({
          inputText: trimmed,
          source,
          mode: careIntent.hubMode,
          modeLabel: careIntent.modeLabel,
          signals: careIntent.signals,
          reason: careIntent.reason,
          reply: careIntent.replyPreview,
          wifeCard: careIntent.wifeCardPreview,
          husbandCard: careIntent.husbandCardPreview,
          deviceResults: buildPendingDeviceResults(careIntent.hubMode),
          careLogId,
          serverSynced: false,
          travelDestination: careIntent.destination,
          forcedRoutineId: careIntent.routineId,
          simulationModeSlug: careIntent.simulationModeSlug,
          lightMode: careIntent.routineId,
          skipSimulation: true,
        })

        setHubPanelNotice({
          tone: 'info',
          message: careIntent.userFeedback,
        })
      } else if (!demoUtterance && careIntent.confidence < 0.5) {
        setHubPanelNotice({
          tone: 'info',
          message: careIntent.userFeedback,
        })
      }

      const response = await fetch('/api/mother-together/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          source,
          pregnancyWeek,
          pregnancyStatus,
          audience: 'hub',
          careLogId,
          ...(demoUtterance
            ? {
                demoOverride: {
                  hubMode: demoUtterance.hubMode,
                  routineId: demoUtterance.routineId,
                  travelDestination: demoUtterance.destination,
                  simulationMode: demoUtterance.simulationMode,
                },
              }
            : {}),
        }),
      })

      let data: ThinQMomExecuteResponse
      try {
        data = (await response.json()) as ThinQMomExecuteResponse
      } catch (parseError) {
        console.warn('[hub] execute response parse failed:', parseError)
        setHubPanelNotice({
          tone: 'warning',
          message: '지금은 실행이 어려워요. 잠시 후 다시 시도해주세요.',
        })
        return
      }

      console.log('[hub] ThinQ Mom execute response:', {
        ok: response.ok,
        success: data.success,
        mode: data.mode,
        partialSuccess: data.partialSuccess,
        deviceResults: data.deviceResults,
        error: data.error,
      })

      if (!response.ok || data.success === false) {
        setHubPanelNotice({
          tone: 'warning',
          message: data.error ?? '지금은 실행이 어려워요. 잠시 후 다시 시도해주세요.',
        })
        if (data.mode) {
          setLastModeResult({
            mode: data.mode,
            modeLabel: data.modeLabel,
            signals: data.signals ?? [],
            reason: data.reason,
            reply: data.reply,
            wifeCard: data.wifeCard,
            husbandCard: data.husbandCard,
            deviceResults: data.deviceResults ?? [],
          })
        }
        return
      }

      if (data.redirect && data.type === 'MORNING_BRIEFING') {
        const briefingResponse = await fetch('/api/briefing/morning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source,
            triggerText: trimmed,
            pregnancyWeek,
            pregnancyStatus,
            role,
          }),
        })
        const briefingData = (await briefingResponse.json()) as MorningBriefingResponse

        if (!briefingResponse.ok || !briefingData.success) {
          throw new Error(briefingData.error ?? '굿모닝 브리핑 생성 실패')
        }
        const spokenBriefing =
          role === 'husband' ? briefingData.husbandBriefing : briefingData.wifeBriefing

        const result: LastModeResult = {
          mode: 'MORNING_BRIEFING',
          modeLabel: '굿모닝 브리핑',
          signals: ['기상', '아침 인사'],
          reply: spokenBriefing,
          wifeCard: briefingData.wifeBriefing,
          husbandCard: briefingData.husbandBriefing,
          deviceResults: [],
          recommendedModes: briefingData.recommendedModes,
        }

        commitHubModeExecution({
          inputText: trimmed,
          source,
          mode: result.mode,
          modeLabel: result.modeLabel,
          signals: result.signals,
          reply: result.reply,
          wifeCard: result.wifeCard,
          husbandCard: result.husbandCard,
          deviceResults: result.deviceResults,
          recommendedModes: result.recommendedModes,
          careLogId,
          serverSynced: false,
        })
        setVoiceMessage(spokenBriefing)
        setLastReply(spokenBriefing)
        setBriefingText(spokenBriefing)
        setBriefingAudio(briefingData.audioBase64)
        setVoiceStatus('done')
        if (role === 'wife') {
          await playBase64Voice(briefingData.audioBase64)
        } else {
          await playVoiceResponse(spokenBriefing)
        }
        await fetchHubSnapshot()
        return
      }

      const travelDestination =
        demoUtterance?.destination ??
        resolveHubTravelDestinationForMode(data.mode, trimmed, executionContext)

      const skipSimulation =
        earlyCareApplied &&
        careIntent.hubMode !== 'UNKNOWN' &&
        data.mode === careIntent.hubMode &&
        (careIntent.routineId == null || careIntent.routineId === demoUtterance?.routineId)

      commitHubModeExecution({
        inputText: trimmed,
        source,
        mode: data.mode,
        modeLabel: data.modeLabel,
        signals: data.signals ?? [],
        reason: data.reason,
        reply: data.reply,
        wifeCard: data.wifeCard,
        husbandCard: data.husbandCard,
        deviceResults: data.deviceResults ?? [],
        simulationScene: data.simulationScene,
        simulationText: data.simulationText,
        demoUpdatedAt: data.demoUpdatedAt,
        partialSuccess: data.partialSuccess,
        careLogId,
        serverSynced: !data.storageDelayed,
        travelDestination,
        forcedRoutineId: demoUtterance?.routineId ?? careIntent.routineId,
        simulationModeSlug: demoUtterance?.simulationMode ?? careIntent.simulationModeSlug,
        skipSimulation,
      })
      if (data.storageDelayed) {
        console.warn('[hub] server storage delayed; local care log saved, client sync queued')
      }
      setVoiceMessage(data.reply)
      setLastReply(data.reply)
      setVoiceStatus('done')

      if (earlyCareApplied) {
        setHubPanelNotice({
          tone: data.partialSuccess ? 'warning' : 'info',
          message: data.partialSuccess
            ? '공기청정기 연결이 지연되고 있지만, 시뮬레이션 환경은 먼저 적용했어요.'
            : '3D 공간을 먼저 적용했고, 공기청정기 작동을 반영했어요.',
        })
      } else {
        void playBase64Voice(data.audioBase64)
      }
      void refreshThinQStateAfterVoice()
      void fetchHubSnapshot()
      console.log('[hub] natural language execute complete:', {
        mode: data.mode,
        source,
      })
    } catch (error) {
      console.warn('[hub] AI 자연어 실행 실패:', error)
      setVoiceStatus('idle')
      setVoiceMessage('')
      setHubPanelNotice({
        tone: 'warning',
        message: '지금은 실행이 어려워요. 잠시 후 다시 시도해주세요.',
      })
    } finally {
      setIsExecuting(false)
      setVoiceState('idle')
      if (source === 'hub_voice') {
        releaseHubVoiceInputLock()
      }
    }
  }

  function handleNaturalLanguageSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) {
      setHubPanelNotice({
        tone: 'info',
        message: '실행할 문장을 입력하거나 예시 문장을 선택해주세요.',
      })
      return
    }

    submitHubNaturalLanguageInput(trimmed, 'hub_text')
  }

  function handleDemoUtteranceClick(utterance: HubDemoUtterance) {
    submitHubNaturalLanguageInput(utterance.label, 'example_chip', { demoUtterance: utterance })
  }

  async function processVoiceAudio(blob: Blob) {
    setVoiceState('analyzing')
    vibrateHub()
    setVoiceStatus('processing')
    setHubVoiceNotice(null)

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      })

      let data: VoiceApiResponse
      try {
        data = (await response.json()) as VoiceApiResponse
      } catch (parseError) {
        console.warn('[hub] voice response parse failed:', parseError)
        setHubVoiceNotice('음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.')
        resetVoiceInputState()
        return
      }

      const transcript = data.transcript?.trim()
      if (!transcript) {
        handleNoVoiceTranscript()
        if (data.message) setHubVoiceNotice(data.message)
        return
      }

      console.log('[app voice] final transcript:', transcript)
      console.log('[app voice] selected transcript:', transcript)
      setNaturalLanguageText(transcript)
      setLastSubmittedText(transcript)
      submitHubNaturalLanguageInput(transcript, 'hub_voice')
    } catch (error) {
      console.warn('[app voice] error:', error)
      resetVoiceInputState()
      setVoiceMessage('')
      setHubVoiceNotice('음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.')
    }
  }

  function applyGlowLevel(level: number) {
    const el = glowRef.current
    if (!el) return
    const clamped = Math.min(Math.max(level, 0), 1)
    el.style.transform = `scale(${(1 + clamped * 0.95).toFixed(3)})`
    el.style.opacity = (0.55 + clamped * 0.45).toFixed(3)
  }

  function resetGlowLevel() {
    const el = glowRef.current
    if (!el) return
    el.style.transform = ''
    el.style.opacity = ''
  }

  function startVolumeMeter(stream: MediaStream) {
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return

      const audioContext = new AudioContextClass()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      voiceLevelRef.current = 0

      const buffer = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        const node = analyserRef.current
        if (!node) return
        node.getByteTimeDomainData(buffer)
        let sum = 0
        for (let i = 0; i < buffer.length; i += 1) {
          const v = (buffer[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / buffer.length)
        const level = Math.min(1, rms * 3.4)
        voiceLevelRef.current = voiceLevelRef.current * 0.55 + level * 0.45
        applyGlowLevel(voiceLevelRef.current)
        volumeRafRef.current = requestAnimationFrame(tick)
      }
      volumeRafRef.current = requestAnimationFrame(tick)
    } catch (error) {
      console.warn('[hub] 음성 레벨 측정 실패:', error)
    }
  }

  function stopVolumeMeter() {
    if (volumeRafRef.current != null) {
      cancelAnimationFrame(volumeRafRef.current)
      volumeRafRef.current = null
    }
    const ctx = audioContextRef.current
    if (ctx) {
      void ctx.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    voiceLevelRef.current = 0
    resetGlowLevel()
  }

  function startBrowserSpeechRecognition() {
    const SpeechRecognition = getBrowserSpeechRecognitionConstructor()
    if (!SpeechRecognition) return false

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'ko-KR'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        console.log('[app voice] recognition start')
      }

      recognition.onresult = (event) => {
        let interimTranscript = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          const transcript = result?.[0]?.transcript?.trim() ?? ''
          if (!transcript) continue

          if (result.isFinal) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim()
            console.log('[app voice] final transcript:', finalTranscriptRef.current)
          } else {
            interimTranscript = `${interimTranscript} ${transcript}`.trim()
          }
        }

        if (interimTranscript) {
          interimTranscriptRef.current = interimTranscript
          if (interimTranscript.length > longestInterimTranscriptRef.current.length) {
            longestInterimTranscriptRef.current = interimTranscript
          }
          console.log('[app voice] interim transcript:', interimTranscript)
        }
      }

      recognition.onerror = (event) => {
        console.warn('[app voice] error:', event.error || event.message || event)
      }

      recognition.onend = () => {
        if (speechRecognitionRef.current === recognition) {
          speechRecognitionRef.current = null
        }
      }

      speechRecognitionRef.current = recognition
      recognition.start()
      return true
    } catch (error) {
      speechRecognitionRef.current = null
      console.warn('[app voice] error:', error)
      return false
    }
  }

  async function startVoiceRecording() {
    if (isPointerRecordingRef.current || voiceState !== 'idle' || isExecuting) return

    console.log('[app voice] press start')
    stopVoiceResponseAudio()
    clearDefaultCareResetTimer()
    resetVoiceTranscriptBuffers()
    if (voiceReleaseTimerRef.current) {
      clearTimeout(voiceReleaseTimerRef.current)
      voiceReleaseTimerRef.current = null
    }
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
    setHubVoiceNotice(null)
    holdHubVoiceInputLock()

    if (startBrowserSpeechRecognition()) return

    if (
      typeof window === 'undefined' ||
      typeof MediaRecorder === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      isPointerRecordingRef.current = false
      setVoiceStatus('idle')
      setVoiceState('idle')
      releaseHubVoiceInputLock(0)
      setHubVoiceNotice('음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      if (!isPointerRecordingRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        setVoiceStatus('idle')
        setVoiceState('idle')
        releaseHubVoiceInputLock(0)
        return
      }

      voiceStreamRef.current = stream
      startVolumeMeter(stream)
      const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      voiceRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        stopVolumeMeter()
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
        voiceStreamRef.current = null
        voiceRecorderRef.current = null

        const duration = Date.now() - recordingStartTimeRef.current
        if (duration < 500 || voiceChunksRef.current.length === 0) {
          handleNoVoiceTranscript()
          return
        }

        const recordedBlob = new Blob(voiceChunksRef.current, { type: 'audio/webm' })
        void processVoiceAudio(recordedBlob)
      }

      mediaRecorder.onerror = () => {
        console.warn('[app voice] error:', 'MediaRecorder failed')
        releaseHubVoiceInputLock(0)
        stopVolumeMeter()
        stopHubPressVibration()
        isPointerRecordingRef.current = false
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
        voiceStreamRef.current = null
        voiceRecorderRef.current = null
        setVoiceStatus('idle')
        setVoiceState('idle')
        setHubVoiceNotice('음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.')
      }

      mediaRecorder.start()
      console.log('[app voice] recognition start')

      if (!isPointerRecordingRef.current) {
        mediaRecorder.stop()
      }
    } catch (error) {
      console.warn('[app voice] error:', error)
      stopVolumeMeter()
      stopHubPressVibration()
      releaseHubVoiceInputLock(0)
      isPointerRecordingRef.current = false
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
      voiceStreamRef.current = null
      voiceRecorderRef.current = null
      setVoiceStatus('idle')
      setVoiceState('idle')
      setHubVoiceNotice('마이크 권한이 없어도 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.')
    }
  }

  function stopVoiceRecording() {
    console.log('[app voice] release')
    if (!isPointerRecordingRef.current) {
      if (voiceState === 'recording') resetVoiceInputState()
      return
    }
    isPointerRecordingRef.current = false

    const recognition = speechRecognitionRef.current
    if (recognition) {
      speechRecognitionRef.current = null
      try {
        recognition.stop()
      } catch (error) {
        console.warn('[app voice] error:', error)
      }

      setVoiceState('analyzing')
      setVoiceStatus('processing')
      const releaseDelayMs = finalTranscriptRef.current.trim() ? 0 : 60
      if (releaseDelayMs === 0) {
        submitSelectedVoiceTranscript()
      } else {
        voiceReleaseTimerRef.current = setTimeout(() => {
          voiceReleaseTimerRef.current = null
          submitSelectedVoiceTranscript()
        }, releaseDelayMs)
      }
      return
    }

    const recorder = voiceRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      setVoiceState('analyzing')
      setVoiceStatus('processing')
      recorder.stop()
      return
    }

    stopVolumeMeter()
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
    voiceStreamRef.current = null
    voiceRecorderRef.current = null
    setVoiceStatus('idle')
    setVoiceState('idle')
    releaseHubVoiceInputLock()
  }

  async function handleVoicePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    startHubPressVibration()
    await startVoiceRecording()
  }

  function handleVoicePointerEnd(e: React.PointerEvent<HTMLButtonElement>) {
    stopHubPressVibration()

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // Some mobile browsers throw if capture was already released.
    }

    stopVoiceRecording()
  }

  function handleVoiceMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    startHubPressVibration()
    void startVoiceRecording()
  }

  function handleVoiceMouseEnd(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    stopHubPressVibration()
    stopVoiceRecording()
  }

  function handleVoiceTouchStart(e: React.TouchEvent<HTMLButtonElement>) {
    e.preventDefault()
    startHubPressVibration()
    void startVoiceRecording()
  }

  function handleVoiceTouchEnd(e: React.TouchEvent<HTMLButtonElement>) {
    e.preventDefault()
    stopHubPressVibration()
    stopVoiceRecording()
  }

  function handleDeviceMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    void startVoiceRecording()
  }

  function handleDeviceTouchStart(e: React.TouchEvent<HTMLButtonElement>) {
    e.preventDefault()
    void startVoiceRecording()
  }

  function handleDevicePressEnd(e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) {
    e.preventDefault()
    stopVoiceRecording()
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
          <p className="hidden mb-1 text-sm text-gray-500">오늘 기분</p>
          {wifeTodayMood ? (
            <>
              <p className={`hidden ${large ? 'text-6xl' : 'text-4xl'}`}>{wifeTodayMood.emoji}</p>
              <p className={`hidden mt-2 font-bold ${wifeMoodStyle.text} ${large ? 'text-2xl' : 'text-xl'}`}>
                {wifeTodayMood.mood}
              </p>
            </>
          ) : (
            <p className="hidden text-sm text-gray-400">아직 기록 없음</p>
          )}
        </div>

        <div className={`rounded-xl bg-gray-50 ${large ? 'p-5' : 'p-4'}`}>
          <p className="hidden mb-2 text-sm font-semibold text-gray-700">최근 증상</p>
          {wifeLatestDiary ? (
            <>
              <p className={`hidden leading-relaxed text-gray-800 ${large ? 'text-base' : 'text-sm'}`}>
                {wifeLatestDiary.symptom_text}
              </p>
              <p className="hidden mt-2 text-xs text-gray-400">{formatTime(wifeLatestDiary.created_at)}</p>
            </>
          ) : (
            <p className="hidden text-sm text-gray-400">-</p>
          )}
        </div>

        <div className="rounded-xl bg-blue-50 p-5 text-center">
          <p className="hidden mb-2 text-sm text-gray-600">오늘 태동</p>
          <p className={`hidden font-bold ${wifeMoodStyle.text} ${large ? 'text-7xl' : 'text-5xl'}`}>
            {kickCount}
          </p>
          <p className="hidden mt-1 text-sm text-gray-500">회</p>
        </div>
      </div>
    )
  }

  function renderAirPurifierContent(large = false) {
    if (!deviceStatus) {
      return <p className="hidden text-sm text-gray-500">아직 기록이 없어요</p>
    }

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <span
            className={`hidden rounded-full font-medium ${
              isPowerOn ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
            } ${large ? 'px-5 py-2 text-lg' : 'px-3 py-1 text-sm'}`}
          >
            {deviceStatus.power}
          </span>
          <span className={`hidden text-gray-700 ${large ? 'text-lg' : ''}`}>모드: {deviceStatus.mode}</span>
        </div>

        <div>
          <p className={`hidden mb-2 text-gray-500 ${large ? 'text-base' : 'text-sm'}`}>실시간 공기질</p>
          <p className={`hidden font-bold text-gray-800 ${large ? 'text-4xl' : 'text-2xl'}`}>
            공기 속 먼지 <span className={`hidden ${pm25Status.textColor}`}>{pm25}</span>
          </p>
          <div className={`mt-4 w-full overflow-hidden rounded-full bg-gray-100 ${large ? 'h-5' : 'h-3'}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${pm25Status.barColor}`}
              style={{ width: `${pm25GaugeWidth}%` }}
            />
          </div>
          <p className={`hidden mt-3 font-medium ${pm25Status.textColor} ${large ? 'text-lg' : 'text-sm'}`}>
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

        <p className="hidden text-center text-xs text-gray-300">
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
          <p className={`hidden mb-2 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>입덧 모드 켠 횟수</p>
          <p className={`hidden font-bold text-blue-600 ${large ? 'text-6xl' : 'text-4xl'}`}>{nauseaCount}</p>
        </div>
        <div className={`rounded-lg bg-gray-50 text-center ${large ? 'p-8' : 'p-4'}`}>
          <p className={`hidden mb-2 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>아기 움직인 횟수</p>
          <p className={`hidden font-bold text-blue-600 ${large ? 'text-6xl' : 'text-4xl'}`}>{kickCount}</p>
        </div>
      </div>
    )
  }

  function renderCareStatus(large = false) {
    return (
      <div className={`space-y-3 ${large ? 'space-y-4' : ''}`}>
        <div className={`rounded-xl bg-purple-50 px-4 py-3 ${large ? 'py-4' : ''}`}>
          <p className={`hidden text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>AI 감지 상태</p>
          <p className={`hidden mt-1 font-semibold text-purple-700 ${large ? 'text-xl' : 'text-base'}`}>
            {detectedCareState}
          </p>
        </div>
        <div className={`rounded-xl bg-blue-50 px-4 py-3 ${large ? 'py-4' : ''}`}>
          <p className={`hidden text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>실행 액션</p>
          <p className={`hidden mt-1 font-semibold text-blue-700 ${large ? 'text-lg' : 'text-sm'}`}>
            {latestCareAction}
          </p>
          {latestDeviceEvent && (
            <p className={`hidden mt-1 text-gray-400 ${large ? 'text-sm' : 'text-xs'}`}>
              {latestDeviceEvent.triggered_by === 'VOICE' ? '음성 명령 🎙️' : 'AI 자동 ✨'} ·{' '}
              {formatTime(latestDeviceEvent.created_at)}
            </p>
          )}
        </div>
        <div className={`rounded-xl px-4 py-3 ${large ? 'py-4' : ''} ${
          careResultLabel === '적용 완료' ? 'bg-green-50' : 'bg-amber-50'
        }`}>
          <p className={`hidden text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>실행 결과</p>
          <p className={`hidden mt-1 font-semibold ${
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
      return <p className="hidden text-sm text-gray-500">아직 AI 케어 기록이 없어요</p>
    }

    return (
      <ul className={large ? 'space-y-3' : 'space-y-2'}>
        {recentCareItems.map((item) => (
          <li
            key={item.id}
            className={`rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 ${large ? 'px-4 py-3' : ''}`}
          >
            <p className={`hidden text-gray-800 ${large ? 'text-base' : 'text-sm'}`}>{item.label}</p>
            <p className={`hidden mt-1 text-gray-400 ${large ? 'text-sm' : 'text-xs'}`}>
              {formatTime(item.created_at)}
              {item.triggered_by && ` · ${item.triggered_by === 'VOICE' ? '음성' : 'AI'}`}
            </p>
          </li>
        ))}
      </ul>
    )
  }

  function renderApplianceStatusCompact(large = false, panelVisible = false) {
    if (!deviceStatus) {
      return <p className={hubShow(panelVisible, 'text-sm text-gray-500')}>기기 상태 조회 중…</p>
    }

    return (
      <div className={`space-y-3 ${large ? 'space-y-4' : ''}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={hubShow(
              panelVisible,
              `rounded-full font-medium ${
                isPowerOn ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
              } ${large ? 'px-4 py-1.5 text-base' : 'px-3 py-1 text-sm'}`,
            )}
          >
            전원 {deviceStatus.power}
          </span>
          <span className={hubShow(panelVisible, `text-gray-700 ${large ? 'text-base' : 'text-sm'}`)}>
            모드: {getModeDisplayLabel(thinQState?.uiMode, deviceStatus.mode)}
          </span>
        </div>
        <p className={hubShow(panelVisible, `font-bold text-gray-800 ${large ? 'text-3xl' : 'text-xl'}`)}>
          PM2.5 <span className={pm25Status.textColor}>{pm25}</span>
          <span className={`ml-2 font-normal ${pm25Status.textColor} ${large ? 'text-base' : 'text-sm'}`}>
            {pm25Status.label}
          </span>
        </p>
        {thinQFallbackWarning && (
          <p className={hubShow(panelVisible, `rounded-lg bg-red-50 px-3 py-2 text-red-600 ${large ? 'text-sm' : 'text-xs'}`)}>
            {thinQFallbackWarning}
          </p>
        )}
      </div>
    )
  }

  function renderPeriodStatsBlock(stats: PeriodStats, label: string, large: boolean, colorClass: string) {
    return (
      <div>
        <h3 className={`hidden mb-4 font-semibold text-gray-800 ${large ? 'text-lg' : 'text-base'}`}>{label}</h3>
        <div className={`grid grid-cols-2 gap-3 ${large ? 'gap-4' : ''}`}>
          <div className={`rounded-lg bg-blue-50 text-center ${large ? 'p-6' : 'p-4'}`}>
            <p className={`hidden mb-1 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>입덧 모드</p>
            <p className={`hidden font-bold ${colorClass} ${large ? 'text-5xl' : 'text-3xl'}`}>{stats.nauseaMode}</p>
          </div>
          <div className={`rounded-lg bg-blue-50 text-center ${large ? 'p-6' : 'p-4'}`}>
            <p className={`hidden mb-1 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>수면 모드</p>
            <p className={`hidden font-bold ${colorClass} ${large ? 'text-5xl' : 'text-3xl'}`}>{stats.sleepMode}</p>
          </div>
          <div className={`rounded-lg bg-blue-50 text-center ${large ? 'p-6' : 'p-4'}`}>
            <p className={`hidden mb-1 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>태동 횟수</p>
            <p className={`hidden font-bold ${colorClass} ${large ? 'text-5xl' : 'text-3xl'}`}>{stats.kick}</p>
          </div>
          <div className={`rounded-lg bg-blue-50 text-center ${large ? 'p-6' : 'p-4'}`}>
            <p className={`hidden mb-1 text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>음성 트리거</p>
            <p className={`hidden font-bold ${colorClass} ${large ? 'text-5xl' : 'text-3xl'}`}>{stats.voice}</p>
          </div>
        </div>
      </div>
    )
  }

  function renderFeedList(large = false) {
    if (feed.length === 0) {
      return <p className="hidden text-center text-sm text-gray-500">아직 이벤트가 없어요</p>
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
                  <span className="hidden shrink-0 text-sm text-gray-400">{formatTime(item.created_at)}</span>
                  <span className="hidden text-right text-base text-gray-800">{item.label}</span>
                </div>
                {item.triggered_by && (
                  <span
                    className={`hidden mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.triggered_by === 'VOICE'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.triggered_by}
                  </span>
                )}
                {item.device_status && (
                  <p className="hidden mt-2 text-sm text-gray-500">
                    전원: {item.device_status.power} · 모드: {item.device_status.mode}
                  </p>
                )}
                {item.symptom_text && (
                  <p className="hidden mt-1 text-sm text-gray-600">{item.symptom_text}</p>
                )}
              </>
            ) : (
              <>
                <span className="hidden shrink-0 font-mono text-xs text-gray-500">
                  {formatTime(item.created_at)}
                </span>
                <span className="hidden text-sm text-gray-700">{item.label}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    )
  }

  function renderBriefingContent(large = false, panelVisible = false) {
    return (
      <>
        <p className={hubShow(panelVisible, `text-gray-500 ${large ? 'text-base' : 'text-sm'}`)}>
          필요할 때 브리핑을 들어보세요
        </p>
        <div className="mt-4">
          {isBriefingLoading && !briefingText ? (
            <p className={hubShow(panelVisible, `text-gray-500 ${large ? 'text-base' : 'text-sm'}`)}>브리핑 준비 중이에요...</p>
          ) : briefingText ? (
            <p className={hubShow(panelVisible, `italic leading-relaxed text-gray-700 ${large ? 'text-lg' : 'text-sm'}`)}>
              {briefingText}
            </p>
          ) : (
            <p className={hubShow(panelVisible, `text-gray-500 ${large ? 'text-base' : 'text-sm'}`)}>브리핑을 불러오지 못했어요</p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handlePlayBriefing()}
            disabled={isBriefingLoading || isBriefingPlaying || briefingLoadFailed}
            className={hubShow(
              panelVisible,
              `rounded-2xl bg-blue-500 font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60 ${
                large ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
              }`,
            )}
          >
            {getBriefingButtonLabel()}
          </button>
          <button
            type="button"
            onClick={() => void fetchBriefing()}
            disabled={isBriefingLoading || isBriefingPlaying}
            className={hubShow(
              panelVisible,
              `text-blue-600 transition hover:text-blue-700 disabled:opacity-60 ${
                large ? 'text-base' : 'text-sm'
              }`,
            )}
          >
            다시 생성
          </button>
          {briefingPlayed && <span className={hubShow(panelVisible, 'text-xs text-gray-400')}>재생 완료</span>}
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
    if (action.status === 'actual' && action.success === false) {
      return action.error ?? '실제 기기 연결 확인 필요'
    }
    if (action.status === 'actual') return '실제 적용됨'
    if (action.status === 'planned') return '확장 예정'
    return '시연/Mock'
  }

  function renderHubPanelNotice(panelVisible = false) {
    if (!panelVisible || !hubPanelNotice) return null

    const toneClass =
      hubPanelNotice.tone === 'warning'
        ? 'border-amber-100 bg-amber-50 text-amber-900'
        : 'border-blue-100 bg-blue-50 text-blue-900'

    return (
      <div className={`rounded-[16px] border px-4 py-3 text-sm leading-relaxed ${toneClass}`}>
        {hubPanelNotice.message}
      </div>
    )
  }

  function renderDemoRehearsalPanel(panelVisible = false) {
    if (!panelVisible) return null

    const latestMode = lastModeResult?.mode ?? demoSceneStatus?.mode ?? '-'
    const latestScene = demoSceneStatus?.sceneName ?? lastModeResult?.simulationScene ?? '-'
    const actualResults = getPhysicalDeviceResults(lastModeResult?.deviceResults)
    const actualStatus = actualResults.length
      ? actualResults.every((action) => action.success !== false)
        ? '정상'
        : '확인 필요'
      : '대기'

    return (
      <details className="rounded-[16px] border border-gray-100 bg-gray-50/80 px-4 py-3">
        <summary className="cursor-pointer text-xs font-medium text-gray-500">시연 체크리스트</summary>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-600">
          <li>1. 마이크 권한: {hubVoiceNotice ? '예시/텍스트로 대체 가능' : '확인됨'}</li>
          <li>2. 공기청정기 연결: {actualStatus}</li>
          <li>3. 3D scene localStorage: {latestScene}</li>
          <li>4. /wife 카드: {lastModeResult?.wifeCard ? '업데이트 문구 준비됨' : '대기'}</li>
          <li>5. /husband 카드: {lastModeResult?.husbandCard ? '업데이트 문구 준비됨' : '대기'}</li>
          <li>6. 초음파 갤러리: /wife 홈에서 업로드 가능</li>
          <li>7. AI 자동 다이어리: /wife 홈에서 생성 가능</li>
          <li className="pt-1 text-gray-500">최근 실행 모드: {getHubModeDisplayLabel(String(latestMode), lastModeResult?.modeLabel)}</li>
        </ul>
      </details>
    )
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

  function renderDemoSpeechExamples(panelVisible = false) {
    if (!panelVisible) return null

    const pregnancyStatus = sharedDemoContext?.pregnancyStatus ?? getPregnancyStatusFromUrl()
    const role = sharedDemoContext?.role ?? getRoleFromUrl()
    const isPreparingWife = pregnancyStatus === 'preparing' && role === 'wife'
    if (isPreparingWife) {
      const utterance = PREPARING_HUB_DEMO_UTTERANCES.find(
        (item) => item.mode === activePreparationDemoMode,
      )

      return (
        <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">임신 준비중 아내 시연 문구</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            짧고 분명한 문장으로 준비기 전용 모드를 테스트할 수 있어요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PREPARING_HUB_DEMO_MODE_TABS.map((tab) => (
              <button
                key={tab.mode}
                type="button"
                onClick={() => setActivePreparationDemoMode(tab.mode)}
                className={`min-h-[40px] rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activePreparationDemoMode === tab.mode
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {utterance && (
            <button
              type="button"
              onClick={() => submitHubNaturalLanguageInput(utterance.label, 'example_chip')}
              disabled={isExecuting || voiceState !== 'idle'}
              className="mt-4 min-h-[48px] w-full rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {utterance.label}
            </button>
          )}
        </section>
      )
    }

    const activeStyles = HUB_DEMO_TAB_STYLES[activeDemoModeTab]
    const travelSubTabs =
      activeDemoModeTab === 'TRAVEL_MODE' ? HUB_DEMO_TRAVEL_SUB_TABS : null
    const utterances = getHubDemoUtterancesForTab(
      activeDemoModeTab,
      activeDemoModeTab === 'TRAVEL_MODE' ? activeTravelDestinationTab : null,
    )

    return (
      <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          {pregnancyStatus === 'pregnant' && role === 'wife'
            ? '임신중 아내 시연 문구'
            : '시연용 발화 예시'}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          실제 사용자가 말할 법한 문장입니다. 예시를 누르면 해당 케어가 실행돼요.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {DEMO_MODE_TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              onClick={() => setActiveDemoModeTab(tab.mode)}
              className={`min-h-[40px] rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeDemoModeTab === tab.mode
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <article className={`mt-4 rounded-[16px] border p-4 ${activeStyles.cardClass}`}>
          <h3 className="text-sm font-semibold text-gray-900">
            {DEMO_MODE_TABS.find((tab) => tab.mode === activeDemoModeTab)?.label}
          </h3>

          {travelSubTabs && (
            <div className="mt-3 flex flex-wrap gap-2">
              {travelSubTabs.map((subTab) => (
                <button
                  key={subTab.id}
                  type="button"
                  onClick={() => setActiveTravelDestinationTab(subTab.id)}
                  className={`min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    activeTravelDestinationTab === subTab.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : `bg-white ${subTab.chipClass}`
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {utterances.map((utterance) => (
              <button
                key={utterance.id}
                type="button"
                onClick={() => handleDemoUtteranceClick(utterance)}
                disabled={isExecuting || voiceState !== 'idle'}
                className={`min-h-[44px] max-w-full rounded-full border bg-white px-4 py-2.5 text-left text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  activeDemoModeTab === 'TRAVEL_MODE' && travelSubTabs
                    ? travelSubTabs.find((subTab) => subTab.id === activeTravelDestinationTab)
                        ?.chipClass ?? activeStyles.chipClass
                    : activeStyles.chipClass
                }`}
              >
                {utterance.label}
              </button>
            ))}
          </div>
        </article>
      </section>
    )
  }

  function renderExecutionResultCard(panelVisible = false) {
    if (!lastModeResult) return null

    const modeLabel = getHubModeDisplayLabel(lastModeResult.mode, lastModeResult.modeLabel)
    const deviceResults = getPhysicalDeviceResults(lastModeResult.deviceResults)
    const sceneLabel = getSimulationSceneLabel(lastModeResult.simulationScene)

    return (
      <section className={`rounded-[20px] border p-5 shadow-sm ${getModeCardBackground(lastModeResult.mode)}`}>
        <h2 className={hubShow(panelVisible, 'text-base font-semibold text-gray-900')}>실행 결과</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className={hubShow(panelVisible, 'text-xs font-medium text-gray-500')}>감지된 모드</p>
            <p className={hubShow(panelVisible, 'mt-1 text-xl font-bold text-gray-950')}>
              {modeLabel}
            </p>
          </div>
          <div>
            <p className={hubShow(panelVisible, 'text-xs font-medium text-gray-500')}>AI가 이해한 이유</p>
            <p className={hubShow(panelVisible, 'mt-1 text-sm leading-relaxed text-gray-800')}>
              {lastModeResult.reason ?? lastModeResult.reply}
            </p>
            {getVoiceSpeakStatusLabel() && (
              <p className={hubShow(panelVisible, 'mt-2 text-xs font-medium text-gray-500')}>
                {getVoiceSpeakStatusLabel()}
              </p>
            )}
          </div>
          <div>
            <p className={hubShow(panelVisible, 'text-xs font-medium text-gray-500')}>감지된 신호</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lastModeResult.signals.length > 0
                ? lastModeResult.signals.map((signal) => (
                    <span
                      key={signal}
                      className={hubShow(
                        panelVisible,
                        'rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700',
                      )}
                    >
                      {signal}
                    </span>
                  ))
                : (
                  <span className={hubShow(panelVisible, 'text-sm text-gray-500')}>감지된 신호 없음</span>
                )}
            </div>
          </div>
          {deviceResults.length > 0 && (
            <div>
              <p className={hubShow(panelVisible, 'text-xs font-medium text-gray-500')}>실행된 기기 결과</p>
              <ul className="mt-2 space-y-2">
                {deviceResults.map((action) => (
                  <li
                    key={`${action.device}-${action.action}`}
                    className={hubShow(
                      panelVisible,
                      'rounded-[14px] border border-white/80 bg-white/70 px-3 py-2.5',
                    )}
                  >
                    <p className="text-sm font-semibold text-gray-900">{action.device}</p>
                    <p className="mt-0.5 text-sm text-gray-700">{action.label}</p>
                    {action.error && action.success === false && (
                      <p className="mt-1 text-xs text-amber-700">{action.error}</p>
                    )}
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getDeviceStatusBadge(action)}`}
                    >
                      {getDeviceStatusLabel(action)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lastModeResult.simulationScene && (
            <div className={hubShow(panelVisible, 'rounded-[14px] border border-white/80 bg-white/70 px-3 py-3')}>
              <p className="text-xs font-medium text-gray-500">3D 시뮬레이션</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{lastModeResult.simulationScene}</p>
              {sceneLabel && (
                <p className="mt-0.5 text-xs text-gray-500">{sceneLabel}</p>
              )}
              {lastModeResult.simulationText && (
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{lastModeResult.simulationText}</p>
              )}
            </div>
          )}
          <div>
            <p className={hubShow(panelVisible, 'text-xs font-medium text-gray-500')}>아내 화면 업데이트</p>
            <p className={hubShow(panelVisible, 'mt-1 text-sm leading-relaxed text-gray-800')}>
              {lastModeResult.wifeCard}
            </p>
          </div>
          <div>
            <p className={hubShow(panelVisible, 'text-xs font-medium text-gray-500')}>남편 화면 업데이트</p>
            <p className={hubShow(panelVisible, 'mt-1 text-sm leading-relaxed text-gray-800')}>
              {lastModeResult.husbandCard}
            </p>
          </div>
        </div>
      </section>
    )
  }

  function renderDemoSceneStatusLog(panelVisible = false) {
    if (!panelVisible || !demoSceneStatus?.sceneName) return null

    return (
      <details
        className="rounded-[16px] border border-gray-100 bg-gray-50/80 px-4 py-3"
        open={showDemoSceneLog}
        onToggle={(event) => setShowDemoSceneLog(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-xs font-medium text-gray-500">
          3D 장면 연동 상태
        </summary>
        <div className="mt-2 space-y-1 text-xs text-gray-600">
          <p>
            최근 3D 장면:{' '}
            <span className="font-semibold text-gray-800">{demoSceneStatus.sceneName}</span>
          </p>
          {getSimulationSceneLabel(demoSceneStatus.sceneName) && (
            <p>{getSimulationSceneLabel(demoSceneStatus.sceneName)}</p>
          )}
          <p>업데이트: {formatDemoSceneUpdatedAt(demoSceneStatus.updatedAt)}</p>
        </div>
      </details>
    )
  }

  function renderAIInterpretationCard(panelVisible = false) {
    return renderExecutionResultCard(panelVisible)
  }

  function renderSelectedModeCard() {
    if (!lastModeResult) {
      return (
        <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 shadow-sm">
          <p className="hidden text-sm font-semibold text-gray-500">자동 선택된 모드</p>
          <p className="hidden mt-3 text-sm leading-relaxed text-gray-500">
            AI가 입력을 해석하면 입덧모드, 수면모드, 가사케어 모드, 여행 모드, 굿모닝 브리핑 중 하나를 선택해요.
          </p>
        </section>
      )
    }

    return (
      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <p className="hidden text-sm font-semibold text-blue-600">자동 선택된 모드</p>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-blue-50 px-5 py-4">
          <div>
            <p className="hidden text-2xl font-bold text-gray-900">
              {MODE_EMOJIS[lastModeResult.mode] ?? '✨'} {lastModeResult.modeLabel}
            </p>
            <p className="hidden mt-1 text-sm text-blue-700">
              {MODE_ACTION_DESCRIPTIONS[lastModeResult.mode] ?? 'ThinQ Mom이 집안 환경을 자동 조정합니다.'}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
            {lastModeResult.mode}
          </span>
        </div>
        {lastModeResult.recommendedModes && lastModeResult.recommendedModes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lastModeResult.recommendedModes.map((mode) => (
              <span key={mode} className="hidden rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                추천 {mode}
              </span>
            ))}
          </div>
        )}
      </section>
    )
  }

  function renderEnvironmentCard(panelVisible = false) {
    const deviceResults = lastModeResult?.deviceResults ?? []
    if (deviceResults.length === 0) return null

    return (
      <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className={hubShow(panelVisible, 'text-base font-semibold text-gray-900')}>집이 바꾼 환경</h2>
        <ul className="mt-4 space-y-3">
          {deviceResults.map((action) => (
            <li key={`${action.device}-${action.action}`} className="rounded-[16px] border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={hubShow(panelVisible, 'truncate text-sm font-semibold text-gray-900')}>{action.device}</p>
                  <p className={hubShow(panelVisible, 'mt-1 text-sm leading-relaxed text-gray-700')}>{action.label}</p>
                </div>
                <span className={hubShow(panelVisible, `shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getDeviceStatusBadge(action)}`)}>
                  {getDeviceStatusLabel(action)}
                </span>
              </div>
              {(action.message || action.executionMessage) && (
                <p className={hubShow(panelVisible, 'mt-3 text-xs leading-relaxed text-gray-500')}>
                  {action.message ?? action.executionMessage}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  function renderVoiceTrigger(large = false, panelVisible = false) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {isExecuting && (
          <div
            className={hubShow(
              panelVisible,
              'flex min-h-[44px] items-center justify-center rounded-[16px] border border-purple-100 bg-white/90 px-4 py-3',
            )}
          >
            <Spinner text="케어 모드 실행 중..." />
          </div>
        )}

        <button
          type="button"
          onPointerDown={handleVoicePointerDown}
          onPointerUp={handleVoicePointerEnd}
          onPointerLeave={handleVoicePointerEnd}
          onPointerCancel={handleVoicePointerEnd}
          onTouchStart={handleVoiceTouchStart}
          onTouchEnd={handleVoiceTouchEnd}
          onTouchCancel={handleVoiceTouchEnd}
          onMouseDown={handleVoiceMouseDown}
          onMouseUp={handleVoiceMouseEnd}
          onMouseLeave={handleVoiceMouseEnd}
          disabled={voiceState !== 'idle' && voiceState !== 'recording'}
          className={hubShow(
            panelVisible,
            `min-h-[56px] w-full rounded-[20px] font-semibold transition select-none disabled:cursor-not-allowed disabled:opacity-60 ${
              large ? 'px-8 text-lg' : 'px-6 text-base'
            } ${getVoiceButtonClass()}`,
          )}
        >
          {voiceState === 'analyzing' || voiceState === 'executing' ? (
            <Spinner text={getVoiceButtonLabel()} />
          ) : (
            getVoiceButtonLabel()
          )}
        </button>

        {(voiceState === 'recording' || voiceState === 'analyzing' || voiceState === 'executing') && (
          <p className={hubShow(panelVisible, `text-center font-medium text-purple-700 ${large ? 'text-sm' : 'text-xs'}`)}>
            {voiceState === 'recording' && '듣고 있어요...'}
            {voiceState === 'analyzing' && '음성을 해석하고 있어요...'}
            {voiceState === 'executing' && '케어 모드를 실행하고 있어요...'}
          </p>
        )}

        <form onSubmit={handleNaturalLanguageSubmit} className="space-y-3">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
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
              className={hubShow(
                panelVisible,
                `min-h-[44px] min-w-0 flex-1 rounded-[16px] border border-gray-200 bg-white px-4 text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 disabled:opacity-60 ${
                  large ? 'text-base' : 'text-sm'
                }`,
              )}
            />
            <button
              type="submit"
              disabled={isExecuting || !inputText.trim()}
              className={hubShow(
                panelVisible,
                `min-h-[44px] shrink-0 rounded-[16px] bg-purple-600 px-4 font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 ${
                  large ? 'text-base' : 'text-sm'
                }`,
              )}
            >
              텍스트로 실행
            </button>
          </div>
        </form>

        {lastSubmittedText && (
          <div className={hubShow(panelVisible, 'rounded-[16px] border border-purple-100 bg-white/80 px-4 py-3')}>
            <p className="text-xs font-semibold text-purple-500">마지막 입력</p>
            <p className="mt-1 text-sm text-gray-800">&quot;{lastSubmittedText}&quot;</p>
          </div>
        )}

        {hubVoiceNotice && (
          <div
            className={hubShow(
              panelVisible,
              'rounded-[16px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900',
            )}
          >
            {hubVoiceNotice}
          </div>
        )}

        <p className={hubShow(panelVisible, `text-center leading-relaxed text-gray-500 ${large ? 'text-sm' : 'text-xs'}`)}>
          음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.
        </p>
      </div>
    )
  }

  function renderModeRunLogs(panelVisible = false) {
    const logs = recentModeRuns.length > 0 ? recentModeRuns : modeRunLogs

    if (logs.length === 0) {
      return <p className={hubShow(panelVisible, 'mt-3 text-sm text-gray-500')}>아직 실행 로그가 없어요</p>
    }

    return (
      <ul className="mt-4 space-y-3">
        {logs.map((log) => (
          <li key={log.id} className="rounded-[16px] border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <span className={hubShow(panelVisible, 'text-lg')}>{MODE_EMOJIS[log.mode] ?? '✨'}</span>
              <div>
                <p className={hubShow(panelVisible, 'text-sm font-semibold text-gray-900')}>
                  {getHubModeDisplayLabel(log.mode, log.mode_label || log.mode)}
                </p>
                <p className={hubShow(panelVisible, 'mt-1 text-xs text-gray-400')}>{formatTime(log.created_at)}</p>
                <p className={hubShow(panelVisible, 'mt-2 line-clamp-1 text-xs text-gray-600')}>{getReplyFirstLine(log.reply)}</p>
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
            <span className="hidden">{command}</span>
          </button>
        ))}
      </div>
    )
  }

  function renderMinimalHubLanding() {
    const isListening = voiceStatus === 'recording' || externalHubListening
    const landingLabel = isListening
      ? '듣고 있어요...'
      : voiceStatus === 'processing' || isExecuting || sharedCareState === 'processing'
        ? '집을 바꾸고 있어요'
        : voiceStatus === 'done' || sharedCareState === 'completed'
          ? '다시 눌러 말하기'
          : '눌러서 대화 시작'

    return (
      <main className="relative mx-auto flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#fdf6f8_52%,#f5eff1_100%)] px-6">
        <div className="relative flex items-center justify-center">
          <div
            ref={glowRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 m-auto h-[clamp(280px,74vw,440px)] w-[clamp(280px,74vw,440px)] rounded-full hub-voice-glow ${
              isListening ? '' : 'hub-voice-glow-idle'
            }`}
          />
          <div className="relative z-10 flex h-[clamp(150px,42vw,196px)] w-[clamp(150px,42vw,196px)] items-center justify-center rounded-full bg-white shadow-[0_24px_64px_rgba(219,39,119,0.18)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hub-logo.png" alt="AI HUB" className="h-[72%] w-[72%] object-contain" />
          </div>
        </div>

        <button
          type="button"
          onPointerDown={handleVoicePointerDown}
          onPointerUp={handleVoicePointerEnd}
          onPointerCancel={handleVoicePointerEnd}
          onTouchStart={handleVoiceTouchStart}
          onTouchEnd={handleVoiceTouchEnd}
          onTouchCancel={handleVoiceTouchEnd}
          onMouseDown={handleVoiceMouseDown}
          onMouseUp={handleVoiceMouseEnd}
          onMouseLeave={handleVoiceMouseEnd}
          onContextMenu={(event) => event.preventDefault()}
          disabled={voiceState !== 'idle' && voiceState !== 'recording'}
          className={`absolute bottom-[clamp(2.5rem,9vh,5.5rem)] touch-none select-none rounded-full px-8 py-3.5 text-sm font-semibold shadow-[0_10px_30px_rgba(219,39,119,0.16)] outline-none transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${
            isListening
              ? 'bg-gradient-to-r from-[#7C3AED] via-[#DB2777] to-[#F43F5E] text-white'
              : 'bg-white/90 text-gray-700 hover:bg-white'
          }`}
          aria-label="누르고 있는 동안 음성으로 말하기"
        >
          {landingLabel}
        </button>
      </main>
    )
  }

  function renderHubBottomSheet() {
    if (!isHubPanelOpen) return null

    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={closeHubPanel}
          aria-hidden="true"
        />
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
            <button
              type="button"
              onClick={navigateToSelect}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-600"
              aria-label="뒤로가기"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={closeHubPanel}
              className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
            <header className="mb-5 pt-1">
              <h1 className="text-lg font-bold text-gray-900">ThinQ Mom 케어 실행</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                원하는 문장을 말하거나 선택하면 ThinQ Mom이 상황에 맞는 케어 모드를 실행해요.
              </p>
            </header>

            <section className="rounded-[20px] border border-purple-100 bg-gradient-to-br from-purple-50 via-blue-50 to-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-purple-700">음성/텍스트 입력</p>
              {renderHubPanelNotice(true)}
              {renderVoiceTrigger(false, true)}
            </section>

            <div className="mt-5">{renderDemoSpeechExamples(true)}</div>

            {renderHiddenManualControls()}
          </div>
        </div>
      </>
    )
  }

  return (
    <div
      className={`relative min-h-dvh bg-[#FAFAFA] ${isHubPanelOpen ? 'overflow-x-hidden' : 'overflow-hidden'}`}
    >
      {toast && isHubPanelOpen && <Toast message={toast.message} type={toast.type} />}
      {!isHubPanelOpen && renderMinimalHubLanding()}
      {renderHubBottomSheet()}
      <div className="hidden" aria-hidden="true">
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
                    <span className="hidden text-gray-500">기분: </span>
                    {wifeTodayMood ? (
                      <span className="hidden font-medium">
                        {wifeTodayMood.emoji} {wifeTodayMood.mood}
                      </span>
                    ) : (
                      <span className="hidden text-gray-400">아직 기록 없음</span>
                    )}
                  </p>
                  <p>
                    <span className="hidden text-gray-500">최근 증상: </span>
                    {wifeLatestDiary ? (
                      <span className="hidden">
                        {wifeLatestDiary.symptom_text} · {formatTime(wifeLatestDiary.created_at)}
                      </span>
                    ) : (
                      <span className="hidden">-</span>
                    )}
                  </p>
                  <p>
                    <span className="hidden text-gray-500">오늘 태동: </span>
                    <span className={`hidden font-semibold ${wifeMoodStyle.text}`}>{kickCount}회</span>
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
                      <p className="hidden mb-1 text-xs text-gray-500">입덧 모드</p>
                      <p className="hidden text-3xl font-bold text-blue-600">{weeklyStats.nauseaMode}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <p className="hidden mb-1 text-xs text-gray-500">수면 모드</p>
                      <p className="hidden text-3xl font-bold text-blue-600">{weeklyStats.sleepMode}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <p className="hidden mb-1 text-xs text-gray-500">태동 횟수</p>
                      <p className="hidden text-3xl font-bold text-blue-600">{weeklyStats.kick}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <p className="hidden mb-1 text-xs text-gray-500">음성 트리거</p>
                      <p className="hidden text-3xl font-bold text-blue-600">{weeklyStats.voice}</p>
                    </div>
                  </div>
                ) : (
                  <p className="hidden flex justify-center text-sm text-gray-500">
                    <span className="hidden">
                      <Spinner text="불러오는 중..." />
                    </span>
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <CardTitleRow title="월간 통계" cardId="weekly-stats" onExpand={setExpandedCard} />
                {monthlyStats ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-indigo-50 p-4 text-center">
                      <p className="hidden mb-1 text-xs text-gray-500">입덧 모드</p>
                      <p className="hidden text-3xl font-bold text-indigo-600">{monthlyStats.nauseaMode}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-4 text-center">
                      <p className="hidden mb-1 text-xs text-gray-500">수면 모드</p>
                      <p className="hidden text-3xl font-bold text-indigo-600">{monthlyStats.sleepMode}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-4 text-center">
                      <p className="hidden mb-1 text-xs text-gray-500">태동 횟수</p>
                      <p className="hidden text-3xl font-bold text-indigo-600">{monthlyStats.kick}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-4 text-center">
                      <p className="hidden mb-1 text-xs text-gray-500">음성 트리거</p>
                      <p className="hidden text-3xl font-bold text-indigo-600">{monthlyStats.voice}</p>
                    </div>
                  </div>
                ) : (
                  <p className="hidden flex justify-center text-sm text-gray-500">
                    <span className="hidden">
                      <Spinner text="불러오는 중..." />
                    </span>
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
              <p className="hidden flex flex-1 items-center justify-center text-center text-sm text-gray-500">
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
                    <span className="hidden shrink-0 font-mono text-xs text-gray-500">
                      {formatTime(item.created_at)}
                    </span>
                    <span className="hidden text-sm text-gray-700">{item.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
      </div>

      <nav className="hidden fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-100 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="min-h-[44px] rounded-[16px] bg-gray-900 text-xs font-semibold text-white">
            <span className="hidden">AI Hub 🎙️</span>
          </button>
          <button
            type="button"
            onClick={() => router.push(buildWifeUrl(searchParams.toString()))}
            className="min-h-[44px] rounded-[16px] bg-gray-100 text-xs font-semibold text-gray-600"
          >
            <span className="hidden">아내 화면 🌸</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/husband')}
            className="min-h-[44px] rounded-[16px] bg-gray-100 text-xs font-semibold text-gray-600"
          >
            <span className="hidden">남편 화면 💙</span>
          </button>
        </div>
      </nav>

      {expandedCard && isHubPanelOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60"
          onClick={() => setExpandedCard(null)}
        >
          <div
            className="fixed bottom-0 left-1/2 h-[90vh] w-full max-w-5xl -translate-x-1/2 overflow-y-auto rounded-t-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <h2 className="hidden text-xl font-bold text-gray-900">
                {EXPANDED_CARD_TITLES[expandedCard]}
              </h2>
              <button
                type="button"
                onClick={() => setExpandedCard(null)}
                className="shrink-0 text-xl text-gray-400 transition hover:text-gray-600"
                aria-label="닫기"
              >
                <span className="hidden">✕</span>
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
                  <p className="hidden flex justify-center text-base text-gray-500">
                    <span className="hidden">
                      <Spinner text="주간 통계 불러오는 중..." />
                    </span>
                  </p>
                )}
                <hr className="border-gray-100" />
                {monthlyStats ? (
                  renderPeriodStatsBlock(monthlyStats, '월간 통계', true, 'text-indigo-600')
                ) : (
                  <p className="hidden flex justify-center text-base text-gray-500">
                    <span className="hidden">
                      <Spinner text="월간 통계 불러오는 중..." />
                    </span>
                  </p>
                )}
              </div>
            )}

            {expandedCard === 'briefing' && renderBriefingContent(true)}

            {expandedCard === 'voice-trigger' && renderVoiceTrigger(true, true)}
          </div>
        </div>
      )}

      {showWifeStatusModal && (
        <div
          className="hidden fixed inset-0 z-50 justify-center bg-black/50"
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
              <span className="hidden">✕</span>
            </button>

            <h2 className="hidden pr-8 text-base font-semibold text-gray-900">아내 현재 상태 🌸</h2>
            <p className="hidden mt-1 text-sm text-gray-400">{getTodayDateOnly()}</p>
            <hr className="my-4 border-gray-100" />

            <div className={`mb-4 rounded-xl p-5 text-center ${wifeMoodStyle.bg}`}>
              <p className="hidden mb-1 text-sm text-gray-500">오늘 기분</p>
              {wifeTodayMood ? (
                <>
                  <p className="hidden text-4xl">{wifeTodayMood.emoji}</p>
                  <p className={`hidden mt-2 text-xl font-bold ${wifeMoodStyle.text}`}>{wifeTodayMood.mood}</p>
                </>
              ) : (
                <p className="hidden text-sm text-gray-400">아직 기록 없음</p>
              )}
            </div>

            <div className="mb-4 rounded-xl bg-gray-50 p-4">
              <p className="hidden mb-2 text-sm font-semibold text-gray-700">최근 증상</p>
              {wifeLatestDiary ? (
                <>
                  <p className="hidden text-sm leading-relaxed text-gray-800">{wifeLatestDiary.symptom_text}</p>
                  <p className="hidden mt-2 text-xs text-gray-400">{formatTime(wifeLatestDiary.created_at)}</p>
                </>
              ) : (
                <p className="hidden text-sm text-gray-400">-</p>
              )}
            </div>

            <div className="rounded-xl bg-blue-50 p-4 text-center">
              <p className="hidden mb-2 text-sm text-gray-600">오늘 태동</p>
              <p className={`hidden text-5xl font-bold ${wifeMoodStyle.text}`}>{kickCount}</p>
              <p className="hidden mt-1 text-sm text-gray-500">회</p>
            </div>
          </div>
        </div>
      )}

      {showFeedModal && (
        <div
          className="hidden fixed inset-0 z-50 justify-center bg-black/50"
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
              <span className="hidden">✕</span>
            </button>

            <h2 className="hidden mb-4 pr-8 text-base font-semibold text-gray-900">실시간 이벤트 피드 전체 📝</h2>

            {feed.length === 0 ? (
              <p className="hidden text-center text-sm text-gray-500">아직 이벤트가 없어요</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {feed.map((item) => (
                  <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="hidden shrink-0 text-xs text-gray-400">{formatTime(item.created_at)}</span>
                      <span className="hidden text-right text-sm text-gray-800">{item.label}</span>
                    </div>
                    {item.triggered_by && (
                      <span
                        className={`hidden mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.triggered_by === 'VOICE'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.triggered_by}
                      </span>
                    )}
                    {item.device_status && (
                      <p className="hidden mt-2 text-xs text-gray-500">
                        전원: {item.device_status.power} · 모드: {item.device_status.mode}
                      </p>
                    )}
                    {item.symptom_text && (
                      <p className="hidden mt-1 text-xs text-gray-600">{item.symptom_text}</p>
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
          className="hidden fixed inset-0 z-[60] justify-center bg-black/50"
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
              <span className="hidden">✕</span>
            </button>

            <h2 className="hidden mb-4 pr-8 text-base font-semibold text-gray-900">이벤트 상세</h2>

            <div className="space-y-3">
              <div className="rounded-2xl bg-blue-50 px-4 py-3">
                <p className="hidden mb-1 text-xs text-gray-500">시간</p>
                <p className="hidden text-sm text-gray-800">{formatFeedDateTime(selectedFeedItem.created_at)}</p>
              </div>

              <div className="rounded-2xl bg-blue-50 px-4 py-3">
                <p className="hidden mb-1 text-xs text-gray-500">이벤트 유형</p>
                <p className="hidden text-sm text-gray-800">{selectedFeedItem.label}</p>
              </div>

              {selectedFeedItem.triggered_by && (
                <div className="rounded-2xl bg-blue-50 px-4 py-3">
                  <p className="hidden mb-1 text-xs text-gray-500">트리거 방식</p>
                  <p className="hidden text-sm text-gray-800">{selectedFeedItem.triggered_by}</p>
                </div>
              )}

              {selectedFeedItem.device_status && (
                <div className="rounded-2xl bg-blue-50 px-4 py-3">
                  <p className="hidden mb-1 text-xs text-gray-500">기기 상태</p>
                  <p className="hidden text-sm text-gray-800">
                    전원: {selectedFeedItem.device_status.power}
                  </p>
                  <p className="hidden text-sm text-gray-800">
                    모드: {selectedFeedItem.device_status.mode}
                  </p>
                  {selectedFeedItem.device_status.pm25 !== undefined && (
                    <p className="hidden text-sm text-gray-800">
                      공기 속 먼지: {selectedFeedItem.device_status.pm25}
                    </p>
                  )}
                </div>
              )}

              {selectedFeedItem.symptom_text && (
                <div className="rounded-2xl bg-blue-50 px-4 py-3">
                  <p className="hidden mb-1 text-xs text-gray-500">증상 내용</p>
                  <p className="hidden text-sm leading-relaxed text-gray-800">
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
