'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import UltrasoundMemoryCardSection from '@/components/ultrasound/UltrasoundMemoryCardSection'
import UltrasoundUploadModal from '@/components/ultrasound/UltrasoundUploadModal'
import UltrasoundGrowthGalleryView from '@/components/ultrasound/UltrasoundGrowthGalleryView'
import ExpandIconButton from '@/components/ui/ExpandIconButton'
import DeviceStatusDashboard from '@/components/mobile/DeviceStatusDashboard'
import {
  HomeConditionDetail,
  PreparingCareDetail,
} from '@/components/preparing/PreparingCardDetails'
import { DEMO_WIFE_ID, supabase, type DiaryEntry, type UltrasoundRecord } from '@/lib/supabase'
import {
  buildPregnancyCalendarEvents,
  type PregnancyCalendarEvent,
  type PregnancyCalendarEventKind,
} from '@/lib/pregnancy-calendar'
import {
  DEFAULT_SHARED_DEMO_STATE,
  type DemoPregnancyStatus,
  type DemoRole,
  type SharedDemoState,
} from '@/lib/shared-demo-state'
import {
  buildUltrasoundGrowthModeRun,
  saveUltrasoundGrowthCareLocally,
} from '@/lib/ultrasound-care-bridge'
import {
  buildSimulation3dUrl,
  isSimulationRoutineId,
  type SimulationRoutineId,
} from '@/lib/simulation-routine-bridge'
import {
  buildStoredCardFromAnalyzeResponse,
  mergeLocalOnlyCards,
  readUltrasoundCardsFromLocalStorage,
  saveUltrasoundCardToLocalStorage,
} from '@/lib/ultrasound-storage'
import type { UltrasoundAnalyzeResponse, UltrasoundStoredCard } from '@/lib/ultrasound-types'
import { buildDemoGalleryCards, ULTRASOUND_MAIN_DEMO_HINT } from '@/lib/ultrasound-demo'
import { getPregnancyFruit } from '@/lib/pregnancy-fruit'

const LOCAL_STATE_KEY = 'thinq-mom-shared-demo-state'
const POLL_INTERVAL_MS = 2500

type MorningBriefingResponse = {
  success?: boolean
  wifeBriefing?: string
  audioBase64?: string
  recommendedModes?: string[]
  error?: string
}

type ExpandedWifeCard = 'care' | 'ultrasound' | 'diary' | null
type ExpandedHusbandCard = 'condition' | 'actions' | 'calendar' | null
type MobileTab = 'home' | 'devices' | 'care' | 'menu'

type LatestCareAdvice = {
  mode: string
  modeLabel: string | null
  inputText: string | null
  advice: string | null
  createdAt: string
}

type DemoStatePayload = SharedDemoState & {
  latestCareAdvice?: LatestCareAdvice | null
}

const ROUTINE_LABELS: Record<string, string> = {
  NAUSEA_MODE: '입덧 완화 케어',
  SLEEP_MODE: '수면 케어',
  TRAVEL_MODE: '휴양지 케어',
  HOUSEWORK_MODE: '가사 케어',
}

function dateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isPreparingDiaryEntry(entry: DiaryEntry) {
  const usedModes = Array.isArray(entry.used_modes)
    ? entry.used_modes
    : typeof entry.used_modes === 'string'
      ? [entry.used_modes]
      : []

  return (
    entry.id.startsWith('preparing-')
    || usedModes.includes('PREPARING_ROUTINE')
    || entry.source_summary?.includes('임신 준비') === true
  )
}

function buildDiaryFallback(
  pregnancyStatus: DemoPregnancyStatus,
  pregnancyWeek: number,
): DiaryEntry {
  const createdAt = new Date().toISOString()

  if (pregnancyStatus === 'preparing') {
    return {
      id: 'preparing-demo-today',
      title: '둘의 생활 리듬을 맞춰본 날',
      content: `오늘은 임신 준비를 서두르기보다 둘이 편안하게 이어갈 수 있는 생활 리듬부터 살펴봤다.

저녁 식사 시간을 조금 일찍 맞추고, 잠들기 전에는 조명과 소리를 낮춰 함께 쉬기로 했다. 작은 습관을 같이 정하니 혼자 준비해야 한다는 부담이 줄었다.

완벽하게 지키는 것보다 서로의 컨디션을 묻고 조정하는 시간을 꾸준히 이어가고 싶다.`,
      summary: '수면과 식사, 휴식 시간을 함께 조율하며 준비한 하루',
      pregnancy_week: null,
      baby_name: null,
      source_summary: '임신 준비중 생활 리듬과 부부 준비 기록',
      used_modes: ['PREPARING_ROUTINE'],
      created_at: createdAt,
      is_demo: true,
    }
  }

  return {
    id: 'pregnant-demo-today',
    title: `${pregnancyWeek}주차, 몸의 신호를 천천히 살핀 날`,
    content: `오늘은 평소보다 몸이 쉽게 피로해져 무리하지 않고 쉬는 시간을 자주 가졌다.

냄새와 공기 상태에 예민해지는 순간에는 창문을 열고 공기청정기를 켰다. 지금 필요한 휴식을 먼저 챙기는 것이 아기와 나를 위한 일이라는 생각이 들었다.

오늘 느낀 작은 변화를 기억해두고 다음 진료 때도 차분히 이야기해보려 한다.`,
    summary: `${pregnancyWeek}주차의 몸 상태와 휴식 필요를 살피며 보낸 하루`,
    pregnancy_week: pregnancyWeek,
    baby_name: '아기',
    source_summary: '임신중 컨디션과 홈케어 기록',
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
    return raw ? { ...DEFAULT_SHARED_DEMO_STATE, ...JSON.parse(raw) } : DEFAULT_SHARED_DEMO_STATE
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

const EVENT_KIND_LABELS: Record<PregnancyCalendarEventKind, string> = {
  checkup: '검사',
  application: '신청',
  preparation: '준비',
}

const EVENT_KIND_STYLES: Record<PregnancyCalendarEventKind, string> = {
  checkup: 'bg-blue-100 text-blue-700',
  application: 'bg-emerald-100 text-emerald-700',
  preparation: 'bg-amber-100 text-amber-700',
}

const EVENT_DOT_STYLES: Record<PregnancyCalendarEventKind, string> = {
  checkup: 'bg-blue-500',
  application: 'bg-emerald-500',
  preparation: 'bg-amber-500',
}

function buildMonthCells(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const offset = new Date(year, month, 1).getDay()
  const count = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: count }, (_, index) => {
      const day = index + 1
      return {
        day,
        key: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      }
    }),
  ]
}

function husbandGuide(entry: DiaryEntry | null) {
  if (!entry) return null
  const text = `${entry.title} ${entry.content}`
  const nausea = /냄새|입덧|메스꺼/.test(text)
  const tired = /피로|지치|무거|쉬/.test(text)

  return {
    summary: nausea
      ? '오늘 아내는 냄새에 민감하고 편안한 휴식이 필요한 하루였어요.'
      : tired
        ? '오늘 아내는 피로감을 느껴 평소보다 천천히 쉬어갈 필요가 있었어요.'
        : '오늘 아내는 몸의 작은 변화를 살피며 차분하게 하루를 보냈어요.',
    actions: nausea
      ? ['냄새가 강한 음식 조리 피하기', '공기청정기 상태 확인하기', '아내가 쉴 수 있도록 주변 정리하기']
      : ['집안일을 먼저 나누어 맡기', '편하게 쉴 수 있는 공간 만들기', '필요한 것이 있는지 부드럽게 확인하기'],
    note: '오늘은 특별한 해결보다, 곁에서 상태를 알아주는 게 더 필요한 날이에요.',
  }
}

export default function MobileUserHome() {
  const [state, setState] = useState<SharedDemoState>(DEFAULT_SHARED_DEMO_STATE)
  const [activeTab, setActiveTab] = useState<MobileTab>('home')
  const [latestCareAdvice, setLatestCareAdvice] = useState<LatestCareAdvice | null>(null)
  const [expandedWifeCard, setExpandedWifeCard] = useState<ExpandedWifeCard>(null)
  const [expandedHusbandCard, setExpandedHusbandCard] = useState<ExpandedHusbandCard>(null)
  const [showUltrasoundUploadModal, setShowUltrasoundUploadModal] = useState(false)
  const [showUltrasoundGallery, setShowUltrasoundGallery] = useState(false)
  const [selectedUltrasoundCard, setSelectedUltrasoundCard] =
    useState<UltrasoundStoredCard | null>(null)
  const [currentUltrasoundResult, setCurrentUltrasoundResult] =
    useState<UltrasoundAnalyzeResponse | null>(null)
  const [savedUltrasoundCards, setSavedUltrasoundCards] = useState<UltrasoundStoredCard[]>([])
  const [isUltrasoundLoading, setIsUltrasoundLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()))
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [isGenerating, setIsGenerating] = useState(false)
  const [morningBriefing, setMorningBriefing] = useState('')
  const [morningBriefingAudio, setMorningBriefingAudio] = useState('')
  const [isBriefingLoading, setIsBriefingLoading] = useState(false)
  const [isBriefingPlaying, setIsBriefingPlaying] = useState(false)
  const [message, setMessage] = useState('')
  const briefingAudioRef = useRef<HTMLAudioElement | null>(null)

  const updateState = useCallback(async (patch: Partial<SharedDemoState>) => {
    const optimistic = {
      ...state,
      ...patch,
      lastUpdated: new Date().toISOString(),
    }
    setState(optimistic)
    persistLocalState(optimistic)

    try {
      const response = await fetch('/api/demo-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) throw new Error('shared state update failed')
      const payload = (await response.json()) as { state?: DemoStatePayload }
      if (payload.state) {
        setState(payload.state)
        persistLocalState(payload.state)
      }
    } catch {
      setMessage('이 기기에는 저장했어요. 배포 환경의 Supabase 설정을 확인해주세요.')
    }
  }, [state])

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch('/api/demo-state', { cache: 'no-store' })
      if (!response.ok) throw new Error('shared state fetch failed')
      const payload = (await response.json()) as { state?: DemoStatePayload }
      if (payload.state) {
        setState(payload.state)
        setLatestCareAdvice(payload.state.latestCareAdvice ?? null)
        persistLocalState(payload.state)
      }
    } catch {
      setState(readLocalState())
    }
  }, [])

  useEffect(() => {
    const initialTimer = window.setTimeout(refreshState, 0)
    const timer = window.setInterval(refreshState, POLL_INTERVAL_MS)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
      briefingAudioRef.current?.pause()
    }
  }, [refreshState])

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
    const matchingEntries = state.diaryEntries.filter((entry) =>
      state.pregnancyStatus === 'preparing'
        ? isPreparingDiaryEntry(entry)
        : !isPreparingDiaryEntry(entry),
    )

    return matchingEntries.length > 0
      ? matchingEntries
      : [buildDiaryFallback(state.pregnancyStatus, state.pregnancyWeek)]
  }, [state.diaryEntries, state.pregnancyStatus, state.pregnancyWeek])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry>()
    for (const entry of visibleDiaryEntries) map.set(dateKey(entry.created_at), entry)
    return map
  }, [visibleDiaryEntries])

  const selectedEntry = entriesByDate.get(selectedDate) ?? null
  const pregnancyEvents = useMemo(
    () => state.pregnancyStatus === 'pregnant'
      ? buildPregnancyCalendarEvents(state.pregnancyWeek)
      : [],
    [state.pregnancyStatus, state.pregnancyWeek],
  )
  const eventsByDate = useMemo(() => {
    const map = new Map<string, PregnancyCalendarEvent[]>()
    for (const event of pregnancyEvents) {
      map.set(event.date, [...(map.get(event.date) ?? []), event])
    }
    return map
  }, [pregnancyEvents])
  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const guide = husbandGuide(selectedEntry)
  const latestDiaryGuide = husbandGuide(visibleDiaryEntries[0] ?? null)
  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth])
  const husbandCondition = latestDiaryGuide?.summary
    ?? '오늘은 컨디션 변화를 살피며 편안히 쉴 수 있는 환경이 필요해요.'
  const husbandActions = latestDiaryGuide?.actions
    ?? ['집안일을 먼저 나누어 맡기', '편하게 쉴 수 있는 공간 만들기', '필요한 것이 있는지 부드럽게 확인하기']
  const preparingHusbandActions = [
    '평일 취침 준비를 시작할 시간을 하나 정하기',
    '저녁 식사 시간과 부담 없는 메뉴를 함께 고르기',
    '이번 주 20분 산책이나 스트레칭 일정을 두 번 잡기',
    '카페인과 음주를 함께 쉬는 요일을 정하기',
  ]
  const routineLabel = state.currentRoutine
    ? ROUTINE_LABELS[state.currentRoutine] ?? latestCareAdvice?.modeLabel ?? '맞춤 케어'
    : null
  const todayKey = dateKey(new Date())
  const todayDiaryEntry = entriesByDate.get(todayKey) ?? visibleDiaryEntries[0] ?? null
  const latestUltrasoundCard = savedUltrasoundCards[0] ?? null
  const ultrasoundPreviewUrl =
    currentUltrasoundResult?.imagePreviewUrl
    ?? latestUltrasoundCard?.imageUrl
    ?? ULTRASOUND_MAIN_DEMO_HINT.imageUrl
  const ultrasoundWeek =
    currentUltrasoundResult?.pregnancyWeek
    ?? latestUltrasoundCard?.pregnancyWeek
    ?? state.pregnancyWeek
  const ultrasoundFruit = getPregnancyFruit(ultrasoundWeek)
  const careCardSummary = oneLineSummary(
    morningBriefing
      || (dateKey(latestCareAdvice?.createdAt ?? new Date(0)) === todayKey
        ? latestCareAdvice?.advice ?? ''
        : ''),
    `${state.pregnancyWeek}주차 컨디션에 맞춰 공기와 휴식 환경을 준비했어요.`,
  )
  const ultrasoundCardSummary = oneLineSummary(
    currentUltrasoundResult?.memoryCard.growthText
      ?? latestUltrasoundCard?.growthText
      ?? '',
    `${ultrasoundWeek}주차 아기는 ${ultrasoundFruit.fruitName}만큼 자란 시기예요.`,
  )
  const diaryCardSummary = oneLineSummary(
    todayDiaryEntry?.summary ?? todayDiaryEntry?.content ?? '',
    '오늘의 몸 상태와 마음을 한 줄 기록으로 정리했어요.',
  )
  const pregnantSimulationRoutine: SimulationRoutineId = isSimulationRoutineId(state.simulationRoutine ?? '')
    ? state.simulationRoutine as SimulationRoutineId
    : 'nausea_food'
  const simulationUrl = state.pregnancyStatus === 'preparing'
    ? `/simulation-3d/index.html?${new URLSearchParams({
        status: 'preparing',
        mode: 'pregnancy-prep',
        prepMode: state.preparationMode,
      }).toString()}`
    : buildSimulation3dUrl(state.currentRoutine, {
        pregnancyStatus: 'pregnant',
        pregnancyWeek: state.pregnancyWeek,
        routineId: pregnantSimulationRoutine,
      })

  async function loadMorningBriefing(playAfterLoad = false) {
    if (isBriefingLoading) return
    setIsBriefingLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/briefing/morning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'mobile_home',
          triggerText: '굿모닝',
          pregnancyWeek: state.pregnancyWeek,
        }),
      })
      const result = (await response.json()) as MorningBriefingResponse
      if (!response.ok || !result.success || !result.wifeBriefing) {
        throw new Error(result.error ?? '굿모닝 브리핑을 준비하지 못했어요.')
      }
      setMorningBriefing(result.wifeBriefing)
      setMorningBriefingAudio(result.audioBase64 ?? '')
      if (playAfterLoad && result.audioBase64) {
        await playMorningBriefing(result.audioBase64)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '굿모닝 브리핑을 준비하지 못했어요.')
    } finally {
      setIsBriefingLoading(false)
    }
  }

  async function playMorningBriefing(audioBase64 = morningBriefingAudio) {
    if (!audioBase64 || isBriefingPlaying) return
    setIsBriefingPlaying(true)
    try {
      briefingAudioRef.current?.pause()
      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`)
      briefingAudioRef.current = audio
      audio.onended = () => {
        setIsBriefingPlaying(false)
        briefingAudioRef.current = null
      }
      audio.onerror = () => {
        setIsBriefingPlaying(false)
        briefingAudioRef.current = null
        setMessage('브리핑 음성을 재생하지 못했어요.')
      }
      await audio.play()
    } catch {
      setIsBriefingPlaying(false)
      setMessage('브리핑 음성을 재생하지 못했어요.')
    }
  }

  async function generateDiary() {
    setIsGenerating(true)
    setMessage('')
    try {
      if (state.pregnancyStatus === 'preparing') {
        const now = new Date()
        const entry: DiaryEntry = {
          id: `preparing-${now.getTime()}`,
          title: '우리의 생활 리듬을 천천히 맞춘 날',
          content: `오늘은 임신을 준비한다는 마음에 조급해지기보다, 지금 함께 바꿀 수 있는 작은 습관을 살펴봤다.

수면과 식사 시간을 조금 더 일정하게 맞추고, 저녁에는 가볍게 몸을 움직이며 하루의 긴장을 내려놓기로 했다. 혼자 잘해야 하는 일이 아니라 둘이 같은 방향을 바라보는 과정이라고 생각하니 마음이 한결 편안해졌다.

완벽한 하루는 아니어도 괜찮다. 오늘처럼 서로의 컨디션을 묻고 천천히 생활 리듬을 만들어가는 시간이 우리에게 좋은 준비가 되어줄 것 같다.`,
          summary: '수면과 식사, 휴식 리듬을 함께 맞추며 편안하게 준비한 하루',
          pregnancy_week: null,
          baby_name: null,
          source_summary: '임신 준비중 생활 리듬과 부부 준비 기록',
          used_modes: ['PREPARING_ROUTINE'],
          created_at: now.toISOString(),
          is_demo: true,
        }
        const nextEntries = [
          entry,
          ...state.diaryEntries.filter((item) =>
            !(
              isPreparingDiaryEntry(item)
              && dateKey(item.created_at) === dateKey(entry.created_at)
            ),
          ),
        ]
        await updateState({ diaryEntries: nextEntries })
        setSelectedDate(dateKey(entry.created_at))
        setMessage('오늘의 준비 마음을 기록했어요.')
        return
      }

      const response = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregnancyWeek: state.pregnancyStatus === 'pregnant' ? state.pregnancyWeek : null,
        }),
      })
      const result = (await response.json()) as { success?: boolean; entry?: DiaryEntry; error?: string }
      if (!response.ok || !result.entry) throw new Error(result.error ?? '다이어리를 만들지 못했어요.')

      const nextEntries = [
        result.entry,
        ...state.diaryEntries.filter((entry) =>
          !(
            !isPreparingDiaryEntry(entry)
            && dateKey(entry.created_at) === dateKey(result.entry!.created_at)
          ),
        ),
      ]
      await updateState({ diaryEntries: nextEntries })
      setSelectedDate(dateKey(result.entry.created_at))
      setMessage('오늘의 마음을 다이어리에 담았어요.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '다이어리를 만들지 못했어요.')
    } finally {
      setIsGenerating(false)
    }
  }

  function shiftMonth(delta: number) {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1))
  }

  function toggleWifeCard(card: Exclude<ExpandedWifeCard, null>) {
    setExpandedWifeCard((current) => current === card ? null : card)
    if (
      card === 'care'
      && expandedWifeCard !== 'care'
      && state.pregnancyStatus === 'pregnant'
      && !morningBriefing
    ) {
      void loadMorningBriefing()
    }
  }

  function toggleHusbandCard(card: Exclude<ExpandedHusbandCard, null>) {
    setExpandedHusbandCard((current) => current === card ? null : card)
  }

  function handleUltrasoundSaved(result: UltrasoundAnalyzeResponse) {
    setCurrentUltrasoundResult(result)

    const growthRun = buildUltrasoundGrowthModeRun({
      id: result.recordId ? `ultrasound-${result.recordId}` : undefined,
      pregnancyWeek: result.pregnancyWeek ?? state.pregnancyWeek,
      babyName: '아기',
    })
    saveUltrasoundGrowthCareLocally(growthRun)

    if (result.savedToDb) {
      void fetchUltrasoundRecords()
      setMessage('초음파 사진을 분석하고 성장 기록에 저장했어요.')
      return
    }

    const storedCard = buildStoredCardFromAnalyzeResponse(result, {
      babyName: '아기',
      pregnancyWeek: state.pregnancyWeek,
    })
    saveUltrasoundCardToLocalStorage(storedCard)
    setSavedUltrasoundCards((current) => [
      storedCard,
      ...current.filter((card) => card.id !== storedCard.id),
    ])
    setMessage('초음파 사진을 분석하고 이 기기의 성장 기록에 저장했어요.')
  }

  return (
    <main className="min-h-dvh max-w-[100vw] overflow-x-hidden bg-[#f7f5f2] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-[#202124]">
      <div className="mx-auto w-full max-w-[min(430px,calc(100vw-2rem))]">
        {activeTab === 'home' ? (
          <>
        <header className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#8d756d]">THINQ MOM</p>
              <h1 className="mt-1 text-3xl font-bold">사용자 홈</h1>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={simulationUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#202124] px-3 py-2 text-xs font-semibold text-white shadow-sm"
              >
                3D-시뮬레이터
              </a>
              <Link href="/hub" className="rounded-full bg-white px-3 py-2 text-xs font-semibold shadow-sm">
                허브
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/80 p-2 shadow-sm">
            <CompactToggle
              label="상태"
              options={[
                ['preparing', '임신 준비중'],
                ['pregnant', '임신중'],
              ]}
              value={state.pregnancyStatus}
              onChange={(value) => void updateState({ pregnancyStatus: value as DemoPregnancyStatus })}
            />
            <CompactToggle
              label="역할"
              options={[
                ['wife', '아내'],
                ['husband', '남편'],
              ]}
              value={state.role}
              onChange={(value) => void updateState({ role: value as DemoRole })}
            />
          </div>
        </header>

        {state.role === 'wife' ? (
          <div className="space-y-3">
            <ExpandableFeatureCard
              title={state.pregnancyStatus === 'pregnant' ? 'AI 추천 케어' : '준비 케어'}
              summary={state.pregnancyStatus === 'pregnant'
                ? careCardSummary
                : '수면·식사·스트레스 리듬 점검'}
              expanded={expandedWifeCard === 'care'}
              onToggle={() => toggleWifeCard('care')}
            >
              {state.pregnancyStatus === 'pregnant' ? (
                <>
                  <p className="text-xs font-semibold text-[#a14f62]">오늘의 굿모닝 브리핑</p>
                  <h2 className="mt-2 text-lg font-bold leading-7">
                    허브가 오늘의 컨디션을 음성으로 정리했어요
                  </h2>
                  <div className="mt-4 rounded-2xl bg-[#f7f5f2] p-4">
                    {isBriefingLoading && !morningBriefing ? (
                      <p className="text-sm text-gray-500">오늘의 브리핑을 준비하고 있어요...</p>
                    ) : morningBriefing ? (
                      <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
                        {morningBriefing}
                      </p>
                    ) : (
                      <p className="text-sm leading-6 text-gray-500">
                        굿모닝 브리핑을 불러오지 못했어요. 아래 버튼으로 다시 준비할 수 있어요.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => morningBriefingAudio
                      ? void playMorningBriefing()
                      : void loadMorningBriefing(true)}
                    disabled={isBriefingLoading || isBriefingPlaying}
                    className="mt-4 min-h-12 w-full rounded-2xl bg-[#a14f62] px-4 font-semibold text-white disabled:opacity-60"
                  >
                    {isBriefingLoading
                      ? '브리핑 준비 중...'
                      : isBriefingPlaying
                        ? '브리핑 재생 중...'
                        : morningBriefingAudio
                          ? '오늘의 브리핑 듣기'
                          : '굿모닝 브리핑 다시 받기'}
                  </button>
                  <p className="mt-3 text-xs leading-5 text-gray-400">
                    허브에서 “굿모닝”이라고 말했을 때 들려주는 것과 같은 브리핑이에요.
                  </p>
                </>
              ) : (
                <PreparingCareDetail />
              )}
            </ExpandableFeatureCard>

            <ExpandableFeatureCard
              title={state.pregnancyStatus === 'pregnant' ? '초음파 사진 분석' : '우리집 컨디션'}
              summary={state.pregnancyStatus === 'pregnant'
                ? ultrasoundCardSummary
                : '공기·온도·조명 환경 점검'}
              collapsedPreview={state.pregnancyStatus === 'pregnant' ? (
                <UltrasoundCollapsedPreview
                  ultrasoundUrl={ultrasoundPreviewUrl}
                  fruitName={ultrasoundFruit.fruitName}
                  fruitWeek={ultrasoundFruit.week}
                />
              ) : undefined}
              expanded={expandedWifeCard === 'ultrasound'}
              onToggle={() => toggleWifeCard('ultrasound')}
            >
              {state.pregnancyStatus === 'pregnant' ? (
                <div className="[&>section]:border-0 [&>section]:bg-transparent [&>section]:p-0 [&>section]:shadow-none">
                  <UltrasoundMemoryCardSection
                    currentResult={currentUltrasoundResult}
                    savedCards={savedUltrasoundCards}
                    isLoading={isUltrasoundLoading}
                    babyName="아기"
                    onUploadClick={() => setShowUltrasoundUploadModal(true)}
                    onExpandGallery={() => setShowUltrasoundGallery(true)}
                  />
                </div>
              ) : (
                <HomeConditionDetail />
              )}
            </ExpandableFeatureCard>
          </div>
        ) : (
          <div className="space-y-3">
            <ExpandableFeatureCard
              title={state.pregnancyStatus === 'pregnant' ? '오늘 아내 컨디션' : '함께 맞출 생활 리듬'}
              summary={state.pregnancyStatus === 'pregnant'
                ? latestDiaryGuide ? '최근 기록을 바탕으로 정리했어요' : '편안한 휴식이 필요한 날'
                : '둘이 함께 실천할 준비 루틴'}
              expanded={expandedHusbandCard === 'condition'}
              onToggle={() => toggleHusbandCard('condition')}
            >
              {state.pregnancyStatus === 'pregnant' ? (
                <>
                  <p className="text-xs font-semibold text-[#a14f62]">오늘의 컨디션 요약</p>
                  <h2 className="mt-2 text-lg font-bold leading-7">{husbandCondition}</h2>
                  <div className="mt-4 rounded-2xl bg-[#f7f5f2] p-4">
                    <p className="text-sm leading-6 text-gray-700">
                      {latestDiaryGuide
                        ? '아내가 남긴 최근 AI 다이어리에서 몸 상태와 휴식 신호를 정리했어요.'
                        : '아직 오늘의 기록이 없어요. 무리한 질문보다 편히 쉴 수 있는 분위기를 먼저 만들어주세요.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-[#a14f62]">오늘의 부부 준비 가이드</p>
                  <h2 className="mt-2 text-lg font-bold">이번 주에 지킬 약속을 함께 정해요</h2>
                  <ul className="mt-4 space-y-2">
                    {preparingHusbandActions.map((action) => (
                      <li key={action} className="rounded-2xl bg-[#f7f5f2] px-4 py-3 text-sm text-gray-700">
                        {action}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-5 text-gray-400">
                    모두 한 번에 바꾸기보다 오늘 한 가지를 골라 둘의 일정에 넣어보세요.
                  </p>
                </>
              )}
            </ExpandableFeatureCard>

            <ExpandableFeatureCard
              title={state.pregnancyStatus === 'pregnant' ? '내가 도와줄 수 있는 일' : '우리집 컨디션'}
              summary={state.pregnancyStatus === 'pregnant' ? '오늘 바로 할 수 있는 작은 행동' : '공기·온도·조명 환경 점검'}
              expanded={expandedHusbandCard === 'actions'}
              onToggle={() => toggleHusbandCard('actions')}
            >
              {state.pregnancyStatus === 'pregnant' ? (
                <>
                  <p className="text-xs font-semibold text-[#a14f62]">오늘의 케어 가이드</p>
                  <h2 className="mt-2 text-lg font-bold">편안한 하루를 함께 만들어요</h2>
                  <ul className="mt-4 space-y-2">
                    {husbandActions.map((action) => (
                      <li key={action} className="rounded-2xl bg-[#f7f5f2] px-4 py-3 text-sm text-gray-700">
                        {action}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-5 text-gray-400">
                    자주 상태를 묻기보다 필요한 일을 먼저 정리해주는 편이 도움이 될 수 있어요.
                  </p>
                </>
              ) : (
                <HomeConditionDetail />
              )}
            </ExpandableFeatureCard>

          </div>
        )}

        <section className={`relative mt-3 rounded-[26px] border border-[#ece8e4] bg-white p-5 shadow-[0_8px_24px_rgba(44,36,32,0.05)] ${
          (state.role === 'wife' && expandedWifeCard !== 'diary')
          || (state.role === 'husband' && expandedHusbandCard !== 'calendar')
            ? 'min-h-[92px]'
            : ''
        }`}>
          <div className="flex items-start justify-between gap-12">
            <div>
              <p className="text-base font-bold text-[#202124]">
                {state.pregnancyStatus === 'pregnant'
                  ? state.role === 'wife' ? 'AI 다이어리' : '가족 케어 캘린더'
                  : state.role === 'wife' ? '준비 마음 기록' : '부부 준비 캘린더'}
              </p>
              {state.role === 'wife' && expandedWifeCard !== 'diary' && (
                <p className="mt-1 text-xs text-gray-400">
                  {state.pregnancyStatus === 'pregnant'
                    ? diaryCardSummary
                    : '몸과 마음, 생활 루틴 기록'}
                </p>
              )}
              {state.role === 'husband' && expandedHusbandCard !== 'calendar' && (
                <p className="mt-1 text-xs text-gray-400">
                  {state.pregnancyStatus === 'pregnant'
                    ? '아내의 기록을 가족 케어로 확인'
                    : '함께 준비할 일정과 생활 기록'}
                </p>
              )}
              {((state.role === 'wife' && expandedWifeCard === 'diary')
                || (state.role === 'husband' && expandedHusbandCard === 'calendar')) && (
                <h2 className="mt-1 text-xl font-bold">{viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월</h2>
              )}
            </div>
            {state.role === 'wife' && (
              <ExpandIconButton
                onClick={() => toggleWifeCard('diary')}
                label={expandedWifeCard === 'diary'
                  ? `${state.pregnancyStatus === 'pregnant' ? 'AI 다이어리' : '준비 마음 기록'} 접기`
                  : `${state.pregnancyStatus === 'pregnant' ? 'AI 다이어리' : '준비 마음 기록'} 확대`}
              />
            )}
            {state.role === 'husband' && (
              <ExpandIconButton
                onClick={() => toggleHusbandCard('calendar')}
                label={expandedHusbandCard === 'calendar'
                  ? `${state.pregnancyStatus === 'pregnant' ? '가족 케어 캘린더' : '부부 준비 캘린더'} 접기`
                  : `${state.pregnancyStatus === 'pregnant' ? '가족 케어 캘린더' : '부부 준비 캘린더'} 확대`}
              />
            )}
          </div>

          {((state.role === 'wife' && expandedWifeCard === 'diary')
            || (state.role === 'husband' && expandedHusbandCard === 'calendar')) && (
            <>
          {state.role === 'wife' && (
            <button
              type="button"
              onClick={() => void generateDiary()}
              disabled={isGenerating}
              className="mt-4 min-h-10 rounded-full bg-[#f3e5e8] px-4 text-xs font-semibold text-[#8b4253] disabled:opacity-60"
            >
              {isGenerating
                ? '작성 중...'
                : state.pregnancyStatus === 'pregnant' ? '다이어리 작성하기' : '준비 기록 작성하기'}
            </button>
          )}
          {state.pregnancyStatus === 'pregnant' && (
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f7f5f2] px-3 py-2.5">
              <div>
                <p className="text-[11px] font-semibold text-gray-500">임신 주차 기준 자동 일정</p>
                <p className="mt-0.5 text-sm font-bold text-gray-900">{state.pregnancyWeek}주차</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void updateState({
                    pregnancyWeek: Math.max(1, state.pregnancyWeek - 1),
                  })}
                  className="h-9 w-9 rounded-full bg-white text-lg text-gray-600 shadow-sm"
                  aria-label="임신 주차 줄이기"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => void updateState({
                    pregnancyWeek: Math.min(42, state.pregnancyWeek + 1),
                  })}
                  className="h-9 w-9 rounded-full bg-white text-lg text-gray-600 shadow-sm"
                  aria-label="임신 주차 늘리기"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-gray-500">
            <CalendarLegend
              color="bg-[#a14f62]"
              label={state.pregnancyStatus === 'pregnant' ? 'AI 다이어리' : '준비 기록'}
            />
            {state.pregnancyStatus === 'pregnant' && (
              <>
                <CalendarLegend color="bg-blue-500" label="검사" />
                <CalendarLegend color="bg-emerald-500" label="신청" />
                <CalendarLegend color="bg-amber-500" label="준비" />
              </>
            )}
          </div>

          <div className="relative mt-4">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="absolute left-0 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full bg-[#f7f5f2]"
              aria-label="이전 달"
            >
              ‹
            </button>
            <div className="grid grid-cols-7 gap-1 px-10 text-center text-[11px] text-gray-400">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <span key={day} className="flex h-9 items-center justify-center">{day}</span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="absolute right-0 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full bg-[#f7f5f2]"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 px-10">
            {cells.map((cell, index) => {
              if (!cell) return <div key={`empty-${index}`} className="aspect-square" />

              const dayEvents = eventsByDate.get(cell.key) ?? []
              const hasDiary = entriesByDate.has(cell.key)
              const isSelected = selectedDate === cell.key

              return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDate(cell.key)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs ${
                  isSelected
                    ? 'bg-[#34373d] text-white'
                    : hasDiary
                      ? 'bg-[#f8eaed] font-semibold text-[#a14f62]'
                      : dayEvents.length > 0
                        ? 'bg-slate-50 font-semibold text-gray-800'
                        : 'text-gray-600'
                }`}
              >
                {cell.day}
                {(hasDiary || dayEvents.length > 0) && (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {hasDiary && <span className="h-1 w-1 rounded-full bg-[#a14f62]" />}
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={`h-1 w-1 rounded-full ${EVENT_DOT_STYLES[event.kind]}`}
                      />
                    ))}
                  </span>
                )}
              </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-2xl bg-[#f7f5f2] p-4">
            {state.role === 'wife' ? (
              selectedEntry ? (
                <>
                  <h3 className="font-bold">{selectedEntry.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{selectedEntry.content}</p>
                </>
              ) : <p className="text-sm leading-6 text-gray-500">
                {state.pregnancyStatus === 'pregnant'
                  ? '기록된 날짜를 누르면 그날의 마음을 볼 수 있어요.'
                  : '기록된 날짜를 누르면 컨디션과 준비 루틴을 볼 수 있어요.'}
              </p>
            ) : guide ? (
              <>
                <h3 className="font-bold">
                  {state.pregnancyStatus === 'pregnant' ? '오늘의 가족 케어 기록' : '오늘의 부부 준비 기록'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {state.pregnancyStatus === 'pregnant'
                    ? guide.summary
                    : '오늘은 생활 리듬과 마음의 여유를 함께 맞춰본 날이에요.'}
                </p>
                <p className="mt-4 text-sm font-semibold">
                  {state.pregnancyStatus === 'pregnant' ? '오늘 남편이 도와줄 수 있는 일' : '함께 이어갈 준비 루틴'}
                </p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-gray-700">
                  {(state.pregnancyStatus === 'pregnant' ? guide.actions : preparingHusbandActions.slice(0, 3))
                    .map((action) => <li key={action}>• {action}</li>)}
                </ul>
                <p className="mt-4 text-sm font-semibold">오늘의 한마디</p>
                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {state.pregnancyStatus === 'pregnant'
                    ? guide.note
                    : '서두르기보다 둘이 편안하게 지속할 수 있는 리듬을 찾는 게 중요한 날이에요.'}
                </p>
              </>
            ) : <p className="text-sm leading-6 text-gray-500">
              {state.pregnancyStatus === 'pregnant'
                ? '아내가 다이어리를 작성한 날짜에 가족 케어 가이드가 표시돼요.'
                : '준비 기록이 작성된 날짜에 함께 실천할 생활 가이드가 표시돼요.'}
            </p>}

            {selectedEvents.length > 0 && (
              <div className={`${selectedEntry || guide ? 'mt-4 border-t border-gray-200 pt-4' : ''} space-y-3`}>
                {selectedEvents.map((event) => (
                  <article key={event.id} className="rounded-2xl bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${EVENT_KIND_STYLES[event.kind]}`}>
                        {event.week}주 · {EVENT_KIND_LABELS[event.kind]}
                      </span>
                      <span className="text-[10px] text-gray-400">AI 자동 일정</span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-gray-900">{event.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{event.description}</p>
                    <p className="mt-2 text-xs font-semibold text-gray-700">체크: {event.action}</p>
                  </article>
                ))}
              </div>
            )}

            {!selectedEntry && !guide && selectedEvents.length === 0 && (
              <p className="mt-3 text-xs leading-5 text-gray-400">
                검사 시기와 지원 조건은 병원·지역·개인 상황에 따라 달라질 수 있어요.
              </p>
            )}
          </div>

          {state.pregnancyStatus === 'pregnant' && (
            <p className="mt-3 text-[11px] leading-5 text-gray-400">
              자동 일정은 시연용 안내예요. 실제 검사와 접종 시기는 담당 의료진에게 확인해주세요.
            </p>
          )}
            </>
          )}

        </section>

        {message && <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">{message}</p>}
          </>
        ) : (
          <MobileSecondaryTab
            tab={activeTab}
            state={state}
            routineLabel={routineLabel}
          />
        )}
      </div>

      <MobileBottomNavigation activeTab={activeTab} onChange={setActiveTab} />

      <UltrasoundUploadModal
        open={showUltrasoundUploadModal}
        onClose={() => setShowUltrasoundUploadModal(false)}
        pregnancyWeek={state.pregnancyStatus === 'pregnant' ? state.pregnancyWeek : null}
        babyName="아기"
        onSaved={handleUltrasoundSaved}
      />

      {showUltrasoundGallery && (
        <div
          className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
          onClick={() => {
            setShowUltrasoundGallery(false)
            setSelectedUltrasoundCard(null)
          }}
        >
          <div
            className="mx-3 mb-3 flex max-h-[88vh] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl sm:mb-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">초음파 성장 갤러리</h2>
                <p className="mt-0.5 text-xs text-gray-400">저장한 기록과 참고 예시</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUltrasoundGallery(false)
                  setSelectedUltrasoundCard(null)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                aria-label="초음파 성장 갤러리 닫기"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {selectedUltrasoundCard ? (
                <StoredUltrasoundDetail
                  card={selectedUltrasoundCard}
                  onBack={() => setSelectedUltrasoundCard(null)}
                />
              ) : (
                <>
                  {savedUltrasoundCards.length === 0 && (
                    <div className="mb-4 rounded-2xl bg-[#f7f5f2] px-4 py-5 text-center">
                      <p className="text-sm font-semibold text-gray-700">아직 저장한 기록이 없어요</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUltrasoundGallery(false)
                          setShowUltrasoundUploadModal(true)
                        }}
                        className="mt-3 rounded-full bg-[#a14f62] px-4 py-2 text-xs font-semibold text-white"
                      >
                        초음파 사진 업로드
                      </button>
                    </div>
                  )}
                  <UltrasoundGrowthGalleryView
                    demoCards={buildDemoGalleryCards('아기')}
                    savedCards={savedUltrasoundCards}
                    onSelectSaved={setSelectedUltrasoundCard}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function CalendarLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function MobileSecondaryTab({
  tab,
  state,
  routineLabel,
}: {
  tab: Exclude<MobileTab, 'home'>
  state: SharedDemoState
  routineLabel: string | null
}) {
  const roleLabel = state.role === 'wife' ? '아내' : '남편'
  const statusLabel = state.pregnancyStatus === 'pregnant' ? '임신중' : '임신 준비중'

  if (tab === 'devices') {
    return (
      <>
        <MobileTabHeader title="디바이스" subtitle="가전이 지금 어떻게 작동하는지 확인해요" />
        <DeviceStatusDashboard
          pregnancyStatus={state.pregnancyStatus}
          routine={state.currentRoutine}
          simulationRoutine={state.simulationRoutine}
          preparationMode={state.preparationMode}
          careState={state.careState}
        />
      </>
    )
  }

  if (tab === 'care') {
    return (
      <>
        <MobileTabHeader title="케어" subtitle={`${statusLabel} ${roleLabel} 맞춤 케어`} />
        <section className="rounded-[26px] border border-[#ece8e4] bg-white p-5 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
          <p className="text-xs font-semibold text-[#a14f62]">현재 케어</p>
          <h2 className="mt-2 text-xl font-bold">
            {routineLabel ?? '아직 실행된 케어가 없어요'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {routineLabel
              ? '허브와 연결 기기가 현재 루틴에 맞춰 환경을 조정하고 있어요.'
              : '홈이나 허브에서 AI 케어를 실행하면 이곳에서 진행 상태를 확인할 수 있어요.'}
          </p>
          <div className="mt-4 rounded-2xl bg-[#f7f5f2] px-4 py-3 text-sm text-gray-600">
            상태: {state.careState === 'processing'
              ? '케어 준비 중'
              : state.careState === 'completed'
                ? '케어 실행 완료'
                : '대기 중'}
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <MobileTabHeader title="메뉴" subtitle="사용자 설정과 시연 화면" />
      <div className="space-y-3">
        <section className="rounded-[26px] border border-[#ece8e4] bg-white p-5 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
          <p className="text-xs font-semibold text-[#a14f62]">현재 사용자</p>
          <h2 className="mt-2 text-lg font-bold">{statusLabel} · {roleLabel}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {state.pregnancyStatus === 'pregnant' ? `임신 ${state.pregnancyWeek}주차` : '생활 리듬을 준비하는 중'}
          </p>
        </section>
        <Link
          href="/hub"
          className="flex min-h-16 items-center justify-between rounded-[22px] border border-[#ece8e4] bg-white px-5 font-semibold shadow-[0_8px_24px_rgba(44,36,32,0.05)]"
        >
          ThinQ ON 허브
          <span className="text-gray-300">›</span>
        </Link>
        <Link
          href="/simulation-3d/index.html"
          className="flex min-h-16 items-center justify-between rounded-[22px] border border-[#ece8e4] bg-white px-5 font-semibold shadow-[0_8px_24px_rgba(44,36,32,0.05)]"
        >
          3D 홈 시뮬레이터
          <span className="text-gray-300">›</span>
        </Link>
      </div>
    </>
  )
}

function MobileTabHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-5">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#8d756d]">THINQ MOM</p>
      <h1 className="mt-1 text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
    </header>
  )
}

function MobileBottomNavigation({
  activeTab,
  onChange,
}: {
  activeTab: MobileTab
  onChange: (tab: MobileTab) => void
}) {
  const tabs: Array<{ id: MobileTab; label: string }> = [
    { id: 'home', label: '홈' },
    { id: 'devices', label: '디바이스' },
    { id: 'care', label: '케어' },
    { id: 'menu', label: '메뉴' },
  ]

  return (
    <nav
      className="border-t border-[#ded8d3] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(44,36,32,0.12)]"
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
        className="mx-auto grid h-[76px] grid-cols-4 bg-white px-2"
        style={{
          width: '100%',
          maxWidth: 'min(430px, 100vw)',
          boxSizing: 'border-box',
        }}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                active ? 'text-[#9a4b5e]' : 'text-gray-400'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                active ? 'bg-[#f3e5e8]' : ''
              }`}>
                <MobileTabIcon tab={tab.id} />
              </span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
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
  if (tab === 'devices') {
    return <svg {...commonProps}><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 7h6M10 17h4" /></svg>
  }
  if (tab === 'care') {
    return <svg {...commonProps}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
  }
  return <svg {...commonProps}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
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
  return (
    <div>
      <p className="px-1 pb-1 text-[10px] font-semibold text-gray-400">{label}</p>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#f3f1ee] p-1">
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`min-h-8 rounded-lg px-1 text-[11px] font-semibold transition ${value === key ? 'bg-white text-[#8b4253] shadow-sm' : 'text-gray-500'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function ExpandableFeatureCard({
  title,
  summary,
  collapsedPreview,
  expanded,
  onToggle,
  children,
}: {
  title: string
  summary: string
  collapsedPreview?: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="relative min-h-[92px] rounded-[26px] border border-[#ece8e4] bg-white p-5 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
      <div className="pr-12">
        <h2 className="text-base font-bold text-[#202124]">{title}</h2>
        {!expanded && (
          <>
            <p className="mt-1 line-clamp-1 text-xs text-gray-500">{summary}</p>
            {collapsedPreview}
          </>
        )}
      </div>
      {expanded && (
        <div className="mt-4 text-[#202124]">
          {children}
        </div>
      )}
      <div className="absolute right-3 top-3">
        <ExpandIconButton
          onClick={onToggle}
          label={expanded ? `${title} 접기` : `${title} 확대`}
        />
      </div>
    </section>
  )
}

const FRUIT_SPRITE_WEEKS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38]

function UltrasoundCollapsedPreview({
  ultrasoundUrl,
  fruitName,
  fruitWeek,
}: {
  ultrasoundUrl: string
  fruitName: string
  fruitWeek: number
}) {
  const fruitIndex = Math.max(0, FRUIT_SPRITE_WEEKS.indexOf(fruitWeek))
  const column = fruitIndex % 4
  const row = Math.floor(fruitIndex / 4)

  return (
    <div className="mt-3 flex items-center gap-2.5">
      <div className="h-14 w-[72px] overflow-hidden rounded-xl bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ultrasoundUrl}
          alt="최근 아기 초음파"
          className="h-full w-full object-cover"
        />
      </div>
      <div
        role="img"
        aria-label={`${fruitName} 성장 비유`}
        className="h-14 w-[72px] rounded-xl bg-white bg-no-repeat shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
        style={{
          backgroundImage: "url('/images/pregnancy-fruit-sprite.png')",
          backgroundPosition: `${column * 33.333}% ${row * 33.333}%`,
          backgroundSize: '400% 400%',
        }}
      />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-[#a14f62]">오늘의 성장 비유</p>
        <p className="mt-0.5 text-xs font-bold text-gray-800">{fruitName}</p>
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
        <div className="overflow-hidden rounded-2xl bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.imageUrl} alt={card.title} className="max-h-72 w-full object-contain" />
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
