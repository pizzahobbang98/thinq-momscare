'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import DiaryCalendarModal from '@/components/diary/DiaryCalendarModal'
import UltrasoundUploadModal from '@/components/ultrasound/UltrasoundUploadModal'
import SmartHomeDashboard from '@/components/home-demo/SmartHomeDashboard'
import { useThinQDeviceState } from '@/hooks/useThinQDeviceState'
import type { ThinQDeviceStateView } from '@/lib/thinq-device-state-client'
import PregnancyFruitImage from '@/components/ultrasound/PregnancyFruitImage'
import {
  DEMO_DIARY_CALENDAR_ENTRIES,
  HUSBAND_DEMO_DIARY_CALENDAR_ENTRIES,
} from '@/lib/diary-demo'
import type { DiaryCalendarEntry } from '@/lib/diary-calendar-types'
import { PREPARING_DIARY_DEMO_ENTRIES } from '@/lib/preparing-diary-demo'
import { createPregnancyDateInsight, getDailyConditionInsight, type DailyInsight } from '@/lib/pregnancy-insight'
import { DEMO_WIFE_ID, isSupabaseConfigured, supabase, type DiaryEntry, type UltrasoundRecord } from '@/lib/supabase'
import {
  DEFAULT_SHARED_DEMO_STATE,
  isDemoPregnancyStatus,
  isDemoRole,
  isPreparationMode,
  normalizeDiaryEntries,
  normalizeSharedDemoState,
  type DemoPregnancyStatus,
  type DemoRole,
  type SharedDemoModeState,
  type SharedDemoUserState,
  type PreparationMode,
  type SharedDemoState,
} from '@/lib/shared-demo-state'
import {
  buildUltrasoundGrowthModeRun,
  saveUltrasoundGrowthCareLocally,
} from '@/lib/ultrasound-care-bridge'
import { readCareLogsFromLocalStorage } from '@/lib/care-log-storage'
import {
  buildStoredCardFromAnalyzeResponse,
  mergeLocalOnlyCards,
  readUltrasoundCardsFromLocalStorage,
  removeUltrasoundCardFromLocalStorage,
  saveUltrasoundCardToLocalStorage,
} from '@/lib/ultrasound-storage'
import type { UltrasoundAnalyzeResponse, UltrasoundStoredCard } from '@/lib/ultrasound-types'
import { ULTRASOUND_MAIN_DEMO_HINT } from '@/lib/ultrasound-demo'
import { getPregnancyFruit } from '@/lib/pregnancy-fruit'
import {
  buildPregnancyCalendarEvents,
  buildPreparingCalendarEvents,
} from '@/lib/pregnancy-calendar'
import {
  getDefaultPreparationCycleProfile,
  getKoreaTodayKey,
  isDateKey,
  readPreparationCycleProfile,
  savePreparationCycleProfile,
  type PreparationCycleProfile,
} from '@/lib/preparation-cycle-profile'
import {
  publishHubListeningState,
  sendModeToSimulation,
  sendVoiceCommandToSimulation,
  type Simulation3DVoiceIntentResult,
} from '@/lib/simulation-broadcast'
import { getHomeCareMessage } from '@/lib/home-care-messages'
import type { HueMode } from '@/lib/hue-presets'
import {
  applyHueBleMode,
  applyHueBlePower,
  connectHueBle,
  getHueBleStatus,
  subscribeHueBleStatus,
  type HueBleConnectionStatus,
} from '@/lib/hue-ble-client'
import { triggerLocalLight } from '@/lib/hue-local-client'
import {
  DEFAULT_LIGHT_COLOR,
  type LightPowerState,
  getLightPowerAction,
  resolveHueModeFromCareResult,
} from '@/lib/light-control'
import { ONBOARDING_STORAGE_KEYS, readOnboardingProfile } from '@/lib/onboarding-profile'

const LOCAL_STATE_KEY = 'thinq-mom-shared-demo-state'
const LEGACY_PROFILE_READY_KEY = 'thinq-mom-profile-ready'
const MOBILE_PROFILE_COMPLETION_KEY = 'thinq-mom-mobile-profile-completion'
const MIC_GRANTED_KEY = 'thinq-mom-mic-granted'
const BROWSER_CLIENT_ID_KEY = 'thinq-mom-browser-client-id'
const POLL_INTERVAL_MS = 250
const SHARED_DEMO_STATE_SOURCE = 'demo_state'
const SHARED_DEMO_STATE_MODE = 'DEMO_STATE'
const DAY_MS = 86_400_000

type MicrophonePermissionStatus = 'unknown' | 'granted' | 'denied' | 'unsupported'
type MobileHubVoiceState = 'idle' | 'listening' | 'processing' | 'done' | 'error'

type VoiceApiResponse = {
  success?: boolean
  transcript?: string
  message?: string
  error?: string
}

type GeneratedDiaryStorage = 'diary_entries' | 'symptom_logs' | null

type GeneratedTodayDiaryMarker = {
  id: string
  storage: GeneratedDiaryStorage
  createdAt: string
}

type MobileProfileCompletion = {
  version: 1
  completedAt: string
  pregnancyStatus: DemoPregnancyStatus
  pregnancyWeek: number
  role: DemoRole
  pregnancyStartDate: string
  babyName: string
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

type HubExecuteResponse = {
  success?: boolean
  partialSuccess?: boolean
  mode?: string
  modeLabel?: string
  reply?: string
  error?: string
  wifeCard?: string
  husbandCard?: string
  demoUpdatedAt?: string
}

type MobileHubThinQCommand = 'NAUSEA_MODE' | 'SLEEP_MODE' | 'AUTO' | 'SAVING' | 'AIR_ON' | 'AIR_OFF'

type SharedDemoStateRealtimeRow = {
  mode?: unknown
  source?: unknown
  signals?: unknown
}

type ApplySharedStateOptions = {
  remote?: boolean
}

type ProfileDraftField =
  | 'pregnancyStatus'
  | 'role'
  | 'pregnancyWeek'
  | 'pregnancyStartDate'
  | 'babyName'
  | 'lastPeriodStartDate'
  | 'cycleLength'
  | 'motherName'

const MANUAL_QUICK_CARE_OPTIONS = [
  {
    id: 'NAUSEA_MODE',
    label: '입덧 케어',
    description: '냄새와 답답한 공기를 빠르게 줄여요.',
    command: '음식 냄새 때문에 속이 안 좋아',
  },
  {
    id: 'SLEEP_MODE',
    label: '수면 케어',
    description: '조용한 공기와 낮은 조명으로 전환해요.',
    command: '잠이 잘 오게 해줘',
  },
  {
    id: 'HOUSEWORK_MODE',
    label: '가사 케어',
    description: '먼지 관리와 밝은 활동 조명으로 맞춰요.',
    command: '빨래와 청소를 도와줘',
  },
  {
    id: 'TRAVEL_OCEAN',
    label: '바다 휴양',
    description: '바다 장면과 산들바람 모드로 바꿔요.',
    command: '바다 분위기로 바꿔줘',
  },
  {
    id: 'TRAVEL_FOREST',
    label: '숲 휴양',
    description: '숲 장면과 자연풍 분위기로 전환해요.',
    command: '숲 분위기로 바꿔줘',
  },
  {
    id: 'TRAVEL_CITY',
    label: '도시 휴양',
    description: '은은한 도시 야경 조명과 차분한 실내 분위기로 전환해요.',
    command: '도시 야경처럼 은은한 조명과 차분한 공간 분위기로 전환해줘',
  },
] as const

const MANUAL_AIR_PURIFIER_ON = {
  id: 'AIR_ON',
  label: '공기청정기 켜기',
  description: '공기청정기를 켜요.',
  command: '공기청정기 켜줘',
} as const

const MANUAL_AIR_PURIFIER_OFF = {
  id: 'AIR_OFF',
  label: '공기청정기 끄기',
  description: '공기청정기를 꺼요.',
  command: '공기청정기 꺼줘',
} as const

const MANUAL_PREPARATION_OPTIONS = [
  { id: 'condition' as const, label: '컨디션 밸런스', description: '아침 공기와 움직임을 가볍게 맞춰요.', command: '컨디션 모드로 맞춰줘' },
  { id: 'sleep-rhythm' as const, label: '수면 리듬', description: '잠들기 좋은 저소음 공기와 조명으로 맞춰요.', command: '수면 리듬 모드로 맞춰줘' },
  { id: 'refresh' as const, label: '마음 환기', description: '답답한 공기와 기분을 함께 전환해요.', command: '마음 환기 모드로 맞춰줘' },
  { id: 'rest-ready' as const, label: '휴식 준비', description: '쉬는 시간에 맞춰 조용한 약풍을 유지해요.', command: '휴식 준비 모드로 맞춰줘' },
  { id: 'couple-routine' as const, label: '둘의 저녁', description: '대화와 휴식에 맞는 정숙 모드로 맞춰요.', command: '둘의 저녁 모드로 맞춰줘' },
]

const ULTRASOUND_GROWTH_SCENES = [
  '작은 아기집을 처음 확인한 날',
  '조금 더 선명해진 작은 모습을 만난 날',
  '둥글게 자리 잡은 아기의 모습을 본 날',
  '머리와 몸의 윤곽이 나뉘어 보인 날',
  '작은 몸과 팔다리의 형태를 바라본 날',
  '한 화면에 담긴 아기의 전신을 본 날',
  '옆모습과 굽은 다리를 함께 본 날',
  '조금 더 또렷해진 얼굴 윤곽을 본 날',
  '길어진 팔다리와 몸의 균형을 본 날',
  '얼굴 가까이 손을 올린 모습을 본 날',
  '몸을 편안하게 웅크린 모습을 본 날',
  '등과 팔다리의 윤곽을 차분히 본 날',
  '한층 자란 아기의 옆모습을 만난 날',
] as const

function getDemoGrowthText(pregnancyWeek: number) {
  if (pregnancyWeek <= 8) {
    return `${pregnancyWeek}주차에는 작은 아기집 안에서 아기의 초기 모습을 차분히 확인해요.`
  }
  if (pregnancyWeek <= 12) {
    return `${pregnancyWeek}주차에는 머리와 몸, 작은 팔다리의 윤곽이 조금씩 구분되어 보여요.`
  }
  if (pregnancyWeek <= 15) {
    return `${pregnancyWeek}주차에는 몸의 비율이 달라지고 팔다리가 길어지는 성장 흐름을 볼 수 있어요.`
  }
  return `${pregnancyWeek}주차에는 얼굴과 몸의 윤곽이 한층 또렷해지고 다양한 자세가 보여요.`
}

const MOBILE_ULTRASOUND_DEMO_RECORDS: UltrasoundStoredCard[] =
  ULTRASOUND_GROWTH_SCENES.map((sceneLabel, index) => {
    const pregnancyWeek = index + 6

    return {
      id: `mobile-growth-demo-week-${pregnancyWeek}`,
      imageUrl: `/demo/ultrasound/growth-week-${String(pregnancyWeek).padStart(2, '0')}.png`,
      createdAt: new Date(Date.UTC(2026, 4, pregnancyWeek)).toISOString(),
      babyName: '아기',
      pregnancyWeek,
      title: `${pregnancyWeek}주차, ${sceneLabel}`,
      recordScore: 80 + Math.min(index, 10),
      recordLabel: '성장 중',
      recordNote: '주차별 성장 흐름을 살펴보기 위한 시연 기록이에요.',
      sceneLabel,
      sceneNote: '',
      growthText: getDemoGrowthText(pregnancyWeek),
      tags: [`${pregnancyWeek}주차`, '성장 기록'],
      babyVoiceText: '엄마, 오늘도 조금씩 자라고 있어요.',
      diarySnippet: `${pregnancyWeek}주차의 작은 모습을 사진으로 남겼다. 지난 기록과 나란히 보니 아기가 자라는 시간이 더 가까이 느껴졌다.`,
      disclaimer: '이 이미지는 앱 시연을 위해 생성한 합성 이미지이며 의료 판단에 사용할 수 없어요.',
    }
  })

function isUserUploadedUltrasoundCard(card: UltrasoundStoredCard) {
  return (
    card.id.startsWith('local-')
    || card.imageUrl.startsWith('data:')
    || card.imageUrl.startsWith('blob:')
  )
}

type MobileTab = 'home' | 'records' | 'hub' | 'manual' | 'settings'
type ManualAirPowerSync = { power: 'ON' | 'OFF'; nonce: number }

const MOBILE_HUB_AUDIO_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
] as const

function getSupportedMobileHubAudioMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return ''
  }

  return MOBILE_HUB_AUDIO_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? ''
}

const MOBILE_HUB_ROUTINE_THINQ_COMMANDS: Record<string, MobileHubThinQCommand> = {
  nausea_food: 'NAUSEA_MODE',
  sleep_care: 'SLEEP_MODE',
  housework_care: 'AUTO',
  destination_ocean: 'AUTO',
  destination_forest: 'AUTO',
  destination_city: 'AUTO',
}

const MOBILE_HUB_PREPARATION_THINQ_COMMANDS: Record<string, MobileHubThinQCommand> = {
  condition: 'AUTO',
  'sleep-rhythm': 'SLEEP_MODE',
  refresh: 'AUTO',
  'rest-ready': 'SLEEP_MODE',
  'housework-light': 'AUTO',
}

const MOBILE_HUB_ROUTINE_MODES: Record<string, string> = {
  nausea_food: 'NAUSEA_MODE',
  sleep_care: 'SLEEP_MODE',
  housework_care: 'HOUSEWORK_MODE',
  destination_ocean: 'TRAVEL_MODE',
  destination_forest: 'TRAVEL_MODE',
  destination_city: 'TRAVEL_MODE',
}

const MANUAL_QUICK_CARE_STATE: Record<string, { currentRoutine: string; simulationRoutine: string }> = {
  NAUSEA_MODE: { currentRoutine: 'NAUSEA_MODE', simulationRoutine: 'nausea_food' },
  SLEEP_MODE: { currentRoutine: 'SLEEP_MODE', simulationRoutine: 'sleep_care' },
  HOUSEWORK_MODE: { currentRoutine: 'HOUSEWORK_MODE', simulationRoutine: 'housework_care' },
  TRAVEL_OCEAN: { currentRoutine: 'TRAVEL_MODE', simulationRoutine: 'destination_ocean' },
  TRAVEL_FOREST: { currentRoutine: 'TRAVEL_MODE', simulationRoutine: 'destination_forest' },
  TRAVEL_CITY: { currentRoutine: 'TRAVEL_MODE', simulationRoutine: 'destination_city' },
}

function resolveMobileHubThinQCommand(result: Simulation3DVoiceIntentResult) {
  if (result.airPowerOff || result.deviceAction === 'off') return 'AIR_OFF'
  if (result.airPowerOn || result.deviceAction === 'on') return 'AIR_ON'

  if (result.routineId) {
    const command = MOBILE_HUB_ROUTINE_THINQ_COMMANDS[result.routineId]
    if (command) return command
  }

  if (result.preparationMode) {
    const command = MOBILE_HUB_PREPARATION_THINQ_COMMANDS[result.preparationMode]
    if (command) return command
  }

  return null
}

function resolveMobileHubModeFromVoiceResult(result: Simulation3DVoiceIntentResult) {
  if (result.routineId) {
    return MOBILE_HUB_ROUTINE_MODES[result.routineId] ?? null
  }

  if (result.airPowerOff || result.deviceAction === 'off') return 'AIR_OFF'
  if (result.airPowerOn || result.deviceAction === 'on') return 'AIR_ON'

  return null
}

function resolveHueModeFromVoiceResult(result: Simulation3DVoiceIntentResult): HueMode | null {
  return resolveHueModeFromCareResult(result)
}

function resolveCurrentHueModeFromSharedState(state: SharedDemoState): HueMode | null {
  if (state.pregnancyStatus === 'preparing') {
    return resolveHueModeFromCareResult({
      preparationMode: state.preparationMode,
    })
  }

  return resolveHueModeFromCareResult({
    routineId: state.simulationRoutine,
    queryMode: state.currentRoutine,
  })
}

function triggerHueModeForMobile(
  mode: HueMode,
  options: { source: string; commandId: string; action?: 'mode' | 'on' },
) {
  void triggerLocalLight({
    action: options.action ?? 'mode',
    mode,
    effect: 'solid',
    source: options.source,
    commandId: options.commandId,
  })
  void fetch('/api/hue/scene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      source: options.source,
      commandId: options.commandId,
    }),
  }).catch((error) => {
    console.warn('[mobile hue] Hue scene failed; care flow continues:', error)
  })
  void applyHueBleMode(mode).catch((error) => {
    console.warn('[mobile hue-ble] Hue Bluetooth scene failed; care flow continues:', error)
  })
}

const playedMobileTtsCommandIds = new Set<string>()
let activeMobileTtsAudio: HTMLAudioElement | null = null

function shouldPlayCareTtsInApp() {
  if (typeof window === 'undefined') return false

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  const standalone =
    navigatorWithStandalone.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  const touchOrMobile =
    window.matchMedia?.('(pointer: coarse)').matches === true ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)

  return standalone || touchOrMobile
}

async function playCareTtsInApp(text: string | null | undefined, commandId?: string) {
  const trimmed = text?.trim()
  if (!trimmed || !shouldPlayCareTtsInApp()) return
  if (commandId) {
    if (playedMobileTtsCommandIds.has(commandId)) return
    playedMobileTtsCommandIds.add(commandId)
  }

  try {
    activeMobileTtsAudio?.pause()
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, voice: 'park-hyemi' }),
    })
    if (!response.ok) throw new Error(`TTS HTTP ${response.status}`)

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    try {
      const audio = new Audio(url)
      audio.setAttribute('playsinline', 'true')
      activeMobileTtsAudio = audio
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error('audio playback failed'))
        void audio.play().catch(reject)
      })
    } finally {
      if (activeMobileTtsAudio?.src === url) activeMobileTtsAudio = null
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.warn('[mobile tts] ElevenLabs playback failed; falling back to browser speech:', error)
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(trimmed)
        utterance.lang = 'ko-KR'
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
      }
    } catch {
      // Visual/device flow should continue even when audio playback is blocked.
    }
  }
}

function triggerHueSceneForMobileMode(
  result: Simulation3DVoiceIntentResult,
  options: { source: string; commandId: string; restoreMode?: HueMode | null },
) {
  const lightAction = getLightPowerAction(result)

  if (lightAction === 'off') {
    void triggerLocalLight({
      action: 'off',
      source: options.source,
      commandId: options.commandId,
    })
    void applyHueBlePower(false).catch((error) => {
      console.warn('[mobile hue-ble] Hue Bluetooth power off failed; care flow continues:', error)
    })
    return
  }

  if (lightAction === 'on') {
    if (options.restoreMode) {
      triggerHueModeForMobile(options.restoreMode, { ...options, action: 'on' })
      return
    }

    void triggerLocalLight({
      action: 'on',
      source: options.source,
      commandId: options.commandId,
    })
    void applyHueBlePower(true, DEFAULT_LIGHT_COLOR).catch((error) => {
      console.warn('[mobile hue-ble] Hue Bluetooth power on failed; care flow continues:', error)
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
    void applyHueBlePower(true, DEFAULT_LIGHT_COLOR).catch((error) => {
      console.warn('[mobile hue-ble] Hue Bluetooth default scene failed; care flow continues:', error)
    })
    return
  }

  const mode = resolveHueModeFromVoiceResult(result)
  if (!mode) return

  triggerHueModeForMobile(mode, options)
}

async function controlAirPurifierForMobileHubVoice(command: MobileHubThinQCommand) {
  try {
    const response = await fetch('/api/thinq/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    })
    const data = (await response.json()) as { success?: boolean; error?: string }
    if (!response.ok || data.success === false) {
      throw new Error(data.error ?? 'ThinQ mobile hub voice control failed')
    }
    return true
  } catch (error) {
    console.warn('[mobile hub] ThinQ device command failed; 3D flow continues:', error)
    return false
  }
}

function dateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDiaryContext(entry: DiaryEntry) {
  const usedModes = Array.isArray(entry.used_modes)
    ? entry.used_modes
    : typeof entry.used_modes === 'string'
      ? [entry.used_modes]
      : []
  let source: { pregnancyStatus?: string; role?: string } = {}
  try {
    source = entry.source_summary ? JSON.parse(entry.source_summary) : {}
  } catch {
    // Legacy demo entries use plain text source summaries.
  }

  const preparing =
    entry.id.startsWith('preparing-')
    || usedModes.includes('PREPARING_ROUTINE')
    || entry.source_summary?.includes('임신 준비') === true
    || entry.source_summary?.includes('"pregnancyStatus":"preparing"') === true
  const role = source.role === 'husband' || entry.id.includes('-husband-')
    ? 'husband'
    : 'wife'

  return { pregnancyStatus: preparing ? 'preparing' : 'pregnant', role }
}

function buildDiaryFallback(
  pregnancyStatus: DemoPregnancyStatus,
  pregnancyWeek: number,
  role: DemoRole,
): DiaryEntry {
  const createdAt = new Date().toISOString()

  if (pregnancyStatus === 'preparing') {
    return {
      id: `preparing-${role}-demo-today`,
      title: role === 'husband' ? '함께 속도를 맞춰본 날' : '천천히 준비한 오늘',
      content: role === 'husband'
        ? `오늘은 배우자의 컨디션을 먼저 묻고, 둘이 오래 이어갈 수 있는 생활 리듬을 함께 살펴봤다.

저녁에는 조명과 소리를 낮추고 편안히 대화할 시간을 만들었다. 무엇을 더 해야 할지 서두르기보다 서로의 피로와 마음을 알아주는 일이 먼저라는 생각이 들었다.

오늘처럼 작은 습관을 같이 정하고 같은 속도로 준비하는 시간을 이어가고 싶다.`
        : `오늘은 임신 준비를 서두르기보다 내 몸과 마음이 편안해질 수 있는 생활 리듬부터 살펴봤다.

저녁 식사 시간을 조금 일찍 맞추고, 잠들기 전에는 조명과 소리를 낮춰 쉬기로 했다. 필요한 것을 편하게 말해도 된다고 생각하니 마음이 한결 가벼워졌다.

완벽하게 지키는 것보다 오늘의 컨디션을 살피며 천천히 준비하는 시간을 이어가고 싶다.`,
      summary: role === 'husband'
        ? '배우자의 컨디션을 살피며 둘의 생활 리듬을 맞춘 하루'
        : '몸과 마음의 리듬을 살피며 천천히 준비한 하루',
      pregnancy_week: null,
      baby_name: null,
      source_summary: JSON.stringify({ pregnancyStatus, role, fallback: true }),
      used_modes: ['PREPARING_ROUTINE'],
      created_at: createdAt,
      is_demo: true,
    }
  }

  return {
    id: `pregnant-${role}-demo-today`,
    title: role === 'husband'
      ? `${pregnancyWeek}주차, 곁에서 살핀 하루`
      : `${pregnancyWeek}주차, 몸의 신호를 천천히 살핀 날`,
    content: role === 'husband'
      ? `오늘은 배우자가 평소보다 쉽게 지쳐 보여 집 안의 공기와 조명을 먼저 살폈다.

자주 상태를 묻기보다 편히 쉴 수 있도록 주변을 정리하고, 필요한 케어가 이어지는지 확인했다. 작은 배려라도 먼저 움직이면 배우자가 조금은 안심할 수 있겠다는 생각이 들었다.

오늘의 변화를 기억해두고 앞으로도 같은 편에서 차분히 함께하고 싶다.`
      : `오늘은 평소보다 몸이 쉽게 피로해져 무리하지 않고 쉬는 시간을 자주 가졌다.

냄새와 공기 상태에 예민해지는 순간에는 공기청정기와 편안한 화면이 집 안 분위기를 바꿔주었다. 지금 필요한 휴식을 먼저 챙기는 것이 아기와 나를 위한 일이라는 생각이 들었다.

오늘 느낀 작은 변화를 기억해두고 내 몸의 신호를 더 천천히 살펴보려 한다.`,
    summary: role === 'husband'
      ? `${pregnancyWeek}주차 배우자의 컨디션과 케어를 곁에서 살핀 하루`
      : `${pregnancyWeek}주차의 몸 상태와 휴식 필요를 살피며 보낸 하루`,
    pregnancy_week: pregnancyWeek,
    baby_name: '아기',
    source_summary: JSON.stringify({ pregnancyStatus, role, fallback: true }),
    used_modes: ['SLEEP_MODE', 'AIR_CARE'],
    created_at: createdAt,
    is_demo: true,
  }
}

function oneLineSummary(value: string, fallback: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return fallback
  return normalized.length > 54 ? `${normalized.slice(0, 54).trim()}…` : normalized
}

function readLocalState(): SharedDemoState {
  if (typeof window === 'undefined') return DEFAULT_SHARED_DEMO_STATE
  try {
    const raw = window.localStorage.getItem(LOCAL_STATE_KEY)
    if (!raw) return DEFAULT_SHARED_DEMO_STATE

    return normalizeSharedDemoState(JSON.parse(raw), DEFAULT_SHARED_DEMO_STATE)
  } catch {
    return DEFAULT_SHARED_DEMO_STATE
  }
}

function persistLocalState(state: SharedDemoState) {
  try {
    window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state))
  } catch {
    // The server remains the primary demo state store.
  }
}

function getBrowserClientId() {
  if (typeof window === 'undefined') return 'browser-pending'

  try {
    const existing = window.localStorage.getItem(BROWSER_CLIENT_ID_KEY)
    if (existing) return existing

    const next = `mobile-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`
    window.localStorage.setItem(BROWSER_CLIENT_ID_KEY, next)
    return next
  } catch {
    return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

function isMobileProfileCompletion(value: unknown): value is MobileProfileCompletion {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<MobileProfileCompletion>
  return (
    candidate.version === 1 &&
    typeof candidate.completedAt === 'string' &&
    isDemoPregnancyStatus(candidate.pregnancyStatus) &&
    isDemoRole(candidate.role) &&
    typeof candidate.pregnancyWeek === 'number' &&
    Number.isFinite(candidate.pregnancyWeek) &&
    typeof candidate.pregnancyStartDate === 'string' &&
    typeof candidate.babyName === 'string'
  )
}

function readMobileProfileCompletion() {
  try {
    if (typeof window === 'undefined') return null

    const raw = window.localStorage.getItem(MOBILE_PROFILE_COMPLETION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    return isMobileProfileCompletion(parsed) ? parsed : null
  } catch {
    return null
  }
}

function hasCompletedProfileSetup() {
  return readOnboardingProfile() !== null || readMobileProfileCompletion() !== null
}

function saveMobileProfileCompletion(
  state: SharedDemoState,
  preparationCycleProfile: PreparationCycleProfile,
) {
  const completion: MobileProfileCompletion = {
    version: 1,
    completedAt: new Date().toISOString(),
    pregnancyStatus: state.pregnancyStatus,
    pregnancyWeek: state.pregnancyWeek,
    role: state.role,
    pregnancyStartDate: preparationCycleProfile.pregnancyStartDate || '',
    babyName: preparationCycleProfile.babyName.trim(),
  }

  window.localStorage.setItem(MOBILE_PROFILE_COMPLETION_KEY, JSON.stringify(completion))
  window.localStorage.removeItem(LEGACY_PROFILE_READY_KEY)
}

function resetOnboardingStorageIfRequested() {
  try {
    if (typeof window === 'undefined') return false

    const params = new URLSearchParams(window.location.search)
    if (params.get('resetOnboarding') !== '1') return false

    window.localStorage.removeItem(MOBILE_PROFILE_COMPLETION_KEY)
    window.localStorage.removeItem(LEGACY_PROFILE_READY_KEY)
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.profile)
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.role)
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEYS.birthDate)
    return true
  } catch {
    return false
  }
}

function getStateUpdatedAt(state: SharedDemoState | null | undefined) {
  return [
    state?.lastUpdated,
    state?.demoMode?.updatedAt,
    state?.userState?.updatedAt,
  ].reduce((latest, value) => {
    const timestamp = Date.parse(value ?? '')
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest
  }, 0)
}

function buildMobileDemoModeState(
  mode: string | null,
  routine: string | null,
  label: string | null,
  source: string,
): SharedDemoModeState {
  return {
    mode,
    routine,
    label,
    source,
    updatedAt: new Date().toISOString(),
  }
}

function buildMobileUserState(
  state: SharedDemoState,
  babyName: string,
  source: string,
): SharedDemoUserState {
  return {
    pregnancyStatus: state.pregnancyStatus,
    role: state.role,
    pregnancyWeek: state.pregnancyWeek,
    babyName: babyName.trim() || '아기',
    source,
    updatedAt: new Date().toISOString(),
  }
}

function getSharedBabyName(state: SharedDemoState) {
  return state.userState?.babyName?.trim() || state.babyName?.trim() || '아기'
}

function buildProfileFromSharedState(
  current: PreparationCycleProfile,
  nextState: SharedDemoState,
): PreparationCycleProfile {
  return {
    ...current,
    babyName: getSharedBabyName(nextState),
    pregnancyStartDate: nextState.pregnancyStatus === 'pregnant'
      ? getPregnancyStartDateFromWeek(nextState.pregnancyWeek)
    : current.pregnancyStartDate,
  }
}

function mergeStateWithoutIncomingUserState(
  current: SharedDemoState,
  incoming: SharedDemoState,
): SharedDemoState {
  return {
    ...incoming,
    pregnancyStatus: current.pregnancyStatus,
    pregnancyWeek: current.pregnancyWeek,
    role: current.role,
    babyName: current.babyName,
    userState: current.userState,
  }
}

function getManualQuickCareIdFromState(state: SharedDemoState) {
  if (state.pregnancyStatus === 'preparing') {
    return isPreparationMode(state.preparationMode) ? state.preparationMode : null
  }

  const matched = Object.entries(MANUAL_QUICK_CARE_STATE).find(([, value]) => {
    return (
      value.currentRoutine === state.currentRoutine &&
      value.simulationRoutine === state.simulationRoutine
    )
  })

  return matched?.[0] ?? null
}

function resolveMobileHubSimulationRoutine(mode: string | null | undefined) {
  switch (mode) {
    case 'NAUSEA_MODE':
      return 'nausea_food'
    case 'SLEEP_MODE':
      return 'sleep_care'
    case 'HOUSEWORK_MODE':
      return 'housework_care'
    case 'TRAVEL_MODE':
      return 'destination_ocean'
    case 'destination_ocean':
    case 'destination_forest':
    case 'destination_city':
      return mode
    default:
      return null
  }
}

export default function MobileUserHome() {
  const [state, setState] = useState<SharedDemoState>(DEFAULT_SHARED_DEMO_STATE)
  const [todayKeyForInsight, setTodayKeyForInsight] = useState(() => getKoreaTodayKey())
  const [preparationCycleProfile, setPreparationCycleProfile] =
    useState<PreparationCycleProfile>(() => getDefaultPreparationCycleProfile())
  const [profileDraftState, setProfileDraftState] = useState<SharedDemoState>(DEFAULT_SHARED_DEMO_STATE)
  const [profileDraft, setProfileDraft] =
    useState<PreparationCycleProfile>(() => getDefaultPreparationCycleProfile())
  // 마지막으로 신뢰하는 상태의 lastUpdated(ms). 폴링이 내가 방금 바꾼 값을
  // 더 오래된 서버 응답으로 덮어써 되돌리는 현상을 막는 데 사용해요.
  const latestAppliedUpdateRef = useRef(0)
  const latestSharedStateRef = useRef<SharedDemoState>(DEFAULT_SHARED_DEMO_STATE)
  const pendingSharedWriteUntilRef = useRef(0)
  const pendingRemoteUserStateRef = useRef<SharedDemoState | null>(null)
  const profileEditingRef = useRef(true)
  const activeProfileFieldRef = useRef<ProfileDraftField | null>(null)
  const profileDirtyFieldsRef = useRef<Set<ProfileDraftField>>(new Set())
  const browserClientIdRef = useRef(getBrowserClientId())
  const [activeTab, setActiveTab] = useState<MobileTab>('home')
  const [profileReady, setProfileReady] = useState(false)
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [microphonePermission, setMicrophonePermission] =
    useState<MicrophonePermissionStatus>('unknown')
  const [showUltrasoundUploadModal, setShowUltrasoundUploadModal] = useState(false)
  const [showUltrasoundGallery, setShowUltrasoundGallery] = useState(false)
  const [selectedUltrasoundCard, setSelectedUltrasoundCard] =
    useState<UltrasoundStoredCard | null>(null)
  const [currentUltrasoundResult, setCurrentUltrasoundResult] =
    useState<UltrasoundAnalyzeResponse | null>(null)
  const [savedUltrasoundCards, setSavedUltrasoundCards] = useState<UltrasoundStoredCard[]>([])
  const [hiddenUltrasoundCardIds, setHiddenUltrasoundCardIds] = useState<Set<string>>(() => new Set())
  const [, setIsUltrasoundLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDiaryCalendar, setShowDiaryCalendar] = useState(false)
  const [showUltrasoundDetail, setShowUltrasoundDetail] = useState(false)
  const [hubVoiceState, setHubVoiceState] = useState<MobileHubVoiceState>('idle')
  const [hubVoiceText, setHubVoiceText] = useState('')
  const [, setMessage] = useState('')
  const [manualAirPowerSync, setManualAirPowerSync] = useState<ManualAirPowerSync | null>(null)
  const [selectedManualQuickCareId, setSelectedManualQuickCareId] = useState<string | null>(null)
  const [sessionDiaryEntry, setSessionDiaryEntry] = useState<DiaryEntry | null>(null)
  const [generatedTodayDiary, setGeneratedTodayDiary] =
    useState<GeneratedTodayDiaryMarker | null>(null)
  const diaryGenerationRef = useRef(false)
  const mobileHubRecorderRef = useRef<MediaRecorder | null>(null)
  const mobileHubStreamRef = useRef<MediaStream | null>(null)
  const mobileHubChunksRef = useRef<Blob[]>([])
  const mobileHubStartedAtRef = useRef(0)
  const mobileHubHoldActiveRef = useRef(false)
  const mobileHubMimeTypeRef = useRef('audio/webm')
  const hubRecognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const hubTranscriptRef = useRef('')
  const hubLiveTextRef = useRef('')
  const hubSilenceTimerRef = useRef<number | null>(null)
  const hubExecutedRef = useRef(false)
  const manualQuickProfileKeyRef = useRef(`${state.pregnancyStatus}:${state.role}`)
  const { thinqState, refetchThinQState } = useThinQDeviceState()

  useEffect(() => {
    profileEditingRef.current = !profileReady || showProfileEditor
  }, [profileReady, showProfileEditor])

  const applySharedState = useCallback((
    incomingState: SharedDemoState,
    options: ApplySharedStateOptions = {},
  ) => {
    const normalizedState = normalizeSharedDemoState(incomingState, latestSharedStateRef.current)
    const incomingUserState = normalizedState.userState
    const incomingFromThisBrowser =
      Boolean(incomingUserState?.source) &&
      incomingUserState?.source === browserClientIdRef.current
    const shouldProtectProfileDraft =
      options.remote === true &&
      Boolean(incomingUserState?.updatedAt) &&
      (
        incomingFromThisBrowser ||
        profileEditingRef.current ||
        activeProfileFieldRef.current !== null ||
        profileDirtyFieldsRef.current.size > 0
      )
    const nextState = shouldProtectProfileDraft
      ? mergeStateWithoutIncomingUserState(latestSharedStateRef.current, normalizedState)
      : normalizedState
    const nextUpdatedAt = getStateUpdatedAt(nextState)
    const hasPendingLocalWrite = Date.now() < pendingSharedWriteUntilRef.current
    if (shouldProtectProfileDraft && !incomingFromThisBrowser) {
      pendingRemoteUserStateRef.current = normalizedState
    }
    if (nextUpdatedAt < latestAppliedUpdateRef.current && (!options.remote || hasPendingLocalWrite)) {
      return false
    }

    latestAppliedUpdateRef.current = nextUpdatedAt
    latestSharedStateRef.current = nextState
    setState(nextState)
    setSelectedManualQuickCareId(getManualQuickCareIdFromState(nextState))
    setPreparationCycleProfile((current) => {
      const next = buildProfileFromSharedState(current, nextState)
      if (
        current.babyName === next.babyName &&
        current.pregnancyStartDate === next.pregnancyStartDate
      ) {
        return current
      }
      return savePreparationCycleProfile(next)
    })
    if (!shouldProtectProfileDraft && nextUpdatedAt > 0 && nextState.userState?.updatedAt) {
      try {
        const nextProfile = buildProfileFromSharedState(readPreparationCycleProfile(), nextState)
        saveMobileProfileCompletion(nextState, nextProfile)
      } catch {
        // Shared state remains primary even if local completion persistence is unavailable.
      }
    }
    persistLocalState(nextState)
    return true
  }, [])

  const changeTab = useCallback((tab: MobileTab) => {
    setActiveTab(tab)
  }, [])

  useEffect(() => {
    const profileKey = `${state.pregnancyStatus}:${state.role}`
    if (manualQuickProfileKeyRef.current === profileKey) return
    manualQuickProfileKeyRef.current = profileKey
    setSelectedManualQuickCareId(null)
  }, [state.pregnancyStatus, state.role])

  useEffect(() => {
    let cancelled = false

    window.queueMicrotask(() => {
      if (cancelled) return

      try {
        resetOnboardingStorageIfRequested()
        const localState = readLocalState()
        const localProfile = readPreparationCycleProfile()
        const completed = hasCompletedProfileSetup()
        profileEditingRef.current = !completed
        setPreparationCycleProfile(localProfile)
        setProfileDraft(localProfile)
        setProfileDraftState(localState)
        setProfileReady(completed)
        applySharedState(localState, { remote: !completed })
      } catch {
        setProfileReady(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [applySharedState])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_STATE_KEY || !event.newValue) return

      try {
        applySharedState(JSON.parse(event.newValue) as SharedDemoState, { remote: true })
      } catch {
        // Ignore malformed cross-tab writes and keep the polling fallback active.
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [applySharedState])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextKey = getKoreaTodayKey()
      setTodayKeyForInsight((current) => current === nextKey ? current : nextKey)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  // 마이크 권한을 매번 묻지 않도록, 이미 허용된 상태면 마운트 시 한 번만 반영해요.
  // 사용자가 직접 해지하면 Permissions API의 onchange로 다시 '확인 필요' 상태가 됩니다.
  useEffect(() => {
    let cancelled = false

    const initialTimer = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(MIC_GRANTED_KEY) === 'true') {
          setMicrophonePermission('granted')
        }
      } catch {
        // localStorage 접근 실패는 무시해요.
      }
    }, 0)

    const permissions = navigator.permissions
    if (permissions?.query) {
      permissions
        .query({ name: 'microphone' } as unknown as PermissionDescriptor)
        .then((status) => {
          if (cancelled) return
          const sync = () => {
            if (status.state === 'granted') {
              setMicrophonePermission('granted')
              try {
                window.localStorage.setItem(MIC_GRANTED_KEY, 'true')
              } catch {
                // ignore
              }
            } else if (status.state === 'denied') {
              setMicrophonePermission('denied')
              try {
                window.localStorage.removeItem(MIC_GRANTED_KEY)
              } catch {
                // ignore
              }
            }
          }
          sync()
          status.onchange = sync
        })
        .catch(() => {
          // microphone 권한 조회를 지원하지 않는 브라우저는 무시해요.
        })
    }

    return () => {
      cancelled = true
      window.clearTimeout(initialTimer)
    }
  }, [])

  const updatePreparationCycleProfile = useCallback((profile: PreparationCycleProfile) => {
    const normalized = savePreparationCycleProfile(profile)
    setPreparationCycleProfile(normalized)
  }, [])

  const requestMicrophoneAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophonePermission('unsupported')
      setMessage('이 브라우저에서는 마이크 권한을 요청할 수 없어요.')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setMicrophonePermission('granted')
      try {
        window.localStorage.setItem(MIC_GRANTED_KEY, 'true')
      } catch {
        // 권한 상태 기억은 보조 수단이라 실패해도 무시해요.
      }
      return true
    } catch {
      setMicrophonePermission('denied')
      try {
        window.localStorage.removeItem(MIC_GRANTED_KEY)
      } catch {
        // ignore
      }
      setMessage('HUB 음성 기능을 쓰려면 브라우저 마이크 권한을 허용해주세요.')
      return false
    }
  }, [])

  const updateState = useCallback(async (patch: Partial<SharedDemoState>) => {
    const optimistic = {
      ...state,
      ...patch,
      lastUpdated: new Date().toISOString(),
    }
    pendingSharedWriteUntilRef.current = Date.now() + 3000
    latestAppliedUpdateRef.current = getStateUpdatedAt(optimistic)
    latestSharedStateRef.current = optimistic
    setState(optimistic)
    persistLocalState(optimistic)

    try {
      const response = await fetch('/api/demo-state', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) throw new Error('shared state update failed')
      const payload = (await response.json()) as { state?: SharedDemoState }
      if (payload.state) {
        pendingSharedWriteUntilRef.current = 0
        applySharedState(payload.state, { remote: true })
      }
    } catch {
      pendingSharedWriteUntilRef.current = 0
    }
  }, [applySharedState, state])

  const updateProfileDraft = useCallback((
    nextDraft: PreparationCycleProfile,
    dirtyField?: ProfileDraftField,
  ) => {
    if (dirtyField) profileDirtyFieldsRef.current.add(dirtyField)
    setProfileDraft(nextDraft)
  }, [])

  const markProfileFieldActive = useCallback((field: ProfileDraftField) => {
    activeProfileFieldRef.current = field
  }, [])

  const clearProfileFieldActive = useCallback((field: ProfileDraftField) => {
    if (activeProfileFieldRef.current === field) {
      activeProfileFieldRef.current = null
    }
  }, [])

  const openProfileEditor = useCallback(() => {
    profileEditingRef.current = true
    profileDirtyFieldsRef.current.clear()
    activeProfileFieldRef.current = null
    setProfileDraftState(state)
    setProfileDraft(preparationCycleProfile)
    setShowProfileEditor(true)
  }, [preparationCycleProfile, state])

  const completeProfileSetup = useCallback(() => {
    const babyName = profileDraft.babyName.trim() || '아기'
    const committedState = {
      ...state,
      pregnancyStatus: profileDraftState.pregnancyStatus,
      pregnancyWeek: profileDraftState.pregnancyWeek,
      role: profileDraftState.role,
      babyName,
      currentRoutine: null,
      simulationRoutine: null,
      latestHubInput: null,
      latestCareModeLabel: null,
      preparationMode: 'condition' as const,
      lightPower: 'on' as const,
      careState: 'idle' as const,
    }
    const committedProfile = savePreparationCycleProfile(profileDraft)
    try {
      saveMobileProfileCompletion(committedState, committedProfile)
    } catch {
      // The shared demo state remains the source of truth for the profile.
    }
    setPreparationCycleProfile(committedProfile)
    setProfileDraft(committedProfile)
    setProfileDraftState(committedState)
    profileDirtyFieldsRef.current.clear()
    activeProfileFieldRef.current = null
    pendingRemoteUserStateRef.current = null
    profileEditingRef.current = false
    void updateState({
      pregnancyStatus: committedState.pregnancyStatus,
      pregnancyWeek: committedState.pregnancyWeek,
      role: committedState.role,
      babyName,
      currentRoutine: null,
      simulationRoutine: null,
      latestHubInput: null,
      latestCareModeLabel: null,
      preparationMode: 'condition',
      lightPower: 'on',
      careState: 'idle',
      userState: buildMobileUserState(committedState, babyName, browserClientIdRef.current),
    })
    setProfileReady(true)
    setShowProfileEditor(false)
    changeTab('home')
  }, [changeTab, profileDraft, profileDraftState, state, updateState])

  const executeHubTranscript = useCallback(async (rawTranscript: string) => {
    const transcript = rawTranscript.trim()
    if (!transcript) {
      setHubVoiceState('error')
      setHubVoiceText('음성을 알아듣지 못했어요. 다시 길게 누르고 말해주세요.')
      window.setTimeout(() => setHubVoiceState('idle'), 1600)
      return
    }

    setHubVoiceState('processing')
    setHubVoiceText(`"${transcript}"`)

    try {
      const executeResponse = await fetch('/api/simulation-3d/voice-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcript,
          pregnancyWeek: state.pregnancyStatus === 'pregnant' ? state.pregnancyWeek : undefined,
          pregnancyStatus: state.pregnancyStatus,
          preparationMode: state.preparationMode,
          role: state.role,
        }),
      })
      const executeData = (await executeResponse.json()) as Simulation3DVoiceIntentResult
      const routineId = executeData.routineId ?? null
      const mode = resolveMobileHubModeFromVoiceResult(executeData)
      const lightAction = getLightPowerAction(executeData)
      const lightPowerPatch =
        lightAction
          ? { lightPower: lightAction }
          : routineId || executeData.preparationMode || executeData.queryMode || executeData.defaultMode
            ? { lightPower: 'on' as const }
            : {}
      const modeLabel =
        executeData.intentSentence ??
        executeData.executionText ??
        executeData.ttsText ??
        mode ??
        'HUB 실행'

      if (!executeResponse.ok || executeData.success === false) {
        setHubVoiceState('error')
        setHubVoiceText(executeData.reply ?? '실행할 케어를 찾지 못했어요. 조금 더 구체적으로 말해주세요.')
        return
      }

      const source = 'mobile_hub_voice'
      const commandId = `mobile-hub-voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const deviceCommand = resolveMobileHubThinQCommand(executeData)
      const deviceHandled = Boolean(deviceCommand)
      const deviceControlPromise = deviceCommand
        ? controlAirPurifierForMobileHubVoice(deviceCommand)
        : Promise.resolve(false)

      sendVoiceCommandToSimulation(transcript, executeData, {
        source,
        deviceHandled,
        commandId,
      })
      triggerHueSceneForMobileMode(executeData, {
        source,
        commandId,
        restoreMode: lightAction === 'on' ? resolveCurrentHueModeFromSharedState(state) : null,
      })
      void playCareTtsInApp(
        executeData.ttsText ?? executeData.executionText ?? executeData.reply ?? modeLabel,
        commandId,
      )

      setHubVoiceState('done')
      setHubVoiceText(executeData.ttsText ?? executeData.executionText ?? executeData.reply ?? `${modeLabel} 모드를 실행했어요.`)

      void updateState({
        currentRoutine: lightAction ? state.currentRoutine : mode,
        simulationRoutine: lightAction ? state.simulationRoutine : routineId,
        demoMode: buildMobileDemoModeState(
          executeData.defaultMode
            ? null
            : lightAction
              ? state.currentRoutine
              : mode ?? executeData.preparationMode ?? executeData.queryMode ?? null,
          executeData.defaultMode
            ? null
            : lightAction
              ? state.simulationRoutine
              : routineId,
          modeLabel,
          source,
        ),
        ...(isPreparationMode(executeData.preparationMode) ? { preparationMode: executeData.preparationMode } : {}),
        ...lightPowerPatch,
        latestHubInput: transcript,
        latestCareModeLabel: modeLabel,
        careState: lightAction
          ? state.careState
          : routineId || executeData.preparationMode || executeData.queryMode
            ? 'completed'
            : 'idle',
        latestVoiceCommand: {
          id: commandId,
          transcript,
          result: executeData as unknown as Record<string, unknown>,
          source,
          deviceHandled,
          createdAt: new Date().toISOString(),
        },
      })
      if (deviceCommand) {
        void deviceControlPromise.then((success) => {
          if (!success) return
          window.setTimeout(() => {
            void refetchThinQState()
          }, 900)
        })
      }
    } catch (error) {
      console.warn('[mobile hub] voice execution failed:', error)
      setHubVoiceState('error')
      setHubVoiceText('HUB 실행에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      window.setTimeout(() => setHubVoiceState('idle'), 1800)
    }
  }, [
    state.pregnancyStatus,
    state.pregnancyWeek,
    state.preparationMode,
    state.role,
    state.currentRoutine,
    state.simulationRoutine,
    state.careState,
    updateState,
    refetchThinQState,
  ])

  // 실시간 인식(Web Speech API)을 못 쓰는 브라우저용 폴백: 녹음 후 서버 STT
  const processMobileHubAudio = useCallback(async (blob: Blob) => {
    setHubVoiceState('processing')
    setHubVoiceText('음성을 해석하고 있어요...')

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const voiceResponse = await fetch('/api/voice', { method: 'POST', body: formData })
      const voiceData = (await voiceResponse.json()) as VoiceApiResponse
      const transcript = voiceData.transcript?.trim()

      if (!transcript) {
        setHubVoiceState('error')
        setHubVoiceText(voiceData.message ?? '음성을 알아듣지 못했어요. 다시 길게 누르고 말해주세요.')
        window.setTimeout(() => setHubVoiceState('idle'), 1800)
        return
      }

      await executeHubTranscript(transcript)
    } catch (error) {
      console.warn('[mobile hub] voice transcription failed:', error)
      setHubVoiceState('error')
      setHubVoiceText('HUB 실행에 실패했어요. 잠시 후 다시 시도해주세요.')
      window.setTimeout(() => setHubVoiceState('idle'), 1800)
    }
  }, [executeHubTranscript])

  const startMobileHubRecording = useCallback(async () => {
    if (mobileHubHoldActiveRef.current || hubVoiceState === 'listening' || hubVoiceState === 'processing') return

    if (typeof window === 'undefined') {
      mobileHubHoldActiveRef.current = false
      return
    }

    // Keep the bottom HUB button as a deterministic press-to-record control.
    // Browser speech recognition is intentionally bypassed here.
    const SpeechRecognitionCtor = null as SpeechRecognitionCtor | null
    if (SpeechRecognitionCtor) {
      try {
        mobileHubHoldActiveRef.current = true
        hubTranscriptRef.current = ''
        hubLiveTextRef.current = ''
        hubExecutedRef.current = false
        setHubVoiceState('listening')
        setHubVoiceText('듣고 있어요...')
        publishHubListeningState(true)

        const recognition = new SpeechRecognitionCtor()
        recognition.lang = 'ko-KR'
        recognition.continuous = true
        recognition.interimResults = true
        hubRecognitionRef.current = recognition

        const recognitionStartedAt = Date.now()

        const clearSilenceTimer = () => {
          if (hubSilenceTimerRef.current !== null) {
            window.clearTimeout(hubSilenceTimerRef.current)
            hubSilenceTimerRef.current = null
          }
        }

        // 말이 잠시 멈추면(손을 떼지 않아도) 지금까지 인식된 문장으로 바로 실행해요.
        const runRecognizedCommand = () => {
          if (hubExecutedRef.current) return
          const transcript = hubLiveTextRef.current.trim()
          if (!transcript) return
          hubExecutedRef.current = true
          clearSilenceTimer()
          try {
            recognition.stop()
          } catch {
            // stop 실패는 무시하고 바로 실행해요.
          }
          void executeHubTranscript(transcript)
        }

        recognition.onresult = (event) => {
          // 최초 인식 성공 시 마이크 권한 허용 상태를 캐시해요.
          if (microphonePermission !== 'granted') {
            setMicrophonePermission('granted')
            try { window.localStorage.setItem(MIC_GRANTED_KEY, 'true') } catch {}
          }

          let interim = ''
          let finalText = hubTranscriptRef.current
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i]
            const text = result[0]?.transcript ?? ''
            if (result.isFinal) finalText += text
            else interim += text
          }
          hubTranscriptRef.current = finalText
          const live = `${finalText}${interim}`.trim()
          hubLiveTextRef.current = live
          setHubVoiceText(live || '듣고 있어요...')

          clearSilenceTimer()
          if (live) {
            hubSilenceTimerRef.current = window.setTimeout(runRecognizedCommand, 900)
          }
        }

        recognition.onerror = (event) => {
          if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
            mobileHubHoldActiveRef.current = false
            hubRecognitionRef.current = null
            setMicrophonePermission('denied')
            publishHubListeningState(false)
            setHubVoiceState('error')
            setHubVoiceText('마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.')
            window.setTimeout(() => setHubVoiceState('idle'), 2000)
          }
        }

        recognition.onend = () => {
          clearSilenceTimer()
          // 이미 자동 실행했으면 정리만 해요.
          if (hubExecutedRef.current) {
            hubRecognitionRef.current = null
            publishHubListeningState(false)
            return
          }
          // 누르고 있는 중 (말 없이) 자동 종료되면 계속 듣도록 재시작해요.
          if (mobileHubHoldActiveRef.current) {
            try {
              recognition.start()
              return
            } catch {
              // 재시작 실패 시 아래 정리/실행으로 넘어가요.
            }
          }
          hubRecognitionRef.current = null
          publishHubListeningState(false)
          // 300ms 미만 누름은 실수로 탭한 것으로 간주해 조용히 취소해요.
          const holdDuration = Date.now() - recognitionStartedAt
          if (holdDuration < 300) {
            setHubVoiceState('idle')
            return
          }
          const finalTranscript = hubLiveTextRef.current.trim()
          if (finalTranscript) {
            hubExecutedRef.current = true
            void executeHubTranscript(finalTranscript)
          } else {
            setHubVoiceState('error')
            setHubVoiceText('조금 더 길게 누르고 말해주세요.')
            window.setTimeout(() => setHubVoiceState('idle'), 1200)
          }
        }

        recognition.start()
        return
      } catch (error) {
        console.warn('[mobile hub] speech recognition unavailable, falling back to recording:', error)
        hubRecognitionRef.current = null
        // 아래 MediaRecorder 폴백으로 진행해요.
      }
    }

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      mobileHubHoldActiveRef.current = false
      void requestMicrophoneAccess()
      return
    }

    try {
      mobileHubHoldActiveRef.current = true
      setHubVoiceState('listening')
      setHubVoiceText('듣고 있어요...')
      publishHubListeningState(true)
      mobileHubChunksRef.current = []
      mobileHubStartedAtRef.current = Date.now()
      mobileHubMimeTypeRef.current = 'audio/webm'

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mobileHubHoldActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        publishHubListeningState(false)
        setHubVoiceState('idle')
        return
      }

      mobileHubStreamRef.current = stream
      const mimeType = getSupportedMobileHubAudioMimeType()
      mobileHubMimeTypeRef.current = mimeType || 'audio/webm'
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mobileHubRecorderRef.current = recorder
      mobileHubMimeTypeRef.current = recorder.mimeType || mobileHubMimeTypeRef.current

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mobileHubChunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        publishHubListeningState(false)
        stream.getTracks().forEach((track) => track.stop())
        mobileHubStreamRef.current = null
        mobileHubRecorderRef.current = null

        const duration = Date.now() - mobileHubStartedAtRef.current
        if (duration < 450 || mobileHubChunksRef.current.length === 0) {
          setHubVoiceState('error')
          setHubVoiceText('조금 더 길게 누르고 말해주세요.')
          window.setTimeout(() => setHubVoiceState('idle'), 1200)
          return
        }

        const recordedBlob = new Blob(mobileHubChunksRef.current, {
          type: mobileHubMimeTypeRef.current || recorder.mimeType || 'audio/webm',
        })
        void processMobileHubAudio(recordedBlob)
      }

      recorder.onerror = () => {
        publishHubListeningState(false)
        stream.getTracks().forEach((track) => track.stop())
        mobileHubStreamRef.current = null
        mobileHubRecorderRef.current = null
        setHubVoiceState('error')
        setHubVoiceText('녹음에 실패했어요. 다시 시도해주세요.')
        window.setTimeout(() => setHubVoiceState('idle'), 1200)
      }

      recorder.start()
    } catch (error) {
      console.warn('[mobile hub] recording start failed:', error)
      mobileHubHoldActiveRef.current = false
      publishHubListeningState(false)
      mobileHubStreamRef.current?.getTracks().forEach((track) => track.stop())
      mobileHubStreamRef.current = null
      mobileHubRecorderRef.current = null
      setMicrophonePermission('denied')
      setHubVoiceState('idle')
    }
  }, [
    hubVoiceState,
    microphonePermission,
    processMobileHubAudio,
    executeHubTranscript,
    requestMicrophoneAccess,
  ])

  const stopMobileHubRecording = useCallback(() => {
    mobileHubHoldActiveRef.current = false

    // Press-to-record path: releasing the HUB button finalizes the recorder.
    publishHubListeningState(false)
    const recorder = mobileHubRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      return
    }

    mobileHubStreamRef.current?.getTracks().forEach((track) => track.stop())
    mobileHubStreamRef.current = null
    if (hubVoiceState === 'listening') {
      setHubVoiceState('idle')
    }
  }, [hubVoiceState])

  // 허브 버튼을 누르고 있는 동안에만 터치 스크롤을 막아 배경을 고정해요.
  // (데스크톱 휠 스크롤에는 영향을 주지 않고, 누르고 있을 때만 일시적으로 잠급니다.)
  useEffect(() => {
    if (hubVoiceState !== 'listening') return
    const blockScroll = (event: TouchEvent) => event.preventDefault()
    document.addEventListener('touchmove', blockScroll, { passive: false })
    return () => document.removeEventListener('touchmove', blockScroll)
  }, [hubVoiceState])

  // 모바일 핀치 확대/축소 차단 (iOS 사파리는 viewport 설정을 무시해서 직접 막아요)
  useEffect(() => {
    const preventGesture = (event: Event) => event.preventDefault()
    const preventPinchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault()
    }
    document.addEventListener('gesturestart', preventGesture)
    document.addEventListener('gesturechange', preventGesture)
    document.addEventListener('gestureend', preventGesture)
    document.addEventListener('touchmove', preventPinchMove, { passive: false })
    return () => {
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
      document.removeEventListener('gestureend', preventGesture)
      document.removeEventListener('touchmove', preventPinchMove)
    }
  }, [])

  const changePregnancyStatus = useCallback((pregnancyStatus: DemoPregnancyStatus) => {
    profileDirtyFieldsRef.current.add('pregnancyStatus')
    setProfileDraftState((current) => ({
      ...current,
      pregnancyStatus,
      currentRoutine: null,
      simulationRoutine: null,
      latestHubInput: null,
      latestCareModeLabel: null,
      preparationMode: 'condition' as const,
      lightPower: 'on' as const,
      careState: 'idle' as const,
      babyName: profileDraft.babyName.trim() || current.babyName,
    }))
  }, [profileDraft.babyName])

  const changeRole = useCallback((role: DemoRole) => {
    profileDirtyFieldsRef.current.add('role')
    setProfileDraftState((current) => ({
      ...current,
      role,
      currentRoutine: null,
      simulationRoutine: null,
      latestHubInput: null,
      latestCareModeLabel: null,
      preparationMode: 'condition' as const,
      lightPower: 'on' as const,
      careState: 'idle' as const,
      babyName: profileDraft.babyName.trim() || current.babyName,
    }))
  }, [profileDraft.babyName])

  const changeProfilePregnancyStartDate = useCallback((dateKey: string) => {
    const safe = isDateKey(dateKey) ? dateKey : getKoreaTodayKey()
    profileDirtyFieldsRef.current.add('pregnancyStartDate')
    profileDirtyFieldsRef.current.add('pregnancyWeek')
    setProfileDraft((prev) => ({ ...prev, pregnancyStartDate: safe }))
    const week = getPregnancyWeekFromStartDate(safe)
    setProfileDraftState((current) => ({
      ...current,
      pregnancyWeek: week,
      babyName: profileDraft.babyName.trim() || current.babyName,
    }))
  }, [profileDraft.babyName])

  // 임신 시작일(캘린더)로 정확한 일수를 기록하고, 공유 상태의 주차도 함께 동기화합니다.
  const changePregnancyStartDate = useCallback((dateKey: string) => {
    const safe = isDateKey(dateKey) ? dateKey : getKoreaTodayKey()
    setPreparationCycleProfile((prev) => {
      const next = { ...prev, pregnancyStartDate: safe }
      savePreparationCycleProfile(next)
      return next
    })
    const week = getPregnancyWeekFromStartDate(safe)
    const nextState = {
      ...state,
      pregnancyWeek: week,
      babyName: preparationCycleProfile.babyName.trim() || state.babyName,
    }
    void updateState({
      pregnancyWeek: week,
      babyName: nextState.babyName,
      careState: 'idle',
      userState: buildMobileUserState(nextState, nextState.babyName, browserClientIdRef.current),
    })
    setMessage('임신 시작일 기준으로 오늘 상태를 업데이트했어요.')
  }, [preparationCycleProfile.babyName, state, updateState])

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch('/api/demo-state', { cache: 'no-store' })
      if (!response.ok) throw new Error('shared state fetch failed')
      const payload = (await response.json()) as { state?: SharedDemoState }
      if (payload.state) {
        applySharedState(payload.state, { remote: true })
      }
    } catch {
      applySharedState(readLocalState(), { remote: true })
    }
  }, [applySharedState])

  useEffect(() => {
    let realtimeSubscribed = false
    let lastRealtimeEventAt = 0
    let fallbackTimer: number | null = null
    let fallbackWatchdogTimer: number | null = null

    const startFallbackPolling = () => {
      if (fallbackTimer !== null) return
      fallbackTimer = window.setInterval(refreshState, POLL_INTERVAL_MS)
    }
    const stopFallbackPolling = () => {
      if (fallbackTimer === null) return
      window.clearInterval(fallbackTimer)
      fallbackTimer = null
    }
    const startFallbackWatchdog = () => {
      if (fallbackWatchdogTimer !== null) return
      fallbackWatchdogTimer = window.setInterval(() => {
        if (!realtimeSubscribed) {
          startFallbackPolling()
          return
        }
        if (lastRealtimeEventAt > 0 && Date.now() - lastRealtimeEventAt < 1500) {
          stopFallbackPolling()
          return
        }
        startFallbackPolling()
      }, 1000)
    }
    const stopFallbackWatchdog = () => {
      if (fallbackWatchdogTimer === null) return
      window.clearInterval(fallbackWatchdogTimer)
      fallbackWatchdogTimer = null
    }

    const initialTimer = window.setTimeout(refreshState, 0)
    const fallbackStartTimer = window.setTimeout(() => {
      if (!realtimeSubscribed) startFallbackPolling()
    }, 1500)
    startFallbackWatchdog()

    if (!isSupabaseConfigured) {
      startFallbackPolling()
      return () => {
        window.clearTimeout(initialTimer)
        window.clearTimeout(fallbackStartTimer)
        stopFallbackWatchdog()
        stopFallbackPolling()
      }
    }

    const channel = supabase
      .channel(`mobile-demo-state-${crypto.randomUUID?.() ?? Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mode_runs',
          filter: `source=eq.${SHARED_DEMO_STATE_SOURCE}`,
        },
        (payload) => {
          lastRealtimeEventAt = Date.now()
          const row = payload.new as SharedDemoStateRealtimeRow
          if (row.mode !== SHARED_DEMO_STATE_MODE || row.source !== SHARED_DEMO_STATE_SOURCE) return
          stopFallbackPolling()
          applySharedState(normalizeSharedDemoState(row.signals, latestSharedStateRef.current), { remote: true })
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeSubscribed = true
          void refreshState()
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          realtimeSubscribed = false
          startFallbackPolling()
        }
      })

    return () => {
      window.clearTimeout(initialTimer)
      window.clearTimeout(fallbackStartTimer)
      stopFallbackWatchdog()
      stopFallbackPolling()
      supabase.removeChannel(channel)
    }
  }, [applySharedState, refreshState])

  const fetchUltrasoundRecords = useCallback(async () => {
    const localCards = readUltrasoundCardsFromLocalStorage()
    setSavedUltrasoundCards(localCards)

    if (!DEMO_WIFE_ID) return

    setIsUltrasoundLoading(true)
    try {
      const { data, error } = await supabase
        .from('ultrasound_records')
        .select('*')
        .eq('user_id', DEMO_WIFE_ID)
        .order('created_at', { ascending: false })

      if (error) throw error

      const records = (data ?? []) as UltrasoundRecord[]
      const urlEntries = await Promise.all(
        records.map(async (record) => {
          if (!record.image_path) return null
          const { data: urlData } = await supabase.storage
            .from('ultrasound-images')
            .createSignedUrl(record.image_path, 3600)
          return urlData?.signedUrl ? [record.id, urlData.signedUrl] as const : null
        }),
      )
      const imageUrls = Object.fromEntries(
        urlEntries.filter((entry): entry is [string, string] => entry !== null),
      )
      setSavedUltrasoundCards(mergeLocalOnlyCards(records, imageUrls))
    } catch (error) {
      console.warn('[mobile-home] ultrasound records fallback:', error)
      setSavedUltrasoundCards(localCards)
    } finally {
      setIsUltrasoundLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchUltrasoundRecords(), 0)
    return () => window.clearTimeout(timer)
  }, [fetchUltrasoundRecords])

  const visibleDiaryEntries = useMemo(() => {
    const matchingEntries = normalizeDiaryEntries(state.diaryEntries).filter((entry) => {
      const context = getDiaryContext(entry)
      const matchesContext = context.pregnancyStatus === state.pregnancyStatus
        && context.role === state.role
      if (!matchesContext) return false
      if (state.pregnancyStatus === 'preparing') return true

      return entry.pregnancy_week === state.pregnancyWeek
    })

    return matchingEntries.length > 0
      ? matchingEntries
      : [buildDiaryFallback(state.pregnancyStatus, state.pregnancyWeek, state.role)]
  }, [state.diaryEntries, state.pregnancyStatus, state.pregnancyWeek, state.role])

  const diaryCalendarEntries = useMemo(() => {
    const todayKey = dateKey(new Date())

    // 실제 저장된 엔트리만 사용하되, 오늘 일기는 버튼 클릭 전 기본 표시하지 않아요.
    const actualEntries = normalizeDiaryEntries(state.diaryEntries)
      .filter((entry) => {
        const context = getDiaryContext(entry)
        const matchesContext = context.pregnancyStatus === state.pregnancyStatus
          && context.role === state.role
        if (!matchesContext) return false
        if (state.pregnancyStatus === 'preparing') return true
        return entry.pregnancy_week === state.pregnancyWeek
      })
      .filter((entry) => dateKey(entry.created_at) !== todayKey)

    // 세션 다이어리가 있으면 같은 날짜의 기존 항목을 대체
    const entriesToShow = sessionDiaryEntry
      ? [
          sessionDiaryEntry,
          ...actualEntries.filter((e) => dateKey(e.created_at) !== dateKey(sessionDiaryEntry.created_at)),
        ]
      : actualEntries

    const storedEntries: DiaryCalendarEntry[] = entriesToShow.map((entry) => ({
      date: dateKey(entry.created_at),
      title: entry.title,
      content: entry.content,
      tags: Array.isArray(entry.used_modes)
        ? entry.used_modes
        : typeof entry.used_modes === 'string'
          ? [entry.used_modes]
          : [],
      kind: 'diary',
    }))

    // 오늘 날짜 데모 엔트리는 표시하지 않음 (버튼 클릭 전 오늘 일기 금지)
    const demoEntries = (state.pregnancyStatus === 'preparing'
      ? PREPARING_DIARY_DEMO_ENTRIES
      : state.role === 'husband'
        ? HUSBAND_DEMO_DIARY_CALENDAR_ENTRIES
        : DEMO_DIARY_CALENDAR_ENTRIES
    ).filter((entry) => entry.date !== todayKey)

    const scheduleEntries: DiaryCalendarEntry[] = (
      state.pregnancyStatus === 'preparing'
        ? buildPreparingCalendarEvents()
        : buildPregnancyCalendarEvents(state.pregnancyWeek)
    ).map((event) => ({
      date: event.date,
      title: event.title,
      content: event.description,
      tags: [event.action],
      kind: event.kind === 'checkup' ? 'checkup' : 'preparation',
    }))

    return [...storedEntries, ...demoEntries, ...scheduleEntries]
  }, [state.diaryEntries, state.pregnancyStatus, state.pregnancyWeek, state.role, sessionDiaryEntry])
  // 이번 세션에서 버튼으로 만든 오늘 일기만 오늘 항목으로 취급해요.
  const hasTodayDiaryEntry = useMemo(() => {
    const todayKey = dateKey(new Date())
    return Boolean(sessionDiaryEntry && dateKey(sessionDiaryEntry.created_at) === todayKey)
  }, [sessionDiaryEntry])
  const latestUltrasoundCard = savedUltrasoundCards[0] ?? null
  const userUploadedUltrasoundCards = savedUltrasoundCards
    .filter(isUserUploadedUltrasoundCard)
    .filter((card) => !hiddenUltrasoundCardIds.has(card.id))
    .toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const ultrasoundFeedCards = [
    ...userUploadedUltrasoundCards,
    ...MOBILE_ULTRASOUND_DEMO_RECORDS
      .filter((card) => !hiddenUltrasoundCardIds.has(card.id))
      .toSorted((a, b) => b.pregnancyWeek - a.pregnancyWeek),
  ]
  const ultrasoundPreviewUrl =
    currentUltrasoundResult?.imagePreviewUrl
    ?? latestUltrasoundCard?.imageUrl
    ?? ULTRASOUND_MAIN_DEMO_HINT.imageUrl
  const ultrasoundWeek =
    currentUltrasoundResult?.pregnancyWeek
    ?? latestUltrasoundCard?.pregnancyWeek
    ?? state.pregnancyWeek
  const ultrasoundFruit = getPregnancyFruit(ultrasoundWeek)
  const ultrasoundCardSummary = oneLineSummary(
    currentUltrasoundResult?.memoryCard.growthText
      ?? latestUltrasoundCard?.growthText
      ?? '',
    `${ultrasoundWeek}주차 아기는 ${ultrasoundFruit.fruitName}만큼 자란 시기예요.`,
  )
  const ultrasoundDiarySnippet =
    currentUltrasoundResult?.memoryCard.diarySnippet
    ?? latestUltrasoundCard?.diarySnippet
    ?? '오늘은 초음파 사진을 보며 아기를 더 가까이 느낀 하루였다. 작은 사진 한 장이지만 오래 기억하고 싶은 순간이 생겼다.'
  // 임신 시작일(LMP). 저장값이 없으면 현재 주차에서 역산해 사용합니다.
  const effectivePregnancyStartDate = useMemo(() => {
    if (isDateKey(preparationCycleProfile.pregnancyStartDate)) {
      return preparationCycleProfile.pregnancyStartDate
    }
    return getPregnancyStartDateFromWeek(state.pregnancyWeek || 18)
  }, [preparationCycleProfile.pregnancyStartDate, state.pregnancyWeek])

  const dailyInsight = useMemo(() => {
    const insightDate = parseDateKeyToDate(todayKeyForInsight) ?? new Date()
    return state.pregnancyStatus === 'pregnant'
      ? createPregnancyDateInsight(effectivePregnancyStartDate, insightDate)
      : getDailyConditionInsight('preparing', state.pregnancyWeek, insightDate, preparationCycleProfile)
  }, [
    effectivePregnancyStartDate,
    preparationCycleProfile,
    state.pregnancyStatus,
    state.pregnancyWeek,
    todayKeyForInsight,
  ])
  const simulationUrl = '/simulation-3d/index.html'
  const hubUrl = `/hub?${new URLSearchParams({
    status: state.pregnancyStatus,
    role: state.role,
    weeks: String(state.pregnancyWeek),
    prepMode: state.preparationMode,
  }).toString()}`
  async function deleteGeneratedTodayDiary(marker: GeneratedTodayDiaryMarker) {
    if (dateKey(marker.createdAt) !== dateKey(new Date())) return

    setState((prev) => {
      const next = {
        ...prev,
        diaryEntries: normalizeDiaryEntries(prev.diaryEntries).filter(
          (entry) => entry.id !== marker.id,
        ),
        lastUpdated: new Date().toISOString(),
      }
      latestAppliedUpdateRef.current = getStateUpdatedAt(next)
      persistLocalState(next)
      return next
    })

    if (!marker.storage || marker.id.startsWith('demo-')) return

    try {
      await fetch('/api/diary/generate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: marker.id,
          storage: marker.storage,
        }),
      })
    } catch {
      // 다음 열기 때 기존 오늘 저장분은 계속 기본 표시에서 제외돼요.
    }
  }

  function closeDiaryCalendar() {
    const marker = generatedTodayDiary
    setShowDiaryCalendar(false)
    setSessionDiaryEntry(null)
    setGeneratedTodayDiary(null)
    if (marker) void deleteGeneratedTodayDiary(marker)
  }

  async function generateDiary() {
    if (diaryGenerationRef.current) return
    diaryGenerationRef.current = true
    setIsGenerating(true)
    setMessage('')
    try {
      // 오늘까지의 최근 케어·대화 기록(로컬 저장분)을 함께 넘겨
      // 서버 DB가 없어도 최근 활동을 반영해 일기를 만들거나 업데이트해요.
      const sevenDaysAgo = Date.now() - 7 * DAY_MS
      const hubCareLogs = readCareLogsFromLocalStorage()
        .filter((log) => {
          const signals = log.signals ?? []
          const isPreparing = signals.includes('상태:preparing') || signals.includes('임신 준비')
          const matchesStatus = state.pregnancyStatus === 'preparing' ? isPreparing : !isPreparing
          const matchesRole = state.role === 'husband'
            ? signals.includes('역할:husband')
            : !signals.includes('역할:husband')
          return matchesStatus && matchesRole && !!log.userInput && Date.parse(log.createdAt) >= sevenDaysAgo
        })
        .slice(0, 5)
        .map((log) => ({
          mode: log.mode,
          mode_label: log.modeLabel,
          input_text: log.userInput.slice(0, 120),
          signals: log.signals ?? [],
          reply: log.resultText?.slice(0, 120),
          wife_card: log.wifeCard?.slice(0, 120),
          husband_card: log.husbandCard?.slice(0, 120),
          device_results: log.deviceResults?.slice(0, 2),
          created_at: log.createdAt,
        }))

      const response = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregnancyWeek: state.pregnancyStatus === 'pregnant' ? state.pregnancyWeek : null,
          pregnancyStatus: state.pregnancyStatus,
          role: state.role,
          babyName: preparationCycleProfile.babyName || undefined,
          hubCareLogs,
        }),
      })
      const result = (await response.json()) as {
        success?: boolean
        entry?: DiaryEntry
        error?: string
        storage?: GeneratedDiaryStorage
      }
      if (!response.ok || !result.entry) throw new Error(result.error ?? '다이어리를 만들지 못했어요.')

      // 세션 내에서만 유지되는 임시 다이어리 (캘린더 닫으면 삭제됨)
      const sessionEntry: DiaryEntry = {
        ...result.entry,
        created_at: new Date().toISOString(),
      }
      if (generatedTodayDiary) void deleteGeneratedTodayDiary(generatedTodayDiary)
      setSessionDiaryEntry(sessionEntry)
      setGeneratedTodayDiary({
        id: sessionEntry.id,
        storage: result.storage ?? null,
        createdAt: sessionEntry.created_at,
      })
      setMessage(state.role === 'husband'
        ? '오늘의 배우자 케어 기록을 다이어리에 담았어요.'
        : '오늘의 마음을 다이어리에 담았어요.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '다이어리를 만들지 못했어요.')
    } finally {
      diaryGenerationRef.current = false
      setIsGenerating(false)
    }
  }

  function handleUltrasoundSaved(result: UltrasoundAnalyzeResponse) {
    setCurrentUltrasoundResult(result)

    const growthRun = buildUltrasoundGrowthModeRun({
      id: result.recordId ? `ultrasound-${result.recordId}` : undefined,
      pregnancyWeek: result.pregnancyWeek ?? state.pregnancyWeek,
      babyName: '아기',
    })
    saveUltrasoundGrowthCareLocally(growthRun)

    const storedCard = buildStoredCardFromAnalyzeResponse(result, {
      babyName: '아기',
      pregnancyWeek: state.pregnancyWeek,
    })
    saveUltrasoundCardToLocalStorage(storedCard)
    setSavedUltrasoundCards((current) => [
      storedCard,
      ...current.filter((card) => card.id !== storedCard.id),
    ])
    setMessage('초음파 사진을 분석하고 성장 기록에 저장했어요.')
  }

  function deleteUltrasoundCard(card: UltrasoundStoredCard, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (isUserUploadedUltrasoundCard(card)) {
      removeUltrasoundCardFromLocalStorage(card.id)
      setSavedUltrasoundCards((current) => current.filter((item) => item.id !== card.id))
    } else {
      setHiddenUltrasoundCardIds((current) => {
        const next = new Set(current)
        next.add(card.id)
        return next
      })
    }
    if (selectedUltrasoundCard?.id === card.id) {
      setSelectedUltrasoundCard(null)
    }
  }

  async function applyManualCare(option: {
    id?: string
    label: string
    command: string
  }) {
    const inputText = option.command.trim()
    if (!inputText) return
    if (option.id) setSelectedManualQuickCareId(option.id)

    const commandId = `mobile-manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const manualQuickState = option.id ? MANUAL_QUICK_CARE_STATE[option.id] : null
    const preparationModeUpdate: { preparationMode?: PreparationMode } =
      state.pregnancyStatus === 'preparing' && option.id && isPreparationMode(option.id)
        ? { preparationMode: option.id }
        : {}
    setMessage(`${option.label} 모드를 실행하고 있어요.`)

    try {
      void updateState({
        ...(manualQuickState ?? {}),
        ...preparationModeUpdate,
        demoMode: buildMobileDemoModeState(
          manualQuickState?.currentRoutine ?? preparationModeUpdate.preparationMode ?? null,
          manualQuickState?.simulationRoutine ?? null,
          option.label,
          'mobile_manual_chip',
        ),
        latestHubInput: inputText,
        latestCareModeLabel: option.label,
        careState: 'processing',
      })
      if (manualQuickState) {
        sendModeToSimulation(manualQuickState.currentRoutine, option.label, {
          inputText,
        })
      }

      const executeResponse = await fetch('/api/simulation-3d/voice-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          pregnancyWeek: state.pregnancyStatus === 'pregnant' ? state.pregnancyWeek : undefined,
          pregnancyStatus: state.pregnancyStatus,
          preparationMode: state.preparationMode,
          role: state.role,
        }),
      })
      const executeData = (await executeResponse.json()) as Simulation3DVoiceIntentResult
      const modeLabel =
        executeData.intentSentence ??
        executeData.executionText ??
        executeData.ttsText ??
        option.label

      if (!executeResponse.ok || executeData.success === false) {
        throw new Error(executeData.reply ?? '실행할 케어를 찾지 못했어요.')
      }

      const mode = resolveMobileHubModeFromVoiceResult(executeData)
      const routineId = executeData.routineId ?? null
      const lightAction = getLightPowerAction(executeData)
      const lightPowerPatch =
        lightAction
          ? { lightPower: lightAction }
          : routineId || executeData.preparationMode || executeData.queryMode || executeData.defaultMode
            ? { lightPower: 'on' as const }
            : {}
      const deviceCommand = resolveMobileHubThinQCommand(executeData)
      const deviceHandled = Boolean(deviceCommand)
      if (deviceCommand) {
        setManualAirPowerSync({
          power: deviceCommand === 'AIR_OFF' ? 'OFF' : 'ON',
          nonce: Date.now(),
        })
      }
      const deviceControlPromise = deviceCommand
        ? controlAirPurifierForMobileHubVoice(deviceCommand)
        : Promise.resolve(false)

      sendVoiceCommandToSimulation(inputText, executeData, {
        source: 'mobile_manual_chip',
        deviceHandled,
        commandId,
      })
      triggerHueSceneForMobileMode(executeData, {
        source: 'mobile_manual_chip',
        commandId,
        restoreMode: lightAction === 'on' ? resolveCurrentHueModeFromSharedState(state) : null,
      })
      void playCareTtsInApp(
        executeData.ttsText ?? executeData.executionText ?? executeData.reply ?? modeLabel,
        commandId,
      )

      void updateState({
        ...preparationModeUpdate,
        currentRoutine: lightAction ? state.currentRoutine : mode,
        simulationRoutine: lightAction ? state.simulationRoutine : routineId,
        demoMode: buildMobileDemoModeState(
          executeData.defaultMode
            ? null
            : lightAction
              ? state.currentRoutine
              : mode ?? executeData.preparationMode ?? executeData.queryMode ?? null,
          executeData.defaultMode
            ? null
            : lightAction
              ? state.simulationRoutine
              : routineId,
          modeLabel,
          'mobile_manual_chip',
        ),
        ...lightPowerPatch,
        latestHubInput: inputText,
        latestCareModeLabel: modeLabel,
        careState: lightAction
          ? state.careState
          : mode === 'AIR_OFF' || executeData.defaultMode
            ? 'idle'
            : 'completed',
        latestVoiceCommand: {
          id: commandId,
          transcript: inputText,
          result: executeData as unknown as Record<string, unknown>,
          source: 'mobile_manual_chip',
          deviceHandled,
          createdAt: new Date().toISOString(),
        },
      })

      if (deviceCommand) {
        void deviceControlPromise.then((success) => {
          if (!success) return
          window.setTimeout(() => {
            void refetchThinQState()
          }, 900)
        })
      } else {
        window.setTimeout(() => {
          void refetchThinQState()
        }, 300)
      }

      setMessage(`${option.label} 모드를 적용했어요.`)
    } catch (error) {
      console.warn('[mobile manual] care execution failed:', error)
      await updateState({
        demoMode: buildMobileDemoModeState(null, null, option.label, 'mobile_manual_chip'),
        latestHubInput: inputText,
        latestCareModeLabel: option.label,
        careState: 'idle',
      })
      setMessage(error instanceof Error ? error.message : '수동 케어 실행에 실패했어요.')
    }
  }

  async function applyManualLightPower(nextPower: LightPowerState) {
    const commandId = `mobile-manual-light-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const transcript = nextPower === 'on' ? '전구 켜줘' : '전구 꺼줘'
    const label = nextPower === 'on' ? '거실 조명 ON' : '거실 조명 OFF'
    const result: Simulation3DVoiceIntentResult = {
      success: true,
      type: 'device_control',
      intent: nextPower === 'on' ? 'light_on' : 'light_off',
      transcript,
      intentSentence: nextPower === 'on' ? '거실 전구 켜기 의도를 감지했습니다.' : '거실 전구 끄기 의도를 감지했습니다.',
      executionText: nextPower === 'on' ? '네, 거실 전구를 켤게요.' : '네, 거실 전구를 끌게요.',
      ttsText: nextPower === 'on' ? '네, 거실 전구를 켤게요.' : '네, 거실 전구를 끌게요.',
      routineId: null,
      preparationMode: null,
      queryMode: null,
      lightAction: nextPower,
      lightPowerOn: nextPower === 'on',
      lightPowerOff: nextPower === 'off',
      source: 'manual_light_toggle',
    }

    setSelectedManualQuickCareId(null)
    setMessage(`${label} 상태로 전환하고 있어요.`)

    sendVoiceCommandToSimulation(transcript, result, {
      source: 'mobile_manual_light_toggle',
      deviceHandled: false,
      commandId,
    })
    triggerHueSceneForMobileMode(result, {
      source: 'mobile_manual_light_toggle',
      commandId,
      restoreMode: nextPower === 'on' ? resolveCurrentHueModeFromSharedState(state) : null,
    })
    void playCareTtsInApp(result.ttsText ?? result.executionText, commandId)

    void updateState({
      lightPower: nextPower,
      demoMode: buildMobileDemoModeState(
        state.currentRoutine,
        state.simulationRoutine,
        label,
        'mobile_manual_light_toggle',
      ),
      latestHubInput: transcript,
      latestCareModeLabel: label,
      latestVoiceCommand: {
        id: commandId,
        transcript,
        result: result as unknown as Record<string, unknown>,
        source: 'mobile_manual_light_toggle',
        deviceHandled: false,
        createdAt: new Date().toISOString(),
      },
    })

    setMessage(`${label} 상태로 전환했어요.`)
  }

  if (!profileReady || showProfileEditor) {
    return (
      <ProfileSetupScreen
        state={profileDraftState}
        microphonePermission={microphonePermission}
        onRequestMicrophone={() => void requestMicrophoneAccess()}
        onStatusChange={changePregnancyStatus}
        onRoleChange={changeRole}
        onPregnancyStartDateChange={changeProfilePregnancyStartDate}
        preparationCycleProfile={profileDraft}
        onPreparationCycleChange={updateProfileDraft}
        onFieldFocus={markProfileFieldActive}
        onFieldBlur={clearProfileFieldActive}
        onDone={completeProfileSetup}
        mode={showProfileEditor ? 'edit' : 'register'}
      />
    )
  }

  return (
    <main className="relative min-h-dvh max-w-[100vw] overflow-x-clip px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-[#202124]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 100% 0%, rgba(252,235,242,0.55) 0%, rgba(255,255,255,0) 50%), radial-gradient(110% 70% at 0% 100%, rgba(252,237,243,0.4) 0%, rgba(255,255,255,0) 46%), #ffffff',
        }}
      />
      <div className="mx-auto w-full max-w-[min(430px,calc(100vw-2.5rem))]">
        {activeTab === 'home' && (
          <HomeTab
            state={state}
            dailyInsight={dailyInsight}
            pregnancyStartDate={effectivePregnancyStartDate}
            preparationCycleProfile={preparationCycleProfile}
            onChangePregnancyStartDate={changePregnancyStartDate}
            onPreparationCycleChange={updatePreparationCycleProfile}
          />
        )}
        {activeTab === 'records' && (
          <RecordsTab
            showPhotoAlbum={state.pregnancyStatus === 'pregnant'}
            onOpenDiary={() => setShowDiaryCalendar(true)}
            onOpenGallery={() => setShowUltrasoundGallery(true)}
          />
        )}
        {activeTab === 'hub' && (
          <HubTab
            hubUrl={hubUrl}
            microphonePermission={microphonePermission}
            onRequestMicrophone={() => void requestMicrophoneAccess()}
          />
        )}
        {activeTab === 'manual' && (
          <ManualControlTab
            state={state}
            thinqState={thinqState}
            airPowerSync={manualAirPowerSync}
            selectedQuickCareId={selectedManualQuickCareId}
            onApplyManualCare={applyManualCare}
            onToggleLightPower={(nextPower) => void applyManualLightPower(nextPower)}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            state={state}
            microphonePermission={microphonePermission}
            simulationUrl={simulationUrl}
            onEditProfile={openProfileEditor}
            onRequestMicrophone={() => void requestMicrophoneAccess()}
            onRefresh={() => void refreshState()}
            pregnancyStartDate={effectivePregnancyStartDate}
          />
        )}
      </div>

      <MobileBottomNavigation
        activeTab={activeTab}
        onChange={changeTab}
        onHubHoldStart={() => void startMobileHubRecording()}
        onHubHoldEnd={stopMobileHubRecording}
      />

      <DiaryCalendarModal
        open={showDiaryCalendar}
        onClose={closeDiaryCalendar}
        entries={diaryCalendarEntries}
        status={state.pregnancyStatus}
        onGenerate={() => void generateDiary()}
        isGenerating={isGenerating}
        hasTodayEntry={hasTodayDiaryEntry}
      />

      {hubVoiceState !== 'idle' && (
        <MobileHubVoiceOverlay state={hubVoiceState} text={hubVoiceText} />
      )}
      {showUltrasoundDetail && (
        <div
          className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
          onClick={() => setShowUltrasoundDetail(false)}
        >
          <div
            className="no-scrollbar max-h-[84vh] w-full max-w-[430px] overflow-y-auto rounded-[30px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#a14f62]">임신 {ultrasoundWeek}주차</p>
                <h2 className="mt-1 text-xl font-black text-[#211b20]">아기 성장 기록</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUltrasoundDetail(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-[#a14f62] shadow-[0_8px_18px_rgba(165,0,52,0.1)]"
                aria-label="아기 성장 기록 닫기"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-[24px] bg-white shadow-[0_10px_24px_rgba(165,0,52,0.08)] ring-1 ring-[#f2d7e1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ultrasoundPreviewUrl} alt="최근 아기 초음파" className="max-h-72 w-full object-contain" />
            </div>
            <div className="mt-4 space-y-3 rounded-[24px] bg-white p-4 text-sm leading-6 text-gray-700 shadow-[0_10px_24px_rgba(165,0,52,0.06)] ring-1 ring-[#f2d7e1]">
              <p><span className="font-semibold">성장 기록</span><br />{ultrasoundCardSummary}</p>
              <p><span className="font-semibold">AI 다이어리</span><br />{ultrasoundDiarySnippet}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUltrasoundDetail(false)
                  setShowUltrasoundUploadModal(true)
                }}
                className="min-h-11 rounded-full bg-[#a50034] px-3 text-xs font-bold text-white shadow-[0_10px_22px_rgba(165,0,52,0.18)]"
              >
                초음파 사진 업로드
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUltrasoundDetail(false)
                  setShowUltrasoundGallery(true)
                }}
                className="min-h-11 rounded-full bg-white px-3 text-xs font-bold text-[#a14f62] ring-1 ring-[#f0ccd9]"
              >
                성장 기록 보기
              </button>
            </div>
          </div>
        </div>
      )}
      <UltrasoundUploadModal
        open={showUltrasoundUploadModal}
        onClose={() => setShowUltrasoundUploadModal(false)}
        pregnancyWeek={state.pregnancyStatus === 'pregnant' ? state.pregnancyWeek : null}
        babyName={getSharedBabyName(state)}
        onSaved={handleUltrasoundSaved}
      />

      {showUltrasoundGallery && (
        <div
          className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
          onClick={() => {
            setShowUltrasoundGallery(false)
            setSelectedUltrasoundCard(null)
          }}
        >
          <div
            className="flex max-h-[84vh] w-full max-w-[430px] flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-black text-[#a14f62]">사진첩</p>
                <h2 className="truncate text-lg font-black text-[#211b20]">초음파 성장 갤러리</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUltrasoundGallery(false)
                  setSelectedUltrasoundCard(null)
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-50 text-xl text-gray-400 transition hover:text-[#a14f62] active:scale-[0.98]"
                aria-label="초음파 성장 갤러리 닫기"
              >
                ✕
              </button>
            </div>
            <div className="no-scrollbar overflow-y-auto p-5">
              {selectedUltrasoundCard ? (
                <StoredUltrasoundDetail
                  card={selectedUltrasoundCard}
                  onBack={() => setSelectedUltrasoundCard(null)}
                />
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowUltrasoundUploadModal(true)}
                    className="mb-4 min-h-11 w-full rounded-2xl bg-[#e8497e] px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(232,73,126,0.18)] transition active:scale-[0.98]"
                  >
                    초음파 사진 등록하기
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    {ultrasoundFeedCards.map((card) => (
                      <div
                        key={card.id}
                        className="group relative aspect-square overflow-hidden rounded-[18px] bg-white shadow-[0_8px_18px_rgba(165,0,52,0.08)] ring-1 ring-[#f2d7e1]"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedUltrasoundCard(card)}
                          className="h-full w-full"
                          aria-label={`${card.pregnancyWeek}주차 ${card.title} 상세 보기`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={card.imageUrl}
                            alt=""
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => deleteUltrasoundCard(card, event)}
                          className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-[16px] font-black leading-none text-[#e8497e] shadow-sm ring-1 ring-[#f2d7e1] transition active:scale-[0.94]"
                          aria-label={`${card.pregnancyWeek}주차 사진 삭제`}
                        >
                          -
                        </button>
                        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-[#a14f62] shadow-sm">
                          {card.pregnancyWeek}주
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function MobileTabHeader({ title, subtitle, brandOnly = false }: {
  title?: string
  subtitle?: string
  brandOnly?: boolean
}) {
  return (
    <header className="mb-5">
      <div className="flex justify-center py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/mother-together-logo.png"
          alt="LG Mother Together AI"
          className="h-14 w-auto object-contain"
        />
      </div>
      {!brandOnly && title && <h1 className="mt-1 text-3xl font-bold">{title}</h1>}
      {!brandOnly && subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
    </header>
  )
}

function ProfileSetupScreen({
  state,
  microphonePermission,
  onRequestMicrophone,
  onStatusChange,
  onRoleChange,
  onPregnancyStartDateChange,
  preparationCycleProfile,
  onPreparationCycleChange,
  onFieldFocus,
  onFieldBlur,
  onDone,
  mode,
}: {
  state: SharedDemoState
  microphonePermission: MicrophonePermissionStatus
  onRequestMicrophone: () => void
  onStatusChange: (status: DemoPregnancyStatus) => void
  onRoleChange: (role: DemoRole) => void
  onPregnancyStartDateChange: (dateKey: string) => void
  preparationCycleProfile: PreparationCycleProfile
  onPreparationCycleChange: (profile: PreparationCycleProfile, dirtyField?: ProfileDraftField) => void
  onFieldFocus: (field: ProfileDraftField) => void
  onFieldBlur: (field: ProfileDraftField) => void
  onDone: () => void
  mode: 'register' | 'edit'
}) {
  const profilePregnancyStartDate =
    preparationCycleProfile.pregnancyStartDate || getPregnancyStartDateFromWeek(state.pregnancyWeek)
  const isEdit = mode === 'edit'
  const lastTouchActionAtRef = useRef(0)
  const inputClass =
    'mt-2 min-h-12 w-full rounded-2xl border border-[#efc7d3] bg-white px-4 text-[15px] font-black text-[#321c24] shadow-[0_8px_22px_rgba(154,75,94,0.06)] outline-none placeholder:font-medium placeholder:text-[#c8b3bb] focus:border-[#c65b7b]'

  const runTouchAction = (event: ReactPointerEvent<HTMLButtonElement>, action: () => void) => {
    event.stopPropagation()
    if (event.pointerType === 'mouse') return

    event.preventDefault()
    lastTouchActionAtRef.current = event.timeStamp
    action()
  }

  const runClickAction = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
    if (lastTouchActionAtRef.current > 0 && event.timeStamp - lastTouchActionAtRef.current < 700) return
    action()
  }

  return (
    <main className="relative min-h-dvh px-4 py-[max(1.25rem,env(safe-area-inset-top))] text-[#202124]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 100% 0%, rgba(252,235,242,0.55) 0%, rgba(255,255,255,0) 50%), radial-gradient(110% 70% at 0% 100%, rgba(252,237,243,0.4) 0%, rgba(255,255,255,0) 46%), #ffffff',
        }}
      />
      <div className="mx-auto w-full max-w-[min(430px,calc(100vw-2rem))]">
        <MobileTabHeader
          title={isEdit ? '정보 수정' : '정보 등록'}
          subtitle={isEdit ? '내 정보를 업데이트해요' : '내 상태와 역할을 등록해요'}
        />
        <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_44px_rgba(165,0,52,0.11)] backdrop-blur">
          <div className="grid grid-cols-2 gap-2">
            <CompactToggle
              label="상태"
              options={[
                ['preparing', '임신 준비중'],
                ['pregnant', '임신중'],
              ]}
              value={state.pregnancyStatus}
              onChange={(value) => onStatusChange(value as DemoPregnancyStatus)}
            />
            <CompactToggle
              label="역할"
              options={[
                ['wife', '아내'],
                ['husband', '남편'],
              ]}
              value={state.role}
              onChange={(value) => onRoleChange(value as DemoRole)}
            />
          </div>

          {state.pregnancyStatus === 'pregnant' && (
            <>
              <label htmlFor="profile-pregnancy-start" className="mt-5 block">
                <span className="text-xs font-semibold text-[#8b4253]">임신 시작일</span>
                <CalendarDateInput
                  id="profile-pregnancy-start"
                  value={profilePregnancyStartDate}
                  onChange={(value) => onPregnancyStartDateChange(value || getKoreaTodayKey())}
                />
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  입력한 시작일 기준으로 오늘 임신 일수와 주차를 계산해요.
                </p>
              </label>

              <label htmlFor="profile-baby-name" className="mt-5 block">
                <span className="text-xs font-semibold text-[#8b4253]">태명</span>
                <input
                  id="profile-baby-name"
                  type="text"
                  maxLength={20}
                  value={preparationCycleProfile.babyName}
                  onFocus={() => onFieldFocus('babyName')}
                  onBlur={() => onFieldBlur('babyName')}
                  onChange={(event) =>
                    onPreparationCycleChange({ ...preparationCycleProfile, babyName: event.target.value }, 'babyName')}
                  placeholder="아기 태명"
                  className={inputClass}
                />
              </label>
            </>
          )}

          {state.pregnancyStatus === 'preparing' && (
            <div className="mt-5 grid gap-3">
              <label htmlFor="profile-last-period" className="block">
                <span className="text-xs font-semibold text-[#8b4253]">최근 생리 시작일</span>
                <CalendarDateInput
                  id="profile-last-period"
                  value={preparationCycleProfile.lastPeriodStartDate}
                  onChange={(value) =>
                    onPreparationCycleChange({
                      ...preparationCycleProfile,
                      lastPeriodStartDate: value || getKoreaTodayKey(),
                    }, 'lastPeriodStartDate')}
                />
              </label>
              <label htmlFor="profile-cycle-length" className="block">
                <span className="text-xs font-semibold text-[#8b4253]">평균 생리주기</span>
                <div className="mt-2 flex min-h-12 items-center rounded-2xl border border-[#efc7d3] bg-white px-4 shadow-[0_8px_22px_rgba(154,75,94,0.06)] focus-within:border-[#c65b7b]">
                  <input
                    id="profile-cycle-length"
                    type="number"
                    inputMode="numeric"
                    min={21}
                    max={40}
                    value={preparationCycleProfile.cycleLength}
                    onFocus={() => onFieldFocus('cycleLength')}
                    onBlur={() => onFieldBlur('cycleLength')}
                    onChange={(event) =>
                      onPreparationCycleChange({
                        ...preparationCycleProfile,
                        cycleLength: Number(event.target.value),
                      }, 'cycleLength')}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-black text-[#321c24] outline-none"
                  />
                  <span className="rounded-full bg-[#f2dce4] px-3 py-1 text-xs font-black text-[#9a4b5e]">일</span>
                </div>
              </label>
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-[#fff2f6] p-4 ring-1 ring-[#f4d7e1]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">마이크 권한</p>
                <p className="mt-1 text-xs text-gray-500">
                  {microphonePermission === 'granted' ? 'HUB 음성 연결 준비 완료' : '하단 HUB 버튼을 길게 눌러 음성 케어를 연결할 수 있어요'}
                </p>
              </div>
              <button
                type="button"
                onClick={onRequestMicrophone}
                className="min-h-10 rounded-full bg-[#a50034] px-4 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(165,0,52,0.18)]"
              >
                권한 확인
              </button>
            </div>
          </div>

          <button
            type="button"
            onPointerUp={(event) => runTouchAction(event, onDone)}
            onClick={(event) => runClickAction(event, onDone)}
            className="mt-6 min-h-12 w-full rounded-full bg-[#a50034] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(165,0,52,0.24)] transition active:scale-[0.99] [touch-action:manipulation]"
          >
            {isEdit ? '저장' : '등록하기'}
          </button>
        </section>
      </div>
    </main>
  )
}

const CALENDAR_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

function buildCalendarCells(year: number, month: number) {
  const startOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ key: string; day: number } | null> = []
  for (let i = 0; i < startOffset; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ key, day })
  }
  return cells
}

// 브라우저 기본 날짜 선택창 대신, 앱 톤에 맞춘 캘린더로 날짜를 고릅니다.
// 열릴 때만 마운트되므로 선택된 날짜가 있는 달이 자연스럽게 먼저 보여요.
function AppCalendarSheet({
  value,
  onSelect,
  onClose,
  title = '날짜 선택',
}: {
  value: string
  onSelect: (dateKey: string) => void
  onClose: () => void
  title?: string
}) {
  const fallback = parseDateKeyToDate(value) ?? parseDateKeyToDate(getKoreaTodayKey()) ?? new Date()
  const [viewYear, setViewYear] = useState(fallback.getFullYear())
  const [viewMonth, setViewMonth] = useState(fallback.getMonth())
  const lastTouchActionAtRef = useRef(0)

  const todayKey = getKoreaTodayKey()
  const cells = buildCalendarCells(viewYear, viewMonth)

  const runTouchAction = (event: ReactPointerEvent<HTMLButtonElement>, action: () => void) => {
    event.stopPropagation()
    if (event.pointerType === 'mouse') return

    event.preventDefault()
    lastTouchActionAtRef.current = event.timeStamp
    action()
  }

  const runClickAction = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
    if (lastTouchActionAtRef.current > 0 && event.timeStamp - lastTouchActionAtRef.current < 700) return
    action()
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const choose = (dateKey: string) => {
    onSelect(dateKey)
    onClose()
  }

  const sheet = (
    <div
      className="fixed inset-0 z-[10070] flex items-center justify-center px-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-sm [touch-action:manipulation]"
        aria-label="날짜 선택 닫기"
        onPointerUp={(event) => runTouchAction(event, onClose)}
        onClick={(event) => runClickAction(event, onClose)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-[330px] overflow-hidden rounded-[26px] bg-white p-5 shadow-2xl ring-1 ring-[#f3dce5]"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-[#a14f62]">{title}</p>
          <button
            type="button"
            onPointerUp={(event) => runTouchAction(event, onClose)}
            onClick={(event) => runClickAction(event, onClose)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-gray-400 transition hover:bg-[#fff4f7] hover:text-[#a14f62] active:scale-[0.98] [touch-action:manipulation]"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#fff7fa] px-2 py-1 ring-1 ring-[#f3dce5]">
          <button
            type="button"
            onPointerUp={(event) => runTouchAction(event, () => shiftMonth(-1))}
            onClick={(event) => runClickAction(event, () => shiftMonth(-1))}
            className="flex h-11 min-w-11 items-center justify-center rounded-full text-[#a14f62] hover:bg-white active:scale-[0.98] [touch-action:manipulation]"
            aria-label="이전 달"
          >
            ‹
          </button>
          <p className="text-sm font-bold text-[#321c24]">{viewYear}년 {viewMonth + 1}월</p>
          <button
            type="button"
            onPointerUp={(event) => runTouchAction(event, () => shiftMonth(1))}
            onClick={(event) => runClickAction(event, () => shiftMonth(1))}
            className="flex h-11 min-w-11 items-center justify-center rounded-full text-[#a14f62] hover:bg-white active:scale-[0.98] [touch-action:manipulation]"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400">
          {CALENDAR_WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((cell, index) => {
            if (!cell) return <div key={`empty-${index}`} className="aspect-square" />
            const isSelected = cell.key === value
            const isToday = cell.key === todayKey
            return (
              <button
                key={cell.key}
                type="button"
                onPointerUp={(event) => runTouchAction(event, () => choose(cell.key))}
                onClick={(event) => runClickAction(event, () => choose(cell.key))}
                className={`flex aspect-square min-h-11 items-center justify-center rounded-xl text-xs transition [touch-action:manipulation] ${
                  isSelected
                    ? 'bg-[#a50034] font-bold text-white'
                    : isToday
                      ? 'bg-[#fff4f7] font-bold text-[#a14f62] ring-1 ring-[#f0c6d4]'
                      : 'text-[#43404a] hover:bg-[#fff4f7]'
                }`}
              >
                {cell.day}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onPointerUp={(event) => runTouchAction(event, () => choose(todayKey))}
          onClick={(event) => runClickAction(event, () => choose(todayKey))}
          className="mt-4 min-h-11 w-full rounded-full bg-[#fff0f5] px-4 text-sm font-bold text-[#a50034] ring-1 ring-[#f4d7e1] transition active:scale-[0.99] [touch-action:manipulation]"
        >
          오늘로 설정
        </button>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null

  return createPortal(sheet, document.body)
}

function CalendarDateInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const lastTouchActionAtRef = useRef(0)

  const openSheet = () => setOpen(true)

  const runTouchAction = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (event.pointerType === 'mouse') return

    event.preventDefault()
    lastTouchActionAtRef.current = event.timeStamp
    openSheet()
  }

  const runClickAction = (event: MouseEvent<HTMLButtonElement>) => {
    if (lastTouchActionAtRef.current > 0 && event.timeStamp - lastTouchActionAtRef.current < 700) return
    openSheet()
  }

  return (
    <span className="relative mt-2 flex">
      <button
        type="button"
        id={id}
        onPointerUp={runTouchAction}
        onClick={runClickAction}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#efc7d3] bg-white px-4 text-left shadow-[0_8px_22px_rgba(154,75,94,0.06)] transition active:scale-[0.99] [touch-action:manipulation]"
        aria-label="캘린더로 날짜 선택"
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-black text-[#321c24]">{formatLongDate(value)}</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2dce4] text-[#9a4b5e]">
          <CalendarIcon />
        </span>
      </button>
      {open && (
        <AppCalendarSheet
          value={value}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  )
}

function HomePreparationDateButton({
  value,
  onDateChange,
  label = '최근 생리',
  ariaLabel = '최근 생리 시작일 캘린더로 변경',
}: {
  value: string
  onDateChange: (value: string) => void
  label?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const lastTouchActionAtRef = useRef(0)

  const openSheet = () => setOpen(true)

  const runTouchAction = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (event.pointerType === 'mouse') return

    event.preventDefault()
    lastTouchActionAtRef.current = event.timeStamp
    openSheet()
  }

  const runClickAction = (event: MouseEvent<HTMLButtonElement>) => {
    if (lastTouchActionAtRef.current > 0 && event.timeStamp - lastTouchActionAtRef.current < 700) return
    openSheet()
  }

  return (
    <span className="relative flex min-w-[118px]">
      <button
        type="button"
        onPointerUp={runTouchAction}
        onClick={runClickAction}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 text-xs font-black text-[#8b2f4d] shadow-[0_8px_18px_rgba(112,24,55,0.12)] backdrop-blur transition active:scale-[0.98] [touch-action:manipulation]"
        aria-label={ariaLabel}
      >
        <CalendarIcon />
        <span className="grid text-left leading-4">
          <span className="text-[10px] text-[#a85f78]">{label}</span>
          <span>{formatShortDate(value)}</span>
        </span>
      </button>
      {open && (
        <AppCalendarSheet
          value={value}
          onSelect={onDateChange}
          onClose={() => setOpen(false)}
          title={`${label} 선택`}
        />
      )}
    </span>
  )
}

function formatShortDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return '날짜'
  return `${Number(match[2])}.${Number(match[3])}`
}

function formatLongDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return '날짜 선택'
  return `${match[1]}.${Number(match[2])}.${Number(match[3])}`
}

function parseDateKeyToDate(value: string) {
  if (!isDateKey(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getDaysBetweenDateKeys(startKey: string, endKey = getKoreaTodayKey()) {
  const startDate = parseDateKeyToDate(startKey)
  const endDate = parseDateKeyToDate(endKey)
  if (!startDate || !endDate) return 0
  return Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS)
}

function getPregnancyWeekFromStartDate(startDate: string) {
  const elapsedDays = getDaysBetweenDateKeys(startDate)
  return Math.min(42, Math.max(1, Math.ceil((elapsedDays + 1) / 7)))
}

function getPregnancyStartDateFromWeek(week: number, date = new Date()) {
  const normalizedWeek = Math.min(42, Math.max(1, Math.round(week) || 18))
  const elapsedDays = (normalizedWeek - 1) * 7 + 3
  const today = parseDateKeyToDate(getKoreaTodayKey(date)) ?? date
  return getKoreaTodayKey(new Date(today.getTime() - elapsedDays * DAY_MS))
}

function getAdaptiveCheer(state: SharedDemoState, insight: DailyInsight) {
  const isWife = state.role === 'wife'
  const pick = (wife: string, husband: string) => (isWife ? wife : husband)
  const baseMessage = getHomeCareMessage({
    pregnancyStatus: state.pregnancyStatus,
    role: state.role,
    dateKey: insight.generatedFor,
    rhythmLabel: insight.rhythmLabel,
  })
  const fallback = baseMessage.cheer
  const commandLabel = state.latestCareModeLabel ?? state.currentRoutine ?? ''
  const commandText = `${commandLabel} ${state.latestHubInput ?? ''} ${state.currentRoutine ?? ''}`.toLowerCase()

  if (!state.latestHubInput && !state.latestCareModeLabel && state.careState === 'idle') return fallback

  if (/입덧|nausea|냄새/.test(commandText)) {
    return pick(
      '속이 예민한 날엔 참는 것보다 덜어내는 게 먼저예요. 공기와 냄새는 집이 맡고, 엄마는 잠깐 쉬어가요.',
      '냄새와 공기는 집이 맡도록 해뒀어요. 음식 냄새만 살짝 신경 써주면 아내가 한결 편할 거예요.',
    )
  }

  if (/수면|sleep|잠|휴식|rest/.test(commandText)) {
    return pick(
      '회복 모드로 낮춰두었어요. 오늘은 빨리 해내는 것보다 편하게 쉬는 시간이 더 중요해요.',
      '쉬기 좋은 환경으로 낮춰뒀어요. 오늘은 아내가 먼저 편히 쉴 수 있으면 좋은 날이에요.',
    )
  }

  if (/가사|housework|청소|집안일/.test(commandText)) {
    return pick(
      '집안일은 조금 덜어내도 괜찮아요. 몸이 보내는 신호를 먼저 챙기는 게 오늘의 좋은 선택이에요.',
      '오늘은 집안일을 조금 덜어내도 괜찮은 날이에요. 무리한 건 미뤄두고 같이 천천히 해도 충분해요.',
    )
  }

  if (/바다|숲|휴양|travel|ocean|forest|환기|refresh/.test(commandText)) {
    return pick(
      '공간의 분위기를 살짝 바꿔두었어요. 잠깐이라도 숨이 편해지는 쪽으로 마음을 데려가요.',
      '분위기를 잠깐 바꿔뒀어요. 아내와 짧게라도 함께 숨 돌리면 좋은 날이에요.',
    )
  }

  if (/끄기|off/.test(commandText)) {
    return pick(
      '기기는 잠시 쉬게 했어요. 필요할 때 다시 켜면 되니 지금은 공간을 편하게 느껴보세요.',
      '기기는 잠시 꺼뒀어요. 오늘은 조용한 분위기에서 아내가 편히 쉬면 좋겠어요.',
    )
  }

  if (/둘의 저녁|couple/.test(commandText)) {
    return pick(
      '둘이 편하게 이야기할 수 있도록 분위기를 낮춰두었어요. 오늘은 함께 쉬는 시간도 충분한 케어예요.',
      '둘이 편하게 이야기하기 좋게 분위기를 낮춰뒀어요. 오늘은 아내의 이야기에 천천히 귀 기울여 봐요.',
    )
  }

  if (state.latestHubInput) {
    return pick(
      '방금 요청한 케어에 맞춰 집의 분위기를 조정했어요. 오늘은 몸과 마음이 덜 애쓰는 쪽으로 가도 괜찮아요.',
      '요청한 케어에 맞춰 집을 정리해뒀어요. 오늘은 아내가 덜 신경 쓰도록 곁을 지켜주면 좋은 날이에요.',
    )
  }

  return fallback
}

function TodayStatusCard({
  state,
  insight,
  pregnancyStartDate,
  preparationCycleProfile,
  onChangePregnancyStartDate,
  onPreparationCycleChange,
}: {
  state: SharedDemoState
  insight: DailyInsight
  pregnancyStartDate: string
  preparationCycleProfile: PreparationCycleProfile
  onChangePregnancyStartDate: (dateKey: string) => void
  onPreparationCycleChange: (profile: PreparationCycleProfile) => void
}) {
  const isPregnant = state.pregnancyStatus === 'pregnant'
  const dateValue = isPregnant ? pregnancyStartDate : preparationCycleProfile.lastPeriodStartDate
  const dateLabel = isPregnant ? '임신 시작일' : '최근 생리'
  const ariaLabel = isPregnant ? '임신 시작일 캘린더로 변경' : '최근 생리 시작일 캘린더로 변경'
  const cheer = getAdaptiveCheer(state, insight)
  const phaseText = isPregnant
    ? `${insight.phaseLabel} · ${insight.rhythmLabel}`
    : `${insight.phaseLabel} · ${insight.fertilityWindow ?? insight.rhythmLabel}`

  const changeDate = (value: string) => {
    const nextValue = value || getKoreaTodayKey()
    if (isPregnant) {
      onChangePregnancyStartDate(nextValue)
      return
    }
    onPreparationCycleChange({
      ...preparationCycleProfile,
      lastPeriodStartDate: nextValue,
    })
  }

  return (
    <section className="mb-4 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#ff6f9c_0%,#f23e69_55%,#d81e52_100%)] px-5 py-7 text-white shadow-[0_20px_44px_rgba(216,30,82,0.3)]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-[32px] font-black leading-[1.08] tracking-[-0.02em] text-white">{insight.dayLabel}</h2>
        <div className="shrink-0">
          <HomePreparationDateButton
            value={dateValue}
            onDateChange={changeDate}
            label={dateLabel}
            ariaLabel={ariaLabel}
          />
        </div>
      </div>
      <p className="mt-2 text-[14px] font-semibold leading-5 text-white/85">{phaseText}</p>

      <div className="mt-5 rounded-[20px] bg-white px-4 py-3.5 shadow-[0_10px_24px_rgba(140,10,52,0.16)]">
        <div className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-[#e8497e]" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <p className="text-[11px] font-extrabold tracking-wide text-[#e8497e]">오늘의 한마디</p>
        </div>
        <p className="mt-2 text-[14px] font-semibold leading-[1.55] text-[#39323c]">{cheer}</p>
      </div>
    </section>
  )
}

function HomeTab({
  state,
  dailyInsight,
  pregnancyStartDate,
  preparationCycleProfile,
  onChangePregnancyStartDate,
  onPreparationCycleChange,
}: {
  state: SharedDemoState
  dailyInsight: DailyInsight
  pregnancyStartDate: string
  preparationCycleProfile: PreparationCycleProfile
  onChangePregnancyStartDate: (dateKey: string) => void
  onPreparationCycleChange: (profile: PreparationCycleProfile) => void
}) {
  return (
    <>
      <MobileTabHeader brandOnly />
      <TodayStatusCard
        state={state}
        insight={dailyInsight}
        pregnancyStartDate={pregnancyStartDate}
        preparationCycleProfile={preparationCycleProfile}
        onChangePregnancyStartDate={onChangePregnancyStartDate}
        onPreparationCycleChange={onPreparationCycleChange}
      />
      <DailyConditionPanel insight={dailyInsight} role={state.role} />
    </>
  )
}

function MobileHubVoiceOverlay({
  state,
  text,
}: {
  state: MobileHubVoiceState
  text: string
}) {
  const label = state === 'listening'
    ? '듣고 있어요'
    : state === 'processing'
      ? '허브로 보내는 중'
      : state === 'done'
        ? '완료'
        : '다시 시도해주세요'

  return (
    <div className="pointer-events-none fixed inset-0 z-[10050] flex items-center justify-center px-8">
      <div className="absolute inset-0 bg-black/15 backdrop-blur-md" aria-hidden="true" />
      <div className="relative z-10 flex w-[280px] flex-col items-center">
        <div className="relative flex h-[200px] w-full items-center justify-center">
          {state === 'listening' && (
            <>
              <span className="absolute h-32 w-32 rounded-full bg-[#a50034]/10 thinq-wave" />
              <span className="absolute h-32 w-32 rounded-full bg-[#ff79aa]/10 thinq-wave thinq-wave-delay-1" />
              <span className="absolute h-32 w-32 rounded-full bg-[#ec24c3]/10 thinq-wave thinq-wave-delay-2" />
            </>
          )}
          <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-white/65 shadow-[0_18px_48px_rgba(165,0,52,0.18)] backdrop-blur-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hub-logo.png" alt="AI HUB" className="h-20 w-20 object-contain" />
          </div>
        </div>
        <div className="mt-10 max-w-[260px] rounded-full bg-gradient-to-r from-[#7C3AED] via-[#DB2777] to-[#F43F5E] px-5 py-2.5 text-center shadow-[0_10px_30px_rgba(219,39,119,0.28)]">
          <p className="truncate text-sm font-bold text-white">{text || label}</p>
        </div>
      </div>
    </div>
  )
}

// 리듬별 안내: 컨디션(상태) / 행동 추천(하면 좋은 것) / 주의(피할 것) — 서로 겹치지 않게 구분
type GuideText = { wife: string; husband: string }
type ConditionGuide = { condition: GuideText; action: GuideText; caution: GuideText }

const CONDITION_GUIDE: Record<string, ConditionGuide> = {
  '수면 회복': {
    condition: {
      wife: '잠이 쏟아지고 작은 일에도 금세 지치는 날이에요. 오전부터 에너지가 훅 떨어질 수 있어요.',
      husband: '아내가 평소보다 많이 졸리고 쉽게 지칠 수 있어요. 오전부터 기운이 없어 보일 수 있어요.',
    },
    action: {
      wife: '오전 일정은 짧게 잡고, 점심 전후로 20분이라도 누워서 눈을 붙여보세요. 따뜻한 물을 자주 마시면 처지는 느낌이 한결 나아져요.',
      husband: '오전 집안일은 먼저 맡아두고, 아내가 낮잠 잘 수 있게 30분 정도 시간을 비워 주세요. 따뜻한 물 한 잔 챙겨주면 좋아요.',
    },
    caution: {
      wife: '자기 전 휴대폰·TV는 수면을 더 방해하니 멀리 두세요. 카페인과 한 번에 몰아서 하는 집안일도 오늘은 피하는 게 좋아요.',
      husband: '아내가 밤늦게 화면을 오래 보지 않게 도와주세요. 늦은 외출이나 무리한 집안일은 같이 줄여주는 게 좋아요.',
    },
  },
  '냄새 민감도': {
    condition: {
      wife: '음식·세제·향수 냄새에 예민해져 헛구역질이 올라올 수 있어요. 빈속일수록 더 심해지기 쉬워요.',
      husband: '아내가 냄새에 예민해 입덧이 심해질 수 있는 날이에요. 조리·생선·향 제품 냄새에 특히 힘들어할 수 있어요.',
    },
    action: {
      wife: '요리 전후로 창문을 열어 환기하고, 담백하고 차갑게 먹을 수 있는 음식을 곁에 두세요. 크래커 같은 가벼운 간식을 미리 챙겨두면 속이 편해요.',
      husband: '요리는 환기하면서 맡아주고, 비린 메뉴 대신 담백한 걸 준비해 주세요. 입덧이 심하면 식사를 가볍게 나눠서 챙겨주세요.',
    },
    caution: {
      wife: '향수·디퓨저·강한 세제는 잠시 멀리 두세요. 환기 안 된 좁은 공간에 오래 머무는 것도 피하는 게 좋아요.',
      husband: '향수나 디퓨저는 오늘 사용을 미뤄 주세요. 환기 없이 기름진 요리를 하는 것도 피해 주세요.',
    },
  },
  '마음 안정': {
    condition: {
      wife: '호르몬 영향으로 기분이 갑자기 가라앉거나 울컥할 수 있어요. 평소엔 넘어갈 말에도 마음이 흔들릴 수 있어요.',
      husband: '아내가 감정 기복을 크게 느낄 수 있는 날이에요. 작은 말에도 서운해하거나 눈물이 날 수 있어요.',
    },
    action: {
      wife: '감정을 억누르지 말고 잠깐 산책하거나 좋아하는 음악으로 마음을 환기해 보세요. 오늘 할 일은 꼭 해야 할 한 가지만 정해도 충분해요.',
      husband: '이유를 따지기보다 “고생했어, 내가 있잖아” 하고 곁에 있어 주세요. 가벼운 산책을 함께 제안하는 것도 좋아요.',
    },
    caution: {
      wife: '중요한 결정을 몰아서 하거나 비교되는 SNS를 오래 보는 건 피하세요. 빨리 답해야 하는 대화도 잠시 미뤄도 괜찮아요.',
      husband: '잘잘못을 가리는 대화나 무거운 결정은 오늘은 미뤄 주세요. 아내를 다른 사람과 비교하는 말은 절대 금물이에요.',
    },
  },
  '활력 조절': {
    condition: {
      wife: '컨디션이 좋아 보여도 무리하면 오후에 한 번에 지칠 수 있어요. 에너지가 들쑥날쑥한 날이에요.',
      husband: '아내가 괜찮아 보여도 오후엔 갑자기 방전될 수 있어요. 컨디션이 좋다고 무리하기 쉬운 날이에요.',
    },
    action: {
      wife: '기운이 있을 때 가볍게 움직이되, 1~2시간마다 앉아서 쉬는 시간을 미리 넣어두세요. 편한 옷으로 갈아입고 짧은 스트레칭을 해주면 좋아요.',
      husband: '외출이나 일정 사이에 쉬는 틈을 미리 만들어 주세요. 무거운 짐은 대신 들어주고 앉아서 쉴 자리를 챙겨주세요.',
    },
    caution: {
      wife: '오래 서 있거나 쉼 없이 일정을 이어가는 건 피하세요. 무거운 물건을 드는 것도 오늘은 미루는 게 좋아요.',
      husband: '아내가 오래 서 있거나 무리한 일정을 이어가지 않게 해주세요. 무거운 짐을 들게 두지 마세요.',
    },
  },
  '집중력 분산': {
    condition: {
      wife: '깜빡깜빡하고 집중이 잘 안 되는 날이에요. 한 번에 여러 가지를 하려고 하면 더 지쳐요.',
      husband: '아내가 깜빡하거나 집중이 흐트러질 수 있는 날이에요. 챙길 게 많으면 더 부담스러워할 수 있어요.',
    },
    action: {
      wife: '중요한 일정과 약은 메모·알림으로 남기고, 한 번에 한 가지씩만 처리하세요. 오늘 할 일은 3개 이하로 줄여도 괜찮아요.',
      husband: '병원 일정·약 챙기기를 같이 메모로 관리해 주세요. 복잡한 장보기나 결정은 대신 정리해 주면 좋아요.',
    },
    caution: {
      wife: '멀티태스킹과 급하게 잡는 약속은 오늘은 피하세요. 중요한 서류나 결정은 한 번 더 확인하고 진행하세요.',
      husband: '급한 약속을 몰아서 잡지 말아 주세요. 복잡한 일을 한꺼번에 부탁하는 것도 피해 주세요.',
    },
  },
  '가족 케어': {
    condition: {
      wife: '도움이 필요한데 막상 말 꺼내기는 귀찮은 날이에요. 혼자 다 하려다 더 지치기 쉬워요.',
      husband: '아내가 힘들어도 먼저 말하지 않을 수 있는 날이에요. 괜찮은 척 참고 있을 수 있어요.',
    },
    action: {
      wife: '필요한 건 한 줄로라도 가족에게 솔직히 부탁해 보세요. 저녁 메뉴나 쉬는 시간을 미리 정해두면 부담이 줄어요.',
      husband: '“내가 할게” 하고 먼저 움직여 주세요. 저녁과 집안일을 미리 정해두고 아내가 쉴 시간을 만들어 주세요.',
    },
    caution: {
      wife: '괜찮은 척 참거나 상대가 알아서 해주길 기다리지 마세요. 서운함을 쌓아두면 더 힘들어져요.',
      husband: '“뭐 도와줄까?”만 묻고 기다리지 마세요. 아내가 부탁할 때까지 미루는 것도 피해 주세요.',
    },
  },
  '공간 정돈': {
    condition: {
      wife: '어수선한 공간이 평소보다 더 피로하게 느껴질 수 있어요. 눈에 보이는 자극이 많으면 마음도 어수선해져요.',
      husband: '아내가 어수선한 환경에 더 지칠 수 있는 날이에요. 정리되지 않은 공간이 스트레스가 될 수 있어요.',
    },
    action: {
      wife: '큰 청소 대신 테이블 위나 침대 주변만 5분 정리해 보세요. 조명을 살짝 낮추면 공간이 한결 아늑해져요.',
      husband: '침구와 테이블 위만 가볍게 정리해 두세요. 조명을 부드럽게 맞춰주면 아내가 더 편하게 쉴 수 있어요.',
    },
    caution: {
      wife: '오늘 대청소를 시작하거나 물건을 한꺼번에 꺼내는 건 피하세요. 강한 세정제 냄새도 멀리 하는 게 좋아요.',
      husband: '큰 청소를 벌이거나 강한 세제를 쓰는 건 오늘은 피해 주세요. 아내가 무리해서 정리하지 않게 해주세요.',
    },
  },
  '생리기 · 회복 리듬': {
    condition: {
      wife: '생리 기간이라 기운이 떨어지고 예민해지기 쉬워요. 아랫배가 무겁고 쉽게 피곤할 수 있어요.',
      husband: '아내가 생리 중이라 기운이 없고 예민할 수 있어요. 통증이나 피로로 힘들어할 수 있어요.',
    },
    action: {
      wife: '몸을 따뜻하게 하고 따뜻한 차나 찜질로 아랫배를 편하게 해주세요. 일정은 가볍게 잡고 휴식을 우선하세요.',
      husband: '따뜻한 차나 핫팩을 챙기고 집안일을 더 맡아 주세요. 아내가 푹 쉴 수 있게 조용한 분위기를 만들어 주세요.',
    },
    caution: {
      wife: '찬 음식과 카페인은 줄이고, 무리한 운동이나 긴 약속은 피하세요. 수면을 줄이지 않는 게 중요해요.',
      husband: '찬 음식·카페인을 권하지 말고 무리한 외출은 미뤄 주세요. 늦게까지 깨어 있지 않게 도와주세요.',
    },
  },
  '난포기 · 활력 상승': {
    condition: {
      wife: '컨디션과 집중력이 올라오는 시기예요. 기분도 가볍고 새 일을 시작하기 좋은 때예요.',
      husband: '아내 컨디션이 좋은 편이에요. 활력이 올라와 움직이기 좋은 시기예요.',
    },
    action: {
      wife: '가벼운 운동이나 미뤄둔 일을 시작하기 좋아요. 단백질 위주로 끼니를 잘 챙기면 컨디션이 더 안정돼요.',
      husband: '같이 산책하거나 가벼운 활동을 함께해 보세요. 균형 잡힌 식사를 같이 챙기면 좋아요.',
    },
    caution: {
      wife: '컨디션이 좋다고 일정을 과하게 몰아넣지는 마세요. 끼니를 거르거나 당 높은 간식만으로 버티는 건 피하세요.',
      husband: '컨디션이 좋아도 무리한 일정을 함께 잡지 않는 게 좋아요. 아내가 끼니를 거르지 않게 챙겨 주세요.',
    },
  },
  '배란 전후 · 감각 민감': {
    condition: {
      wife: '몸의 변화가 크고 감각이 예민해질 수 있어요. 컨디션이 미세하게 오르내릴 수 있어요.',
      husband: '아내가 몸의 변화와 컨디션 기복에 예민할 수 있어요. 평소보다 섬세하게 반응할 수 있어요.',
    },
    action: {
      wife: '물을 자주 마시고 편한 옷을 입어 몸을 가볍게 해주세요. 가벼운 외출로 기분을 환기하는 것도 좋아요.',
      husband: '물과 간단한 간식을 챙겨주고 편하게 다닐 수 있게 도와주세요. 짧은 산책을 함께 제안해 보세요.',
    },
    caution: {
      wife: '무리한 야근이나 수면 부족은 피하세요. 몸이 보내는 신호를 무시하고 밀어붙이지 마세요.',
      husband: '늦은 일정이나 수면을 줄이는 건 피해 주세요. 아내가 무리하지 않게 곁에서 살펴 주세요.',
    },
  },
  '황체기 · 감정 변동': {
    condition: {
      wife: '붓기·피로·예민함이 조금씩 올라올 수 있어요. 기분이 가라앉거나 예민해지기 쉬운 때예요.',
      husband: '아내가 붓고 예민해질 수 있는 시기예요. 감정 변화가 평소보다 클 수 있어요.',
    },
    action: {
      wife: '따뜻하게 쉬고, 짧은 산책이나 따뜻한 샤워로 긴장을 풀어주세요. 일정을 줄이고 안정적인 루틴을 반복하는 게 좋아요.',
      husband: '편히 쉴 분위기를 만들고 따뜻한 샤워나 가벼운 산책을 도와주세요. 아내의 감정을 다그치지 말고 받아 주세요.',
    },
    caution: {
      wife: '짠 음식·단 음식·카페인은 줄이세요. 중요한 결정을 몰아서 하거나 잠을 줄이는 건 피하는 게 좋아요.',
      husband: '짠 음식이나 카페인을 권하지 마세요. 무거운 대화나 결정은 다음으로 미뤄 주세요.',
    },
  },
}

// 리듬별 ThinQ 가전 케어 추천 (가전제어 정체성)
const APPLIANCE_BY_RHYTHM: Record<string, string> = {
  '수면 회복': '밤엔 공기청정기를 수면 모드로 낮추고 조명을 따뜻하게 디밍하면 더 깊게 쉴 수 있어요.',
  '냄새 민감도': '조리 전후 공기청정기를 터보로 올리고, 냄새가 빠지면 자동 모드로 두세요.',
  '마음 안정': '조명을 은은하게 낮추고 스탠바이미로 잔잔한 영상·음악을 틀어 분위기를 가라앉혀 보세요.',
  '활력 조절': '오후엔 에어컨 제습으로 끈적임을 줄이고 공기청정기는 자동으로 두면 덜 지쳐요.',
  '집중력 분산': '공기청정기를 저소음 모드로 두고 알림은 최소화, 백색소음을 틀면 집중에 도움이 돼요.',
  '가족 케어': '허브에 “저녁 준비”라고 말하면 조명·공기청정기·음악을 한 번에 맞춰줄 수 있어요.',
  '공간 정돈': '로봇청소기로 가볍게 한 바퀴 돌리고 공기청정기를 자동으로 두면 먼지가 금방 정리돼요.',
  '생리기 · 회복 리듬': '온열로 실내를 따뜻하게 하고 공기청정기는 자동으로 두면 회복에 좋아요.',
  '난포기 · 활력 상승': '환기 후 공기청정기는 자동, 조명을 밝게 두면 활동하기 좋은 환경이 돼요.',
  '배란 전후 · 감각 민감': '제습으로 쾌적하게, 공기청정기는 저소음으로 두면 예민한 날 부담이 줄어요.',
  '황체기 · 감정 변동': '조명을 따뜻하게 낮추고 스탠바이미로 편안한 영상을 틀어 긴장을 풀어보세요.',
}

// 주차별 발달 정보 (일반적인 임신 발달 정보 기준)
const WEEK_FACTS: Array<{ week: number; fact: string }> = [
  { week: 8, fact: '이번 주부터 작은 손가락과 발가락이 조금씩 갈라지기 시작해요.' },
  { week: 10, fact: '주요 장기가 거의 자리를 잡고 빠르게 발달하는 시기예요.' },
  { week: 12, fact: '양수 속에서 아기가 딸꾹질을 시작하기도 해요.' },
  { week: 14, fact: '표정 근육이 생겨 찡그리거나 입을 오물거릴 수 있어요.' },
  { week: 16, fact: '청각이 발달해 엄마 목소리에 반응하기 시작해요.' },
  { week: 18, fact: '하품이나 기지개 같은 움직임을 보이기도 해요.' },
  { week: 20, fact: '손끝에 고유한 지문이 만들어지는 시기예요.' },
  { week: 22, fact: '눈썹과 머리카락이 자라기 시작해요.' },
  { week: 24, fact: '미각이 발달해 양수의 맛을 느끼기 시작해요.' },
  { week: 26, fact: '아기가 눈을 떴다 감았다 할 수 있게 돼요.' },
  { week: 28, fact: '꿈을 꾸는 렘수면이 나타나기 시작하는 시기예요.' },
  { week: 30, fact: '뇌의 주름이 늘면서 빠르게 발달하고 있어요.' },
  { week: 32, fact: '피부 아래 지방이 차오르며 통통해지는 시기예요.' },
  { week: 34, fact: '중추신경과 폐가 성숙해지며 바깥세상을 준비해요.' },
  { week: 36, fact: '엄마의 면역 항체를 전달받아 면역력을 쌓고 있어요.' },
  { week: 38, fact: '폐가 거의 다 자라 곧 만날 준비를 마쳐가요.' },
]

const PREP_FACT_BY_RHYTHM: Record<string, string> = {
  '생리기 · 회복 리듬': '생리 후 회복기에는 철분과 수분을 충분히 챙기면 컨디션 회복에 도움이 돼요.',
  '난포기 · 활력 상승': '난포기에는 에스트로겐이 오르며 컨디션과 집중력이 좋아지는 시기예요.',
  '배란 전후 · 감각 민감': '배란 전후에는 기초체온이 살짝 오르고 몸의 신호가 또렷해질 수 있어요.',
  '황체기 · 감정 변동': '황체기에는 프로게스테론 영향으로 붓기와 감정 변화가 생길 수 있어요.',
}

function getWeekFact(week: number) {
  let matched = WEEK_FACTS[0]
  for (const item of WEEK_FACTS) {
    if (item.week <= week) matched = item
    else break
  }
  return matched.fact
}

function DailyConditionPanel({ insight, role }: { insight: DailyInsight; role: DemoRole }) {
  const isWife = role === 'wife'
  const accent = '#a14f62'
  const boosters = insight.moodBoosters
  const avoids = insight.avoidActions

  const guide = CONDITION_GUIDE[insight.rhythmLabel]
  const pick = (text: GuideText) => (isWife ? text.wife : text.husband)

  const conditionText = guide
    ? pick(guide.condition)
    : isWife
      ? '오늘은 컨디션이 시간대에 따라 오르내릴 수 있는 날이에요. 몸이 보내는 신호를 살피며 무리하지 않는 게 좋아요.'
      : '오늘 아내는 컨디션이 오르내릴 수 있는 날이에요. 평소보다 한 번 더 살펴봐 주세요.'

  const actionText = guide
    ? pick(guide.action)
    : isWife
      ? `${boosters.slice(0, 2).join(', ')}처럼 컨디션에 도움이 되는 걸 오늘 한 가지라도 챙겨보세요.`
      : `${boosters[0]}을(를) 함께 챙기고, 아내가 쉴 수 있는 시간을 먼저 만들어 주세요.`

  const cautionText = guide
    ? pick(guide.caution)
    : `${avoids.slice(0, 2).join(', ')}처럼 부담이 되는 일은 오늘은 줄여 주세요. 무리한 일정도 피하는 게 좋아요.`

  const applianceText =
    APPLIANCE_BY_RHYTHM[insight.rhythmLabel] ??
    '허브에 오늘 컨디션을 말하면 공기청정기·조명·온도를 한 번에 맞춰줄 수 있어요.'

  const funFact =
    insight.pregnancyWeek != null
      ? getWeekFact(insight.pregnancyWeek)
      : PREP_FACT_BY_RHYTHM[insight.rhythmLabel] ?? '규칙적인 생활 리듬이 임신 준비에 도움이 돼요.'

  const items: Array<{ label: string; value: string }> = [
    { label: isWife ? '오늘 내 컨디션' : '오늘 도와줄 일', value: conditionText },
    { label: isWife ? '이렇게 해보세요' : '아내에게 해주면 좋은 것', value: actionText },
    { label: '가전 케어', value: applianceText },
    { label: '오늘의 정보', value: funFact },
    { label: '주의할 점', value: cautionText },
  ]

  return (
    <div className="overflow-hidden rounded-[30px] border border-white/85 bg-white/94 p-6 shadow-[0_18px_44px_rgba(165,0,52,0.1)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff0f5] text-[#c84c73] ring-1 ring-[#f2d3de]"
        >
          {isWife ? <HeartIcon /> : <HandIcon />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[20px] font-bold text-[#2c2630]">{isWife ? '엄마품' : '아빠손길'}</p>
          <p className="mt-0.5 text-[13px] text-[#a99fa6]">오전 9시 컨디션 카드</p>
        </div>
      </div>

      <div className="mt-5">
        {items.map((item, index) => (
          <div key={item.label} className={index > 0 ? 'mt-4 border-t border-[#f3e6ec] pt-4' : ''}>
            <p className="text-[12px] font-bold" style={{ color: accent }}>{item.label}</p>
            <p className="mt-1.5 text-[15px] leading-[1.65] text-[#43404a]">{item.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-[#b4abb2]">{insight.disclaimer}</p>
    </div>
  )
}

function RecordTile({
  title,
  subtitle,
  chipBg,
  iconColor,
  icon,
  onClick,
}: {
  title: string
  subtitle: string
  chipBg: string
  iconColor: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title} 열기`}
      className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[30px] border border-[#f0e7ea] bg-white p-6 text-left shadow-[0_14px_36px_rgba(40,30,36,0.06)] transition active:scale-[0.99]"
    >
      <span
        aria-hidden="true"
        className="relative flex h-16 w-16 items-center justify-center rounded-[22px] [&_svg]:h-8 [&_svg]:w-8"
        style={{ backgroundColor: chipBg, color: iconColor }}
      >
        {icon}
      </span>

      <span className="relative mt-auto block">
        <span className="block text-[26px] font-black tracking-[-0.02em] text-[#1b1b1d]">{title}</span>
        <span className="mt-1.5 block text-[14px] font-medium leading-5 text-[#9a8f95]">{subtitle}</span>
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: iconColor }}>
          열기
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
      </span>
    </button>
  )
}

function PhotoAlbumTile({
  onOpenGallery,
}: {
  onOpenGallery: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpenGallery}
      aria-label="사진첩 열기"
      className="group relative flex min-h-[220px] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-[30px] border border-[#f0e7ea] bg-white p-6 text-left shadow-[0_14px_36px_rgba(40,30,36,0.06)] transition active:scale-[0.99]"
    >
      <span
        aria-hidden="true"
        className="relative flex h-16 w-16 items-center justify-center rounded-[22px] text-[#e8497e] [&_svg]:h-8 [&_svg]:w-8"
        style={{ backgroundColor: '#ffe6ef' }}
      >
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="6" y="8" width="20" height="16" rx="4" />
          <path d="M8.5 21 13 16.5l3.2 3.2 4.8-5.2 2.5 3.1" />
          <circle cx="12.5" cy="12.8" r="1.5" />
        </svg>
      </span>

      <span className="relative mt-auto block">
        <span className="block text-[26px] font-black tracking-[-0.02em] text-[#1b1b1d]">사진첩</span>
        <span className="mt-1.5 block text-[14px] font-medium leading-5 text-[#9a8f95]">주차별 초음파와 성장 장면을 모아봐요</span>
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-[#e8497e]">
          열기
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
      </span>
    </button>
  )
}

function RecordsTab({
  showPhotoAlbum,
  onOpenDiary,
  onOpenGallery,
}: {
  showPhotoAlbum: boolean
  onOpenDiary: () => void
  onOpenGallery: () => void
}) {
  return (
    <>
      <MobileTabHeader brandOnly />
      <div className="flex min-h-[calc(100dvh-13.5rem)] flex-col gap-4 pt-2">
        {showPhotoAlbum && (
          <PhotoAlbumTile onOpenGallery={onOpenGallery} />
        )}
        <RecordTile
          title="AI 자동 일기"
          subtitle="오늘 케어와 대화로 AI가 일기를 정리해요"
          chipBg="#ffe6ef"
          iconColor="#e8497e"
          onClick={onOpenDiary}
          icon={
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6.5h12.5A2.5 2.5 0 0 1 24 9v17H10.5A2.5 2.5 0 0 1 8 23.5V7.5A1 1 0 0 1 9 6.5Z" />
              <path d="M12 6.5v17" />
              <path d="M15.5 13h4.8" />
              <path d="M15.5 17h3.4" />
              <path d="m23.4 11.2.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5Z" />
            </svg>
          }
        />
      </div>
    </>
  )
}

function HubTab({
  hubUrl,
  microphonePermission,
  onRequestMicrophone,
}: {
  hubUrl: string
  microphonePermission: MicrophonePermissionStatus
  onRequestMicrophone: () => void
}) {
  return (
    <>
      <MobileTabHeader brandOnly />
      <section className="rounded-[30px] border border-white/85 bg-white/94 p-5 text-[#2c2630] shadow-[0_18px_44px_rgba(165,0,52,0.1)] backdrop-blur">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#fff1f6] ring-1 ring-[#f2d3de]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hub-logo.png" alt="AI HUB" className="h-16 w-16 object-contain" />
        </div>
        <h2 className="mt-5 text-2xl font-bold">AI HUB로 말하기</h2>
        <p className="mt-3 text-sm leading-6 text-[#806b73]">
          현재 모바일 프로필이 HUB에 전달되고, HUB는 `/api/demo-state`를 읽어 같은 상태와 역할로 동작합니다.
        </p>
        <div className="mt-5 rounded-2xl bg-[#fff2f6] px-4 py-3 text-sm font-semibold text-[#8b4253] ring-1 ring-[#f4d7e1]">
          마이크: {microphonePermission === 'granted' ? '허용됨' : '확인 필요'}
        </div>
        <button
          type="button"
          onClick={onRequestMicrophone}
          className="mt-4 min-h-11 w-full rounded-full bg-[#fff0f5] px-4 text-sm font-bold text-[#a50034] ring-1 ring-[#f0ccd9]"
        >
          마이크 권한 확인
        </button>
        <Link
          href={hubUrl}
          className="mt-3 block min-h-12 rounded-full bg-[#a50034] px-4 py-3 text-center text-sm font-bold text-white shadow-[0_12px_24px_rgba(165,0,52,0.22)]"
        >
          AI 에이전트 화면 열기
        </Link>
      </section>
    </>
  )
}

function ManualControlTab({
  state,
  thinqState,
  airPowerSync,
  selectedQuickCareId,
  onApplyManualCare,
  onToggleLightPower,
}: {
  state: SharedDemoState
  thinqState: ThinQDeviceStateView
  airPowerSync: ManualAirPowerSync | null
  selectedQuickCareId: string | null
  onApplyManualCare: (option: { id?: string; label: string; command: string }) => void
  onToggleLightPower: (nextPower: LightPowerState) => void
}) {
  const [optimisticAirPower, setOptimisticAirPower] = useState<ManualAirPowerSync | null>(null)
  const syncedAirPower =
    optimisticAirPower && (!airPowerSync || optimisticAirPower.nonce > airPowerSync.nonce)
      ? optimisticAirPower.power
      : airPowerSync?.power
  const airPurifierOn = (syncedAirPower ?? thinqState.power) === 'ON'
  const airPurifierStatusLabel = airPurifierOn ? 'ON' : 'OFF'
  const lightOn = state.lightPower !== 'off'
  const lightStatusLabel = lightOn ? 'ON' : 'OFF'
  const activeManualOptionId = selectedQuickCareId

  return (
    <>
      <MobileTabHeader brandOnly />
        <SmartHomeDashboard
          pregnancyStatus={state.pregnancyStatus}
          routine={state.currentRoutine}
          simulationRoutine={state.simulationRoutine}
          preparationMode={state.preparationMode}
          lightPower={state.lightPower}
          careState={state.careState}
          thinqState={thinqState}
        />

      <section className="mt-4 rounded-[30px] border border-white/85 bg-white/94 p-5 shadow-[0_18px_44px_rgba(165,0,52,0.1)] backdrop-blur">
        <p className="text-xs font-semibold text-[#a14f62]">빠른 수동 조절</p>
        <div className="mt-3 grid gap-2">
          {state.pregnancyStatus === 'preparing'
            ? MANUAL_PREPARATION_OPTIONS.map((option) => {
                const active = activeManualOptionId === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onApplyManualCare({ id: option.id, label: option.label, command: option.command })}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-[#f1648d] bg-[#fff0f5] shadow-[0_10px_24px_rgba(241,100,141,0.16)] ring-1 ring-[#f1648d]/35'
                        : 'border-[#f2d7e1] bg-white hover:bg-[#fff2f6]'
                    }`}
                  >
                    <span className={`block text-sm font-bold ${active ? 'text-[#a50034]' : 'text-gray-900'}`}>
                      {option.label}
                    </span>
                    <span className={`mt-1 block text-xs leading-5 ${active ? 'text-[#8b4253]' : 'text-gray-500'}`}>
                      {option.description}
                    </span>
                  </button>
                )
              })
            : MANUAL_QUICK_CARE_OPTIONS.map((option) => {
                const active = activeManualOptionId === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onApplyManualCare({ id: option.id, label: option.label, command: option.command })}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-[#f1648d] bg-[#fff0f5] shadow-[0_10px_24px_rgba(241,100,141,0.16)] ring-1 ring-[#f1648d]/35'
                        : 'border-[#f2d7e1] bg-white hover:bg-[#fff2f6]'
                    }`}
                  >
                    <span className={`block text-sm font-bold ${active ? 'text-[#a50034]' : 'text-gray-900'}`}>
                      {option.label}
                    </span>
                    <span className={`mt-1 block text-xs leading-5 ${active ? 'text-[#8b4253]' : 'text-gray-500'}`}>
                      {option.description}
                    </span>
                  </button>
                )
              })}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#f2d7e1] bg-white px-4 py-3">
            <div>
              <span className="block text-sm font-bold text-gray-900">공기청정기</span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">
                {airPurifierStatusLabel}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={airPurifierOn}
              aria-label={airPurifierOn ? '공기청정기 끄기' : '공기청정기 켜기'}
              onClick={() => {
                setOptimisticAirPower({
                  power: airPurifierOn ? 'OFF' : 'ON',
                  nonce: Date.now(),
                })
                onApplyManualCare(
                  airPurifierOn
                    ? {
                        label: MANUAL_AIR_PURIFIER_OFF.label,
                        command: MANUAL_AIR_PURIFIER_OFF.command,
                      }
                    : {
                        label: MANUAL_AIR_PURIFIER_ON.label,
                        command: MANUAL_AIR_PURIFIER_ON.command,
                      },
                )
              }}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                airPurifierOn ? 'bg-[#f1648d]' : 'bg-[#e2e8f0]'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  airPurifierOn ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#f2d7e1] bg-white px-4 py-3">
            <div>
              <span className="block text-sm font-bold text-gray-900">거실 조명</span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">
                {lightStatusLabel}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={lightOn}
              aria-label={lightOn ? '거실 조명 끄기' : '거실 조명 켜기'}
              onClick={() => onToggleLightPower(lightOn ? 'off' : 'on')}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                lightOn ? 'bg-[#f1648d]' : 'bg-[#e2e8f0]'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  lightOn ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

function HueBluetoothControl() {
  const [status, setStatus] = useState<HueBleConnectionStatus>(() => getHueBleStatus())

  useEffect(() => subscribeHueBleStatus(setStatus), [])

  const handleConnect = useCallback(async () => {
    await connectHueBle()
  }, [])

  if (!status.supported) {
    return (
      <div className="rounded-2xl border border-[#f2d7e1] bg-white px-4 py-3">
        <span className="block text-sm font-bold text-gray-900">Hue Bluetooth</span>
        <span className="mt-1 block text-xs leading-5 text-gray-500">
          {status.message}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#f2d7e1] bg-white px-4 py-3">
      <div>
        <span className="block text-sm font-bold text-gray-900">Hue Bluetooth</span>
        <span className="mt-1 block text-xs leading-5 text-gray-500">
          {status.connected
            ? `${status.deviceName ?? 'Hue Bluetooth 전구'} 연결됨`
            : status.message}
        </span>
      </div>
      <button
        type="button"
        disabled={status.connecting || status.connected}
        onClick={() => void handleConnect()}
        className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition ${
          status.connected
            ? 'bg-[#e7f5ee] text-[#2d8a5a]'
            : 'bg-[#fff0f5] text-[#a50034] ring-1 ring-[#f0ccd9] disabled:cursor-wait disabled:opacity-70'
        }`}
      >
        {status.connected
          ? '연결됨'
          : status.connecting
            ? '연결 중'
            : 'Hue Bluetooth 연결'}
      </button>
    </div>
  )
}

function SettingsTab({
  state,
  microphonePermission,
  simulationUrl,
  pregnancyStartDate,
  onEditProfile,
  onRequestMicrophone,
  onRefresh,
}: {
  state: SharedDemoState
  microphonePermission: MicrophonePermissionStatus
  simulationUrl: string
  pregnancyStartDate: string
  onEditProfile: () => void
  onRequestMicrophone: () => void
  onRefresh: () => void
}) {
  const userInfoValue = state.pregnancyStatus === 'preparing'
    ? `임신 준비중 · ${state.role === 'wife' ? '아내' : '남편'}`
    : `${formatLongDate(pregnancyStartDate)} 시작 · ${state.role === 'wife' ? '아내' : '남편'}`

  return (
    <>
      <MobileTabHeader brandOnly />
      <section className="space-y-3 rounded-[30px] border border-white/85 bg-white/94 p-5 shadow-[0_18px_44px_rgba(165,0,52,0.1)] backdrop-blur">
        <SettingsRow label="사용자 정보" value={userInfoValue}>
          <button type="button" onClick={onEditProfile} className="rounded-full bg-[#f3e5e8] px-3 py-2 text-xs font-bold text-[#8b4253]">
            수정
          </button>
        </SettingsRow>
        <SettingsRow label="마이크 권한" value={microphonePermission === 'granted' ? '허용됨' : '확인 필요'}>
          <button type="button" onClick={onRequestMicrophone} className="rounded-full bg-[#a50034] px-3 py-2 text-xs font-bold text-white">
            확인
          </button>
        </SettingsRow>
        <SettingsRow label="공유 상태" value="모바일 · HUB · 3D 동기화">
          <button type="button" onClick={onRefresh} className="rounded-full bg-[#fff0f5] px-3 py-2 text-xs font-bold text-[#a50034] ring-1 ring-[#f0ccd9]">
            새로고침
          </button>
        </SettingsRow>
      </section>
      <section className="mt-3 rounded-[30px] border border-white/85 bg-white/94 p-5 shadow-[0_18px_44px_rgba(165,0,52,0.1)] backdrop-blur">
        <p className="text-xs font-semibold text-[#a14f62]">시연 화면 바로가기</p>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <a href={simulationUrl} className="rounded-2xl bg-[#fff0f5] px-4 py-4 text-center text-sm font-bold text-[#a50034] ring-1 ring-[#f0ccd9]">
            3D
          </a>
        </div>
      </section>
    </>
  )
}

function SettingsRow({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#fff7fa] px-4 py-3 ring-1 ring-[#f3dce5]">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        <p className="mt-1 truncate text-sm font-bold text-gray-900">{value}</p>
      </div>
      {children}
    </div>
  )
}

function MobileBottomNavigation({
  activeTab,
  onChange,
  onHubHoldStart,
  onHubHoldEnd,
}: {
  activeTab: MobileTab
  onChange: (tab: MobileTab) => void
  onHubHoldStart: () => void
  onHubHoldEnd: () => void
}) {
  const tabs: Array<{ id: MobileTab; label: string }> = [
    { id: 'home', label: '홈' },
    { id: 'records', label: '기록' },
    { id: 'hub', label: 'HUB' },
    { id: 'manual', label: '수동제어' },
    { id: 'settings', label: '설정' },
  ]

  return (
    <nav
      className="bg-transparent"
      style={{
        position: 'fixed',
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 10000,
        display: 'block',
        width: '100%',
      }}
      aria-label="사용자 홈 하단 메뉴"
    >
      <div
        className="mx-auto grid h-[76px] grid-cols-5 items-end rounded-t-[28px] border-t border-[#ded8d3] bg-white px-2 shadow-[0_-10px_30px_rgba(44,36,32,0.12)]"
        style={{
          width: '100%',
          maxWidth: 'min(430px, 100vw)',
          boxSizing: 'border-box',
        }}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          if (tab.id === 'hub') {
            return (
              <button
                key={tab.id}
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault()
                  try {
                    event.currentTarget.setPointerCapture(event.pointerId)
                  } catch {
                    // Some mobile browsers throw when pointer capture is unavailable.
                  }
                  onHubHoldStart()
                }}
                onPointerUp={(event) => {
                  try {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                    }
                  } catch {
                    // Capture may already be released by the browser.
                  }
                  onHubHoldEnd()
                }}
                onPointerCancel={(event) => {
                  try {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                    }
                  } catch {
                    // Capture may already be released by the browser.
                  }
                  onHubHoldEnd()
                }}
                onContextMenu={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onHubHoldStart()
                }}
                onKeyUp={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onHubHoldEnd()
                }}
                className="flex min-w-0 touch-none select-none flex-col items-center justify-end pb-2 text-[10px] font-bold text-[#d93832]"
                style={{ WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none' }}
                aria-current={active ? 'page' : undefined}
                aria-label="길게 눌러 HUB 음성 실행"
              >
                <span
                  className="-mt-8 flex h-[67px] w-[67px] select-none items-center justify-center rounded-full border-[5px] border-white bg-white shadow-[0_10px_24px_rgba(226,59,53,0.30)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/hub-logo.png"
                    alt=""
                    draggable={false}
                    className="pointer-events-none h-[46px] w-[46px] select-none object-contain"
                  />
                </span>
                <span className="mt-0.5">HUB</span>
              </button>
            )
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex min-w-0 flex-col items-center justify-end gap-1 pb-3 text-[10px] font-semibold ${
                active ? 'text-[#9a4b5e]' : 'text-gray-400'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                active ? 'bg-[#f3e5e8]' : ''
              }`}>
                <MobileTabIcon tab={tab.id} />
              </span>
              <span className="max-w-full truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>
      <div
        aria-hidden="true"
        className="mx-auto bg-white"
        style={{ width: '100%', maxWidth: 'min(430px, 100vw)', height: 'env(safe-area-inset-bottom)' }}
      />
    </nav>
  )
}

function MobileTabIcon({ tab }: { tab: MobileTab }) {
  const commonProps = {
    width: 21,
    height: 21,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (tab === 'home') {
    return <svg {...commonProps}><path d="m3 10 9-7 9 7v10H7V12h10v8" /></svg>
  }
  if (tab === 'records') {
    return <svg {...commonProps}><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
  }
  if (tab === 'hub') {
    return <MicrophoneIcon />
  }
  if (tab === 'manual') {
    return <svg {...commonProps}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M2 14h4M10 8h4M18 16h4" /></svg>
  }
  return <svg {...commonProps}><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.25.6.84 1 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" /></svg>
}

function MicrophoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 14a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Z" />
      <path d="M19 10a7 7 0 0 1-14 0M12 17v4M8 21h8" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3.5v3M16 3.5v3M4 10h16" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  )
}

function HandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v7" />
      <path d="M8 11.5 6.6 10a1.6 1.6 0 0 0-2.4 2.1l4.4 5.2A6 6 0 0 0 13.2 20H14a6 6 0 0 0 6-6v-2.5" />
    </svg>
  )
}

function CompactToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<[string, string]>
  value: string
  onChange: (value: string) => void
}) {
  const lastTouchActionAtRef = useRef(0)

  const runTouchAction = (event: ReactPointerEvent<HTMLButtonElement>, nextValue: string) => {
    event.stopPropagation()
    if (event.pointerType === 'mouse') return

    event.preventDefault()
    lastTouchActionAtRef.current = event.timeStamp
    onChange(nextValue)
  }

  const runClickAction = (event: MouseEvent<HTMLButtonElement>, nextValue: string) => {
    if (lastTouchActionAtRef.current > 0 && event.timeStamp - lastTouchActionAtRef.current < 700) return
    onChange(nextValue)
  }

  return (
    <div>
      <p className="px-1 pb-1 text-[10px] font-semibold text-gray-400">{label}</p>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#f3f1ee] p-1">
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onPointerUp={(event) => runTouchAction(event, key)}
            onClick={(event) => runClickAction(event, key)}
            className={`min-h-11 rounded-lg px-1 text-[11px] font-semibold transition [touch-action:manipulation] ${value === key ? 'bg-white text-[#8b4253] shadow-sm' : 'text-gray-500'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function StoredUltrasoundDetail({
  card,
  onBack,
}: {
  card: UltrasoundStoredCard
  onBack: () => void
}) {
  const fruit = getPregnancyFruit(card.pregnancyWeek)

  return (
    <article>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-[#a14f62]"
      >
        ← 갤러리 목록
      </button>
      {card.imageUrl && (
        <div className="grid grid-cols-2 gap-2.5">
          <figure className="min-w-0">
            <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.imageUrl} alt={card.title} className="h-full w-full object-contain" />
            </div>
            <figcaption className="mt-2 text-center text-xs font-medium text-gray-500">
              {card.pregnancyWeek}주차 초음파
            </figcaption>
          </figure>
          <figure className="min-w-0">
            <PregnancyFruitImage
              pregnancyWeek={card.pregnancyWeek}
              fruitName={fruit.fruitName}
              className="aspect-square w-full rounded-2xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
            />
            <figcaption className="mt-2 text-center text-xs font-semibold text-[#a14f62]">
              {fruit.fruitName}만큼 자란 시기
            </figcaption>
          </figure>
        </div>
      )}
      <p className="mt-4 text-xs font-semibold text-[#a14f62]">
        임신 {card.pregnancyWeek}주차 성장 기록
      </p>
      <h3 className="mt-1 text-xl font-bold text-gray-900">{card.title}</h3>
      <div className="mt-4 space-y-3 rounded-2xl bg-[#f7f5f2] p-4 text-sm leading-6 text-gray-700">
        <p><span className="font-semibold">오늘의 장면</span><br />{card.sceneLabel}</p>
        <p><span className="font-semibold">성장 기록</span><br />{card.growthText}</p>
        <p><span className="font-semibold">AI 다이어리</span><br />{card.diarySnippet}</p>
      </div>
      {card.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {card.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#f3e5e8] px-3 py-1 text-xs text-[#8b4253]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
