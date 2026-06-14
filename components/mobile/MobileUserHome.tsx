'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DiaryCalendarModal from '@/components/diary/DiaryCalendarModal'
import UltrasoundUploadModal from '@/components/ultrasound/UltrasoundUploadModal'
import DeviceStatusDashboard from '@/components/mobile/DeviceStatusDashboard'
import PregnancyFruitImage from '@/components/ultrasound/PregnancyFruitImage'
import {
  DEMO_DIARY_CALENDAR_ENTRIES,
  HUSBAND_DEMO_DIARY_CALENDAR_ENTRIES,
} from '@/lib/diary-demo'
import type { DiaryCalendarEntry } from '@/lib/diary-calendar-types'
import { PREPARING_DIARY_DEMO_ENTRIES } from '@/lib/preparing-diary-demo'
import { DEMO_WIFE_ID, supabase, type DiaryEntry, type UltrasoundRecord } from '@/lib/supabase'
import {
  DEFAULT_SHARED_DEMO_STATE,
  normalizeDiaryEntries,
  type DemoPregnancyStatus,
  type DemoRole,
  type SharedDemoState,
} from '@/lib/shared-demo-state'
import {
  buildUltrasoundGrowthModeRun,
  saveUltrasoundGrowthCareLocally,
} from '@/lib/ultrasound-care-bridge'
import {
  buildStoredCardFromAnalyzeResponse,
  mergeLocalOnlyCards,
  readUltrasoundCardsFromLocalStorage,
  saveUltrasoundCardToLocalStorage,
} from '@/lib/ultrasound-storage'
import type { UltrasoundAnalyzeResponse, UltrasoundStoredCard } from '@/lib/ultrasound-types'
import { ULTRASOUND_MAIN_DEMO_HINT } from '@/lib/ultrasound-demo'
import { getPregnancyFruit } from '@/lib/pregnancy-fruit'
import {
  buildPregnancyCalendarEvents,
  buildPreparingCalendarEvents,
} from '@/lib/pregnancy-calendar'

const LOCAL_STATE_KEY = 'thinq-mom-shared-demo-state'
const POLL_INTERVAL_MS = 2500

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

type MobileTab = 'home' | 'devices'

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

    const parsed = JSON.parse(raw) as Partial<SharedDemoState>
    return {
      ...DEFAULT_SHARED_DEMO_STATE,
      ...parsed,
      diaryEntries: normalizeDiaryEntries(parsed.diaryEntries),
    }
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

export default function MobileUserHome() {
  const [state, setState] = useState<SharedDemoState>(DEFAULT_SHARED_DEMO_STATE)
  const [activeTab, setActiveTab] = useState<MobileTab>('home')
  const [showUltrasoundUploadModal, setShowUltrasoundUploadModal] = useState(false)
  const [showUltrasoundGallery, setShowUltrasoundGallery] = useState(false)
  const [selectedUltrasoundCard, setSelectedUltrasoundCard] =
    useState<UltrasoundStoredCard | null>(null)
  const [currentUltrasoundResult, setCurrentUltrasoundResult] =
    useState<UltrasoundAnalyzeResponse | null>(null)
  const [savedUltrasoundCards, setSavedUltrasoundCards] = useState<UltrasoundStoredCard[]>([])
  const [, setIsUltrasoundLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDiaryCalendar, setShowDiaryCalendar] = useState(false)
  const [showUltrasoundDetail, setShowUltrasoundDetail] = useState(false)
  const [message, setMessage] = useState('')

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
      const payload = (await response.json()) as { state?: SharedDemoState }
      if (payload.state) {
        setState(payload.state)
        persistLocalState(payload.state)
      }
    } catch {
      setMessage('이 기기에는 저장했어요. 배포 환경의 Supabase 설정을 확인해주세요.')
    }
  }, [state])

  const changePregnancyStatus = useCallback((pregnancyStatus: DemoPregnancyStatus) => {
    void updateState({
      pregnancyStatus,
      currentRoutine: null,
      simulationRoutine: null,
      latestHubInput: null,
      latestCareModeLabel: null,
      preparationMode: 'condition',
      careState: 'idle',
    })
  }, [updateState])

  const changeRole = useCallback((role: DemoRole) => {
    void updateState({
      role,
      currentRoutine: null,
      simulationRoutine: null,
      latestHubInput: null,
      latestCareModeLabel: null,
      preparationMode: 'condition',
      careState: 'idle',
    })
  }, [updateState])

  const changePregnancyWeek = useCallback((pregnancyWeek: number) => {
    void updateState({
      pregnancyWeek,
      careState: 'idle',
    })
    setMessage(`${pregnancyWeek}주차 기준으로 성장 정보와 AI 다이어리를 업데이트했어요.`)
  }, [updateState])

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch('/api/demo-state', { cache: 'no-store' })
      if (!response.ok) throw new Error('shared state fetch failed')
      const payload = (await response.json()) as { state?: SharedDemoState }
      if (payload.state) {
        setState(payload.state)
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

  const todayDiaryEntry = visibleDiaryEntries[0] ?? null
  const diaryCalendarEntries = useMemo(() => {
    const storedEntries: DiaryCalendarEntry[] = visibleDiaryEntries.map((entry) => ({
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
    const demoEntries = state.pregnancyStatus === 'preparing'
      ? PREPARING_DIARY_DEMO_ENTRIES
      : state.role === 'husband'
        ? HUSBAND_DEMO_DIARY_CALENDAR_ENTRIES
        : DEMO_DIARY_CALENDAR_ENTRIES
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
  }, [state.pregnancyStatus, state.pregnancyWeek, state.role, visibleDiaryEntries])
  const latestUltrasoundCard = savedUltrasoundCards[0] ?? null
  const ultrasoundFeedCards = MOBILE_ULTRASOUND_DEMO_RECORDS
    .toSorted((a, b) => b.pregnancyWeek - a.pregnancyWeek)
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
  const diaryCardSummary = oneLineSummary(
    todayDiaryEntry?.summary ?? todayDiaryEntry?.content ?? '',
    '오늘의 몸 상태와 마음을 한 줄 기록으로 정리했어요.',
  )
  const simulationUrl = '/simulation-3d/index.html'
  const hubUrl = `/hub?${new URLSearchParams({
    status: state.pregnancyStatus,
    role: state.role,
    weeks: String(state.pregnancyWeek),
    prepMode: state.preparationMode,
  }).toString()}`
  const statusLabel = state.pregnancyStatus === 'preparing' ? '임신 준비중' : '임신중'
  const roleLabel = state.role === 'wife' ? '아내' : '남편'
  const homeMessage = state.pregnancyStatus === 'preparing'
    ? state.role === 'wife'
      ? '오늘의 컨디션과 마음 상태를 바탕으로 임신 준비 루틴을 도와드릴게요.'
      : '함께 준비하는 시간을 놓치지 않도록 배우자의 컨디션과 생활 루틴을 함께 살펴요.'
    : state.role === 'wife'
      ? '오늘의 몸 상태와 아기 기록을 바탕으로 맞춤 케어를 준비했어요.'
      : '배우자의 컨디션 변화와 오늘 실행된 케어를 한눈에 확인할 수 있어요.'
  const currentCareLabel = state.pregnancyStatus === 'preparing'
    ? {
        condition: '컨디션 밸런스',
        'sleep-rhythm': '수면 리듬',
        refresh: '마음 환기',
        'rest-ready': '휴식 준비',
        'couple-routine': '둘의 저녁',
      }[state.preparationMode]
    : {
        NAUSEA_MODE: '입덧 완화 케어',
        SLEEP_MODE: '수면 안정 케어',
        HOUSEWORK_MODE: '가사 부담 완화 케어',
        TRAVEL_MODE: '휴식·기분전환 케어',
        AIR_ON: '공기 케어',
        AIR_OFF: '공기청정기 정지',
      }[state.currentRoutine ?? ''] ?? '허브 대기 중'
  const careFlowSteps = [
    ['1', `${statusLabel} · ${roleLabel}`],
    ['2', '허브에 말하기'],
    ['3', '3D 기기 반영'],
  ]

  async function generateDiary() {
    setIsGenerating(true)
    setMessage('')
    try {
      const response = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregnancyWeek: state.pregnancyStatus === 'pregnant' ? state.pregnancyWeek : null,
          pregnancyStatus: state.pregnancyStatus,
          role: state.role,
        }),
      })
      const result = (await response.json()) as { success?: boolean; entry?: DiaryEntry; error?: string }
      if (!response.ok || !result.entry) throw new Error(result.error ?? '다이어리를 만들지 못했어요.')

      const nextEntries = [
        result.entry,
        ...state.diaryEntries.filter((entry) => {
          const context = getDiaryContext(entry)
          const sameContext = context.pregnancyStatus === state.pregnancyStatus
            && context.role === state.role
          const samePregnancyWeek = state.pregnancyStatus === 'preparing'
            || entry.pregnancy_week === state.pregnancyWeek
          return !(
            sameContext
            && samePregnancyWeek
            && dateKey(entry.created_at) === dateKey(result.entry!.created_at)
          )
        }),
      ]
      await updateState({ diaryEntries: nextEntries })
      setMessage(state.role === 'husband'
        ? '오늘의 배우자 케어 기록을 다이어리에 담았어요.'
        : '오늘의 마음을 다이어리에 담았어요.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '다이어리를 만들지 못했어요.')
    } finally {
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
                className="rounded-full bg-[#202124] px-3 py-2 text-xs font-semibold text-white shadow-sm"
              >
                3D-시뮬레이터
              </a>
              <Link href={hubUrl} className="rounded-full bg-white px-3 py-2 text-xs font-semibold shadow-sm">
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
              onChange={(value) => changePregnancyStatus(value as DemoPregnancyStatus)}
            />
            <CompactToggle
              label="역할"
              options={[
                ['wife', '아내'],
                ['husband', '남편'],
              ]}
              value={state.role}
              onChange={(value) => changeRole(value as DemoRole)}
            />
          </div>
        </header>

        <section className="rounded-[28px] bg-gradient-to-br from-[#8f5363] to-[#654550] p-5 text-white shadow-[0_16px_40px_rgba(111,65,79,0.2)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-white/65">현재 시연 프로필</p>
              <h2 className="mt-1 text-xl font-bold">{statusLabel} · {roleLabel}</h2>
            </div>
            {state.pregnancyStatus === 'pregnant' && (
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                {state.pregnancyWeek}주차
              </span>
            )}
          </div>
          <p className="mt-4 text-sm leading-6 text-white/85">{homeMessage}</p>
        </section>

        <section className="mt-3 rounded-[28px] border border-[#ece8e4] bg-white p-5 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#a14f62]">오늘의 케어 흐름</p>
              <h2 className="mt-1 text-lg font-bold">{currentCareLabel}</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              state.careState === 'processing'
                ? 'bg-amber-100 text-amber-700'
                : state.careState === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
            }`}>
              {state.careState === 'processing' ? '전환 중' : state.careState === 'completed' ? '적용 완료' : '대기 중'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {careFlowSteps.map(([step, label]) => (
              <div key={step} className="rounded-2xl bg-[#f7f5f2] px-2 py-3">
                <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#f3e5e8] text-[11px] font-bold text-[#9a4b5e]">
                  {step}
                </span>
                <p className="mt-2 text-[11px] font-semibold leading-4 text-gray-600">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            허브에서 말하면 열려 있는 3D 화면과 디바이스 탭이 같은 케어 상태로 자동 변경돼요.
          </p>
          {state.pregnancyStatus === 'pregnant' && state.role === 'wife' && (
            <div className="relative mt-4 rounded-2xl bg-[#fff8fa] p-3">
              <button
                type="button"
                onClick={() => setShowUltrasoundDetail(true)}
                className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-[#9a4b5e] transition hover:bg-white"
                aria-label="아기 성장 기록 확대해서 보기"
                title="아기 성장 기록 크게 보기"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <UltrasoundCollapsedPreview
                ultrasoundUrl={ultrasoundPreviewUrl}
                fruitName={ultrasoundFruit.fruitName}
                fruitWeek={ultrasoundFruit.week}
              />
              <p className="mt-2 pr-10 text-xs font-semibold text-[#a14f62]">아기 성장 기록</p>
            </div>
          )}
        </section>

        <section className="mt-3 rounded-[28px] border border-[#ece8e4] bg-white p-5 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold text-[#a14f62]">
              {state.pregnancyStatus === 'preparing' ? '준비 기록' : 'AI 다이어리'}
            </p>
            <button
              type="button"
              onClick={() => setShowDiaryCalendar(true)}
              className="-mr-1 -mt-1 flex h-10 w-10 items-center justify-center rounded-full text-[#9a4b5e] transition hover:bg-[#f7eef0]"
              aria-label={`${state.pregnancyStatus === 'preparing' ? '준비 기록' : 'AI 다이어리'} 캘린더 확대해서 보기`}
              title="캘린더 크게 보기"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {state.pregnancyStatus === 'pregnant' && state.role === 'wife' && (
            <div className="mt-3 rounded-2xl bg-[#fff8fa] p-3">
              <label
                htmlFor="diary-pregnancy-week"
                className="flex items-center justify-between gap-3"
              >
                <span>
                  <span className="block text-xs font-semibold text-[#8b4253]">AI 다이어리 기준 주차</span>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    선택한 주차에 맞춰 성장 정보와 기록을 작성해요.
                  </span>
                </span>
                <select
                  id="diary-pregnancy-week"
                  value={state.pregnancyWeek}
                  onChange={(event) => changePregnancyWeek(Number(event.target.value))}
                  className="min-h-10 rounded-xl border border-[#ead9dd] bg-white px-3 text-sm font-bold text-[#8b4253] outline-none focus:border-[#9a4b5e]"
                  aria-label="AI 다이어리 임신 주차 선택"
                >
                  {Array.from({ length: 42 }, (_, index) => index + 1).map((week) => (
                    <option key={week} value={week}>{week}주차</option>
                  ))}
                </select>
              </label>
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-gray-600">
                {state.pregnancyWeek}주차 아기는 {getPregnancyFruit(state.pregnancyWeek).fruitName}에 비유되는 시기예요.
                이 주차를 기준으로 최근 케어 기록과 생활 정보를 정리합니다.
              </p>
            </div>
          )}
          <h2 className="mt-1 text-lg font-bold">{todayDiaryEntry.title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">{diaryCardSummary}</p>
          <div className="mt-4 rounded-2xl bg-[#f7f5f2] p-4">
            <p className="line-clamp-5 whitespace-pre-line text-sm leading-6 text-gray-700">
              {todayDiaryEntry.content}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void generateDiary()}
            disabled={isGenerating}
            className="mt-4 min-h-11 w-full rounded-full bg-[#9a4b5e] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isGenerating
              ? '허브 대화와 기기 기록을 정리하는 중...'
              : state.pregnancyStatus === 'preparing' ? '준비 기록 작성하기' : '다이어리 작성하기'}
          </button>
          <p className="mt-3 text-center text-[11px] leading-5 text-gray-400">
            최근 허브 대화와 실행 모드, 공기청정기·스탠바이미·조명 기록을 종합해요.
          </p>
        </section>

        {state.pregnancyStatus === 'pregnant' && state.role === 'wife' && (
          <p className="mt-4 rounded-2xl bg-[#f3e5e8] px-4 py-3 text-center text-sm font-medium leading-6 text-[#8b4253] shadow-sm">
            초음파 사진과 오늘의 케어 기록이 다이어리에 저장되었어요.
          </p>
        )}
        {message && <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">{message}</p>}
          </>
        ) : (
          <MobileSecondaryTab
            state={state}
          />
        )}
      </div>

      <MobileBottomNavigation activeTab={activeTab} onChange={setActiveTab} />

      <DiaryCalendarModal
        open={showDiaryCalendar}
        onClose={() => setShowDiaryCalendar(false)}
        entries={diaryCalendarEntries}
        status={state.pregnancyStatus}
      />
      {showUltrasoundDetail && (
        <div
          className="fixed inset-0 z-[9997] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => setShowUltrasoundDetail(false)}
        >
          <div
            className="mx-3 mb-3 max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:mb-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#a14f62]">임신 {ultrasoundWeek}주차</p>
                <h2 className="mt-1 text-xl font-bold">아기 성장 기록</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUltrasoundDetail(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                aria-label="아기 성장 기록 닫기"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ultrasoundPreviewUrl} alt="최근 아기 초음파" className="max-h-72 w-full object-contain" />
            </div>
            <div className="mt-4 space-y-3 rounded-2xl bg-[#f7f5f2] p-4 text-sm leading-6 text-gray-700">
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
                className="min-h-11 rounded-full bg-[#9a4b5e] px-3 text-xs font-semibold text-white"
              >
                초음파 사진 업로드
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUltrasoundDetail(false)
                  setShowUltrasoundGallery(true)
                }}
                className="min-h-11 rounded-full bg-gray-100 px-3 text-xs font-semibold text-gray-700"
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
        pregnancyWeek={null}
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
                <p className="mt-0.5 text-xs text-gray-400">18주차부터 · 사진을 누르면 성장 기록이 열려요</p>
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
                <div className="grid grid-cols-3 gap-1">
                  {ultrasoundFeedCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedUltrasoundCard(card)}
                      className="group relative aspect-square overflow-hidden bg-gray-100"
                      aria-label={`${card.pregnancyWeek}주차 ${card.title} 상세 보기`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function MobileSecondaryTab({
  state,
}: {
  state: SharedDemoState
}) {
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
      aria-label="사용자 홈 하단 탭"
    >
      <div
        className="mx-auto grid h-[76px] grid-cols-2 bg-white px-2"
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
  return <svg {...commonProps}><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 7h6M10 17h4" /></svg>
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

const FRUIT_SPRITE_WEEKS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38]

function getGalleryPregnancyFruit(pregnancyWeek: number) {
  const galleryIndex = Math.min(
    FRUIT_SPRITE_WEEKS.length - 1,
    Math.max(0, Math.round(pregnancyWeek) - 6),
  )

  return getPregnancyFruit(FRUIT_SPRITE_WEEKS[galleryIndex])
}

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
  const fruit = getGalleryPregnancyFruit(card.pregnancyWeek)

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
              pregnancyWeek={fruit.week}
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
