'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import UltrasoundMemoryCardSection from '@/components/ultrasound/UltrasoundMemoryCardSection'
import UltrasoundUploadModal from '@/components/ultrasound/UltrasoundUploadModal'
import UltrasoundGrowthGalleryView from '@/components/ultrasound/UltrasoundGrowthGalleryView'
import ExpandIconButton from '@/components/ui/ExpandIconButton'
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
  buildStoredCardFromAnalyzeResponse,
  mergeLocalOnlyCards,
  readUltrasoundCardsFromLocalStorage,
  saveUltrasoundCardToLocalStorage,
} from '@/lib/ultrasound-storage'
import type { UltrasoundAnalyzeResponse, UltrasoundStoredCard } from '@/lib/ultrasound-types'
import { buildDemoGalleryCards } from '@/lib/ultrasound-demo'

const LOCAL_STATE_KEY = 'thinq-mom-shared-demo-state'
const POLL_INTERVAL_MS = 2500

type ExecuteResponse = {
  success?: boolean
  mode?: string
  modeLabel?: string
  reply?: string
  wifeCard?: string
  husbandCard?: string
  error?: string
}

type ExpandedWifeCard = 'care' | 'ultrasound' | 'diary' | null
type ExpandedHusbandCard = 'condition' | 'actions' | 'routine' | 'calendar' | null
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

const CARE_EXECUTION_PRESETS: Record<string, {
  routineId: string
  simulationMode: string
}> = {
  NAUSEA_MODE: { routineId: 'nausea_food', simulationMode: 'nausea' },
  SLEEP_MODE: { routineId: 'sleep_care', simulationMode: 'sleep' },
  TRAVEL_MODE: { routineId: 'destination_ocean', simulationMode: 'resort' },
  HOUSEWORK_MODE: { routineId: 'housework_care', simulationMode: 'housework' },
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

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry>()
    for (const entry of state.diaryEntries) map.set(dateKey(entry.created_at), entry)
    return map
  }, [state.diaryEntries])

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
  const latestDiaryGuide = husbandGuide(state.diaryEntries[0] ?? null)
  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth])
  const careMode = latestCareAdvice?.mode ?? state.currentRoutine ?? 'NAUSEA_MODE'
  const carePreset = CARE_EXECUTION_PRESETS[careMode] ?? CARE_EXECUTION_PRESETS.NAUSEA_MODE
  const careConversation = latestCareAdvice?.inputText
    ?? `${state.pregnancyWeek}주차의 몸 상태와 생활 리듬을 살펴봐 줘`
  const weekAdvice = state.pregnancyWeek <= 13
    ? `${state.pregnancyWeek}주차에는 컨디션 변화가 잦을 수 있어요. 부담 없는 식사와 수분을 챙기고, 피로가 오기 전에 자주 쉬어가세요.`
    : state.pregnancyWeek <= 27
      ? `${state.pregnancyWeek}주차에는 몸의 변화를 살피며 가벼운 움직임과 충분한 휴식을 균형 있게 이어가 보세요.`
      : `${state.pregnancyWeek}주차에는 무리한 일정을 줄이고, 편안한 자세와 휴식 시간을 넉넉히 확보해 보세요.`
  const careAdvice = latestCareAdvice?.advice
    ? `${latestCareAdvice.advice}\n\n${weekAdvice}`
    : weekAdvice
  const husbandCondition = latestDiaryGuide?.summary
    ?? '오늘은 컨디션 변화를 살피며 편안히 쉴 수 있는 환경이 필요해요.'
  const husbandActions = latestDiaryGuide?.actions
    ?? ['집안일을 먼저 나누어 맡기', '편하게 쉴 수 있는 공간 만들기', '필요한 것이 있는지 부드럽게 확인하기']
  const routineLabel = state.currentRoutine
    ? ROUTINE_LABELS[state.currentRoutine] ?? latestCareAdvice?.modeLabel ?? '맞춤 케어'
    : null

  async function executeCare() {
    setMessage('')
    await updateState({ careState: 'processing' })
    try {
      const response = await fetch('/api/mother-together/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: careConversation,
          source: 'example_chip_mobile',
          pregnancyStatus: state.pregnancyStatus,
          pregnancyWeek: state.pregnancyWeek,
          audience: 'wife',
          demoOverride: {
            hubMode: careMode,
            routineId: carePreset.routineId,
            simulationMode: carePreset.simulationMode,
          },
        }),
      })
      const result = (await response.json()) as ExecuteResponse
      if (!response.ok || result.success === false) {
        throw new Error(result.error ?? '케어 실행에 실패했어요.')
      }
      await updateState({
        careState: 'completed',
        currentRoutine: result.mode ?? 'NAUSEA_MODE',
      })
      setMessage(result.reply ?? '맞춤 케어를 실행했어요.')
    } catch (error) {
      await updateState({ careState: 'idle' })
      setMessage(error instanceof Error ? error.message : '케어 실행에 실패했어요.')
    }
  }

  async function generateDiary() {
    setIsGenerating(true)
    setMessage('')
    try {
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
        ...state.diaryEntries.filter((entry) => dateKey(entry.created_at) !== dateKey(result.entry!.created_at)),
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
    <main className="min-h-dvh bg-[#f7f5f2] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-[#202124]">
      <div className="mx-auto w-full max-w-[430px]">
        {activeTab === 'home' ? (
          <>
        <header className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#8d756d]">THINQ MOM</p>
              <h1 className="mt-1 text-3xl font-bold">사용자 홈</h1>
            </div>
            <Link href="/hub" className="rounded-full bg-white px-3 py-2 text-xs font-semibold shadow-sm">
              허브
            </Link>
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
              title="AI 추천 케어"
              summary={`허브 대화와 ${state.pregnancyWeek}주차 맞춤 조언`}
              expanded={expandedWifeCard === 'care'}
              onToggle={() => toggleWifeCard('care')}
            >
              <p className="text-xs font-semibold text-[#a14f62]">
                허브 대화 + 임신 {state.pregnancyWeek}주차
              </p>
              <h2 className="mt-2 text-lg font-bold leading-7">
                지금의 나에게 필요한 조언을 준비했어요
              </h2>
              <div className="mt-4 rounded-2xl bg-[#f7f5f2] p-4">
                <p className="text-[11px] font-semibold text-gray-400">허브에서 나눈 최근 이야기</p>
                <p className="mt-1 text-sm leading-6 text-gray-700">“{careConversation}”</p>
              </div>
              <div className="mt-3 rounded-2xl bg-[#f8eaed] p-4">
                <p className="text-[11px] font-semibold text-[#a14f62]">
                  {latestCareAdvice?.modeLabel ?? `${state.pregnancyWeek}주차 맞춤 조언`}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-700">{careAdvice}</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-400">
                허브에서 새로 대화하면 최근 내용과 임신 주차를 함께 반영해 조언을 갱신해요.
              </p>
              <button
                type="button"
                onClick={() => void executeCare()}
                disabled={state.careState === 'processing'}
                className="mt-4 min-h-12 w-full rounded-2xl bg-[#a14f62] px-4 font-semibold text-white disabled:opacity-60"
              >
                {state.careState === 'processing' ? 'AI가 케어를 준비하고 있어요' : '이 조언으로 AI 케어 실행'}
              </button>
            </ExpandableFeatureCard>

            <ExpandableFeatureCard
              title="초음파 사진 분석"
              summary={savedUltrasoundCards.length > 0
                ? `저장된 성장 기록 ${savedUltrasoundCards.length}개`
                : '사진 한 장으로 성장 기록 만들기'}
              expanded={expandedWifeCard === 'ultrasound'}
              onToggle={() => toggleWifeCard('ultrasound')}
            >
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
            </ExpandableFeatureCard>
          </div>
        ) : (
          <div className="space-y-3">
            <ExpandableFeatureCard
              title="오늘 아내 컨디션"
              summary={latestDiaryGuide ? '최근 기록을 바탕으로 정리했어요' : '편안한 휴식이 필요한 날'}
              expanded={expandedHusbandCard === 'condition'}
              onToggle={() => toggleHusbandCard('condition')}
            >
              <p className="text-xs font-semibold text-[#a14f62]">오늘의 컨디션 요약</p>
              <h2 className="mt-2 text-lg font-bold leading-7">{husbandCondition}</h2>
              <div className="mt-4 rounded-2xl bg-[#f7f5f2] p-4">
                <p className="text-sm leading-6 text-gray-700">
                  {latestDiaryGuide
                    ? '아내가 남긴 최근 AI 다이어리에서 몸 상태와 휴식 신호를 정리했어요.'
                    : '아직 오늘의 기록이 없어요. 무리한 질문보다 편히 쉴 수 있는 분위기를 먼저 만들어주세요.'}
                </p>
              </div>
            </ExpandableFeatureCard>

            <ExpandableFeatureCard
              title="내가 도와줄 수 있는 일"
              summary="오늘 바로 할 수 있는 작은 행동"
              expanded={expandedHusbandCard === 'actions'}
              onToggle={() => toggleHusbandCard('actions')}
            >
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
            </ExpandableFeatureCard>

            <ExpandableFeatureCard
              title="현재 케어 루틴"
              summary={routineLabel ? `${routineLabel} 실행 중` : '아직 실행된 케어가 없어요'}
              expanded={expandedHusbandCard === 'routine'}
              onToggle={() => toggleHusbandCard('routine')}
            >
              <p className="text-xs font-semibold text-[#a14f62]">ThinQ Mom 연동 상태</p>
              <h2 className="mt-2 text-lg font-bold">
                {routineLabel ? `${routineLabel}를 실행하고 있어요` : '대기 중이에요'}
              </h2>
              <div className="mt-4 rounded-2xl bg-[#f7f5f2] p-4">
                <p className="text-sm leading-6 text-gray-700">
                  {routineLabel
                    ? '허브에서 선택한 케어에 맞춰 공기와 휴식 환경을 조정했어요.'
                    : '아내 화면이나 허브에서 케어를 실행하면 연결된 기기와 진행 상태가 표시돼요.'}
                </p>
              </div>
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
              <p className="text-base font-bold text-[#202124]">{state.role === 'wife' ? 'AI 다이어리' : '가족 케어 캘린더'}</p>
              {state.role === 'wife' && expandedWifeCard !== 'diary' && (
                <p className="mt-1 text-xs text-gray-400">오늘의 기록과 임신 일정</p>
              )}
              {state.role === 'husband' && expandedHusbandCard !== 'calendar' && (
                <p className="mt-1 text-xs text-gray-400">아내의 기록을 가족 케어로 확인</p>
              )}
              {((state.role === 'wife' && expandedWifeCard === 'diary')
                || (state.role === 'husband' && expandedHusbandCard === 'calendar')) && (
                <h2 className="mt-1 text-xl font-bold">{viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월</h2>
              )}
            </div>
            {state.role === 'wife' && (
              <ExpandIconButton
                onClick={() => toggleWifeCard('diary')}
                label={expandedWifeCard === 'diary' ? 'AI 다이어리 접기' : 'AI 다이어리 확대'}
              />
            )}
            {state.role === 'husband' && (
              <ExpandIconButton
                onClick={() => toggleHusbandCard('calendar')}
                label={expandedHusbandCard === 'calendar' ? '가족 케어 캘린더 접기' : '가족 케어 캘린더 확대'}
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
              {isGenerating ? '작성 중...' : '다이어리 작성하기'}
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
            <CalendarLegend color="bg-[#a14f62]" label="AI 다이어리" />
            <CalendarLegend color="bg-blue-500" label="검사" />
            <CalendarLegend color="bg-emerald-500" label="신청" />
            <CalendarLegend color="bg-amber-500" label="준비" />
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
              ) : <p className="text-sm leading-6 text-gray-500">기록된 날짜를 누르면 그날의 마음을 볼 수 있어요.</p>
            ) : guide ? (
              <>
                <h3 className="font-bold">오늘의 가족 케어 기록</h3>
                <p className="mt-2 text-sm leading-6 text-gray-700">{guide.summary}</p>
                <p className="mt-4 text-sm font-semibold">오늘 남편이 도와줄 수 있는 일</p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-gray-700">
                  {guide.actions.map((action) => <li key={action}>• {action}</li>)}
                </ul>
                <p className="mt-4 text-sm font-semibold">오늘의 한마디</p>
                <p className="mt-1 text-sm leading-6 text-gray-700">{guide.note}</p>
              </>
            ) : <p className="text-sm leading-6 text-gray-500">아내가 다이어리를 작성한 날짜에 가족 케어 가이드가 표시돼요.</p>}

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

          <p className="mt-3 text-[11px] leading-5 text-gray-400">
            자동 일정은 시연용 안내예요. 실제 검사와 접종 시기는 담당 의료진에게 확인해주세요.
          </p>
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
        <MobileTabHeader title="디바이스" subtitle="연결된 ThinQ 기기를 확인해요" />
        <div className="space-y-3">
          <MobileInfoCard
            title="ThinQ ON 허브"
            description="음성 케어 연결 준비 완료"
            status="연결됨"
          />
          <MobileInfoCard
            title="공기청정기 · 스탠바이미"
            description={routineLabel ? `${routineLabel}에 맞춰 동작 중` : '케어 실행을 기다리고 있어요'}
            status={routineLabel ? '실행 중' : '대기'}
          />
          <MobileInfoCard
            title="3D 홈 시뮬레이터"
            description="실행된 케어 환경을 같은 상태로 보여줘요"
            status="연동됨"
          />
        </div>
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

function MobileInfoCard({
  title,
  description,
  status,
}: {
  title: string
  description: string
  status: string
}) {
  return (
    <section className="flex items-center justify-between gap-4 rounded-[24px] border border-[#ece8e4] bg-white p-5 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
      <div>
        <h2 className="font-bold">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-gray-400">{description}</p>
      </div>
      <span className="shrink-0 rounded-full bg-[#f3e5e8] px-3 py-1 text-[11px] font-semibold text-[#8b4253]">
        {status}
      </span>
    </section>
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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e9e5e1] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid h-[72px] w-full max-w-[430px] grid-cols-4 px-2">
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
  expanded,
  onToggle,
  children,
}: {
  title: string
  summary: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="relative min-h-[92px] rounded-[26px] border border-[#ece8e4] bg-white p-5 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
      <div className="pr-12">
        <h2 className="text-base font-bold text-[#202124]">{title}</h2>
        {!expanded && <p className="mt-1 text-xs text-gray-400">{summary}</p>}
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
