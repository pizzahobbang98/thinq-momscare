'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'
import { withAya } from '@/lib/korean'
import { controlAirPurifier } from '@/lib/thinq-mock'

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

function getTodayDateOnly() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMessageDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function calculateWeeksPregnant(dueDate: string) {
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return Math.floor((daysUntilDue - 280) / -7)
}

type WifeTab = 'quick' | 'record' | 'care'

type ModalType = 'mission' | 'message' | 'report' | 'kick' | null

type TodayMood = {
  mood: string
  emoji: string
}

const MOOD_OPTIONS: TodayMood[] = [
  { mood: '좋음', emoji: '😊' },
  { mood: '보통', emoji: '😌' },
  { mood: '우울', emoji: '😔' },
  { mood: '힘듦', emoji: '😣' },
  { mood: '아픔', emoji: '🤒' },
]

type DailyCard = {
  title: string
  content: string
}

type AnalyzeResponse = {
  parsed_category: string
  severity: number
  advice: string
  error?: string
}

type DiaryResponse = {
  diary: string
  error?: string
}

type HusbandMessage = {
  id: string
  from_role: string
  content: string
  created_at: string
}

type WeeklyReport = {
  summary: string
  symptoms: string
  device_usage: string
  recommendation: string
  encouragement: string
}

type ReportResponse = {
  report?: WeeklyReport
  error?: string
}

type KickStatus = 'normal' | 'low' | 'high'

type KickAnalysis = {
  today_count: number
  daily_average: number
  most_active_time: string
  pattern_comment: string
  status: KickStatus
  advice: string
}

type KickAnalysisResponse = {
  analysis?: KickAnalysis
  error?: string
}

type UltrasoundResult = {
  crl: string | null
  bpd: string | null
  fl: string | null
  estimated_size_cm: number
  estimated_weeks: number
  fruit_emoji: string
  fruit_name: string
  description: string
  size_basis: string
}

type UltrasoundResponse = {
  result?: UltrasoundResult
  error?: string
}

const MAX_ULTRASOUND_SIZE = 10 * 1024 * 1024

const KICK_STATUS_COLORS: Record<KickStatus, string> = {
  normal: 'text-green-500',
  low: 'text-yellow-500',
  high: 'text-blue-500',
}

const KICK_STATUS_LABELS: Record<KickStatus, string> = {
  normal: '정상',
  low: '적음',
  high: '많음',
}

export default function WifePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const babyName = searchParams.get('name')
  const urlWeeksParam = searchParams.get('weeks')
  const weeksFromUrl =
    urlWeeksParam && Number(urlWeeksParam) >= 1 && Number(urlWeeksParam) <= 42
      ? Number(urlWeeksParam)
      : null
  const [nauseaMessage, setNauseaMessage] = useState('')
  const [sleepMessage, setSleepMessage] = useState('')
  const [husbandMessage, setHusbandMessage] = useState<HusbandMessage | null>(null)
  const [kickCount, setKickCount] = useState(0)
  const [diaryText, setDiaryText] = useState('')
  const [isNauseaLoading, setIsNauseaLoading] = useState(false)
  const [isSleepLoading, setIsSleepLoading] = useState(false)
  const [isKickLoading, setIsKickLoading] = useState(false)
  const [isDiaryLoading, setIsDiaryLoading] = useState(false)
  const [diaryAdvice, setDiaryAdvice] = useState<string | null>(null)
  const [aiDiary, setAiDiary] = useState('')
  const [isAiDiaryLoading, setIsAiDiaryLoading] = useState(false)
  const [dailyCareCard, setDailyCareCard] = useState<DailyCard | null>(null)
  const [weeksPregnant, setWeeksPregnant] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<WifeTab>('quick')
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null)
  const [isReportLoading, setIsReportLoading] = useState(false)
  const [kickAnalysis, setKickAnalysis] = useState<KickAnalysis | null>(null)
  const [kickAnalysisError, setKickAnalysisError] = useState<string | null>(null)
  const [isKickAnalysisLoading, setIsKickAnalysisLoading] = useState(false)
  const [showHeartOverlay, setShowHeartOverlay] = useState(false)
  const [heartOverlayVisible, setHeartOverlayVisible] = useState(false)
  const [todayMood, setTodayMood] = useState<TodayMood | null>(null)
  const [isMoodLoading, setIsMoodLoading] = useState(false)
  const [moodSavedMessage, setMoodSavedMessage] = useState(false)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [ultrasoundPreview, setUltrasoundPreview] = useState<string | null>(null)
  const [ultrasoundFile, setUltrasoundFile] = useState<File | null>(null)
  const [ultrasoundResult, setUltrasoundResult] = useState<UltrasoundResult | null>(null)
  const [ultrasoundError, setUltrasoundError] = useState<string | null>(null)
  const [isUltrasoundLoading, setIsUltrasoundLoading] = useState(false)
  const [isUltrasoundDragging, setIsUltrasoundDragging] = useState(false)
  const adviceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ultrasoundInputRef = useRef<HTMLInputElement>(null)
  const ultrasoundPreviewRef = useRef<string | null>(null)
  const moodSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pregnancyWeeks = weeksFromUrl ?? weeksPregnant

  function navigateToSelect() {
    const query = searchParams.toString()
    router.push(query ? `/select?${query}` : '/select')
  }

  useEffect(() => {
    return () => {
      if (adviceTimerRef.current) clearTimeout(adviceTimerRef.current)
      if (moodSavedTimerRef.current) clearTimeout(moodSavedTimerRef.current)
      if (ultrasoundPreviewRef.current) {
        URL.revokeObjectURL(ultrasoundPreviewRef.current)
      }
    }
  }, [])

  useEffect(() => {
    async function fetchTodayMood() {
      const { data, error } = await supabase
        .from('moods')
        .select('mood, emoji')
        .eq('user_id', DEMO_WIFE_ID)
        .gte('created_at', getTodayStartISO())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('오늘 기분 조회 실패:', error)
        return
      }

      if (data) {
        setTodayMood(data as TodayMood)
      }
    }

    fetchTodayMood()
  }, [])

  function showDiaryAdvice(advice: string) {
    if (adviceTimerRef.current) clearTimeout(adviceTimerRef.current)
    setDiaryAdvice(advice)
    adviceTimerRef.current = setTimeout(() => setDiaryAdvice(null), 5000)
  }

  useEffect(() => {
    async function fetchDailyCareCard() {
      const { data, error } = await supabase
        .from('daily_cards')
        .select('title, content')
        .eq('card_date', getTodayDateString())
        .eq('target_role', 'wife')
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
    if (weeksFromUrl !== null) return

    async function fetchDueDate() {
      const { data, error } = await supabase
        .from('users')
        .select('due_date')
        .eq('id', DEMO_WIFE_ID)
        .maybeSingle()

      if (error) {
        console.error('임신 주차 조회 실패:', error)
        return
      }

      if (data?.due_date) {
        setWeeksPregnant(calculateWeeksPregnant(data.due_date))
      }
    }

    fetchDueDate()
  }, [weeksFromUrl])

  useEffect(() => {
    async function fetchTodayKicks() {
      const { count, error } = await supabase
        .from('symptom_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', DEMO_WIFE_ID)
        .eq('parsed_category', 'KICK')
        .gte('created_at', getTodayStartISO())

      if (error) {
        console.error('태동 횟수 조회 실패:', error)
        return
      }

      setKickCount(count ?? 0)
    }

    fetchTodayKicks()
  }, [])

  useEffect(() => {
    async function fetchHusbandMessage() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, from_role, content, created_at')
        .eq('from_role', 'husband')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('응원 메시지 조회 실패:', error)
        return
      }

      if (data) {
        setHusbandMessage(data as HusbandMessage)
      }
    }

    fetchHusbandMessage()

    const channel = supabase
      .channel('wife-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'from_role=eq.husband',
        },
        (payload) => {
          setHusbandMessage(payload.new as HusbandMessage)
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('응원 메시지 Realtime 구독 실패: wife-messages')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('wife-hearts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hearts',
          filter: 'from_role=eq.husband',
        },
        () => {
          setShowHeartOverlay(true)
          setHeartOverlayVisible(false)

          requestAnimationFrame(() => {
            setHeartOverlayVisible(true)
          })

          if (heartOverlayTimerRef.current) clearTimeout(heartOverlayTimerRef.current)
          if (heartFadeTimerRef.current) clearTimeout(heartFadeTimerRef.current)

          heartOverlayTimerRef.current = setTimeout(() => {
            setHeartOverlayVisible(false)
            heartFadeTimerRef.current = setTimeout(() => {
              setShowHeartOverlay(false)
            }, 300)
          }, 3000)
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('하트 Realtime 구독 실패: wife-hearts')
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (heartOverlayTimerRef.current) clearTimeout(heartOverlayTimerRef.current)
      if (heartFadeTimerRef.current) clearTimeout(heartFadeTimerRef.current)
    }
  }, [])

  async function handleMoodSelect(mood: string, emoji: string) {
    setIsMoodLoading(true)

    try {
      const { error } = await supabase.from('moods').insert({
        user_id: DEMO_WIFE_ID,
        mood,
        emoji,
      })

      if (error) throw error

      setTodayMood({ mood, emoji })
      setMoodSavedMessage(true)

      if (moodSavedTimerRef.current) clearTimeout(moodSavedTimerRef.current)
      moodSavedTimerRef.current = setTimeout(() => setMoodSavedMessage(false), 2000)
    } catch (error) {
      console.error('기분 기록 실패:', error)
    } finally {
      setIsMoodLoading(false)
    }
  }

  async function handleNauseaMode() {
    setIsNauseaLoading(true)
    setNauseaMessage('')

    try {
      const { error: eventError } = await supabase.from('device_events').insert({
        user_id: DEMO_WIFE_ID,
        event_type: 'NAUSEA_MODE',
        triggered_by: 'APP',
        device_status: { power: 'ON', mode: 'TURBO' },
      })

      if (eventError) throw eventError

      await controlAirPurifier('NAUSEA_MODE')
      setNauseaMessage('공기청정기를 켰어요 🌬️')
    } catch (error) {
      console.error('입덧 모드 활성화 실패:', error)
    } finally {
      setIsNauseaLoading(false)
    }
  }

  async function handleSleepMode() {
    setIsSleepLoading(true)
    setSleepMessage('')

    try {
      await controlAirPurifier('SLEEP_MODE')

      const { error } = await supabase.from('device_events').insert({
        user_id: DEMO_WIFE_ID,
        event_type: 'SLEEP_MODE',
        triggered_by: 'APP',
        device_status: { power: 'ON', mode: 'SLEEP' },
      })

      if (error) throw error

      setSleepMessage('포근한 수면 환경을 만들었어요 🌙')
    } catch (error) {
      console.error('수면 모드 활성화 실패:', error)
    } finally {
      setIsSleepLoading(false)
    }
  }

  async function handleKick() {
    setIsKickLoading(true)

    try {
      const { error } = await supabase.from('symptom_logs').insert({
        user_id: DEMO_WIFE_ID,
        symptom_text: '태동',
        parsed_category: 'KICK',
      })

      if (error) throw error

      setKickCount((prev) => prev + 1)
    } catch (error) {
      console.error('태동 기록 실패:', error)
    } finally {
      setIsKickLoading(false)
    }
  }

  async function handleGenerateAiDiary() {
    setIsAiDiaryLoading(true)

    try {
      const response = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: getTodayStartISO() }),
      })

      const data = (await response.json()) as DiaryResponse

      if (!response.ok) {
        throw new Error(data.error ?? '일기 생성 실패')
      }

      setAiDiary(data.diary)
    } catch (error) {
      console.error('AI 일기 생성 실패:', error)
    } finally {
      setIsAiDiaryLoading(false)
    }
  }

  async function handleDiarySave() {
    const text = diaryText.trim()
    if (!text) return

    setIsDiaryLoading(true)

    let parsed_category = 'DIARY'
    let severity = 1
    let advice: string | null = null

    try {
      try {
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        if (analyzeResponse.ok) {
          const data = (await analyzeResponse.json()) as AnalyzeResponse
          parsed_category = data.parsed_category ?? 'DIARY'
          severity = data.severity ?? 1
          advice = data.advice ?? null
        } else {
          const data = (await analyzeResponse.json()) as AnalyzeResponse
          console.error('증상 분석 실패:', data.error)
        }
      } catch (error) {
        console.error('증상 분석 요청 실패:', error)
      }

      const { error } = await supabase.from('symptom_logs').insert({
        user_id: DEMO_WIFE_ID,
        symptom_text: text,
        parsed_category,
        severity,
        advice,
      })

      if (error) throw error

      if (severity >= 4) {
        const { error: alertError } = await supabase.from('alerts').insert({
          from_role: 'wife',
          severity,
          message: text,
          is_read: false,
        })

        if (alertError) {
          console.error('긴급 알림 생성 실패:', alertError)
        }
      }

      setDiaryText('')
      if (advice) showDiaryAdvice(advice)
    } catch (error) {
      console.error('오늘 한마디 저장 실패:', error)
    } finally {
      setIsDiaryLoading(false)
    }
  }

  function clearUltrasoundPreview() {
    if (ultrasoundPreviewRef.current) {
      URL.revokeObjectURL(ultrasoundPreviewRef.current)
      ultrasoundPreviewRef.current = null
    }
  }

  function handleUltrasoundFile(file: File) {
    setUltrasoundError(null)
    setUltrasoundResult(null)

    if (!file.type.startsWith('image/')) {
      setUltrasoundError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    if (file.size > MAX_ULTRASOUND_SIZE) {
      setUltrasoundError('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    clearUltrasoundPreview()
    const previewUrl = URL.createObjectURL(file)
    ultrasoundPreviewRef.current = previewUrl
    setUltrasoundPreview(previewUrl)
    setUltrasoundFile(file)
  }

  async function handleUltrasoundAnalyze() {
    if (!ultrasoundFile) {
      setUltrasoundError('분석할 사진을 먼저 업로드해 주세요.')
      return
    }

    setIsUltrasoundLoading(true)
    setUltrasoundError(null)
    setUltrasoundResult(null)

    try {
      const formData = new FormData()
      formData.append('image', ultrasoundFile)

      const response = await fetch('/api/ultrasound', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as UltrasoundResponse

      if (!response.ok || data.error || !data.result) {
        setUltrasoundError(data.error ?? '분석 실패')
        return
      }

      setUltrasoundResult(data.result)
    } catch (error) {
      console.error('초음파 분석 실패:', error)
      setUltrasoundError('분석 실패')
    } finally {
      setIsUltrasoundLoading(false)
    }
  }

  async function handleGenerateReport() {
    setIsReportLoading(true)

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weeksFromUrl !== null ? { weeks: weeksFromUrl } : {}),
      })

      const data = (await response.json()) as ReportResponse

      if (!response.ok) {
        throw new Error(data.error ?? '리포트 생성 실패')
      }

      if (data.report) {
        setWeeklyReport(data.report)
        setModalType('report')
      }
    } catch (error) {
      console.error('주간 리포트 생성 실패:', error)
    } finally {
      setIsReportLoading(false)
    }
  }

  async function handleKickAnalysis() {
    setIsKickAnalysisLoading(true)
    setKickAnalysisError(null)
    setKickAnalysis(null)

    try {
      const response = await fetch('/api/kick-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = (await response.json()) as KickAnalysisResponse

      if (!response.ok) {
        setKickAnalysisError(data.error ?? '태동 패턴 분석 실패')
        return
      }

      if (data.analysis) {
        setKickAnalysis(data.analysis)
        setModalType('kick')
      }
    } catch (error) {
      console.error('태동 패턴 분석 실패:', error)
      setKickAnalysisError('태동 패턴 분석 중 오류가 발생했습니다.')
    } finally {
      setIsKickAnalysisLoading(false)
    }
  }

  const wifeTabs: { id: WifeTab; label: string }[] = [
    { id: 'quick', label: '홈' },
    { id: 'record', label: '기록' },
    { id: 'care', label: '케어' },
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <header className="bg-rose-50 px-5 pb-4 pt-5">
          <button
            type="button"
            onClick={navigateToSelect}
            className="mb-3 text-sm text-gray-500 transition hover:text-gray-700"
          >
            ← 홈으로
          </button>
          <h1 className="text-xl font-bold text-gray-900">오늘도 잘하고 있어요 🌸</h1>
          {babyName && (
            <p className="mt-1 text-sm text-rose-400">{withAya(babyName)}, 화이팅!</p>
          )}
          <p className="mt-1 text-sm text-gray-400">
            {getTodayLabel()}
            {weeksFromUrl !== null && ` · ${weeksFromUrl}주차`}
          </p>
        </header>

        <nav className="flex border-b border-gray-100 bg-white px-5">
          {wifeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-rose-500 text-rose-500'
                  : 'text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 px-5 py-5">
        {activeTab === 'quick' && (
          <>
            {dailyCareCard && (
              <section
                role="button"
                tabIndex={0}
                onClick={() => setModalType('mission')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setModalType('mission')
                  }
                }}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-rose-200"
              >
                <h2 className="mb-2 text-base font-semibold text-gray-900">{dailyCareCard.title}</h2>
                <p className="line-clamp-3 text-sm leading-relaxed text-gray-500">{dailyCareCard.content}</p>
              </section>
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">오늘 기분이 어때요? 🌈</h2>
              <div className="grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map((option) => {
                  const isSelected = todayMood?.mood === option.mood
                  return (
                    <button
                      key={option.mood}
                      type="button"
                      onClick={() => handleMoodSelect(option.mood, option.emoji)}
                      disabled={isMoodLoading}
                      className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-center transition disabled:opacity-60 ${
                        isSelected
                          ? 'border border-rose-500 bg-rose-50'
                          : 'border border-transparent bg-gray-50'
                      }`}
                    >
                      <span className="text-xl">{option.emoji}</span>
                      <span className="text-xs text-gray-700">{option.mood}</span>
                    </button>
                  )
                })}
              </div>
              {moodSavedMessage && (
                <p className="mt-3 text-center text-sm text-rose-500">오늘 기분이 기록됐어요 ✨</p>
              )}
            </section>

            {husbandMessage && (
              <section
                role="button"
                tabIndex={0}
                onClick={() => setModalType('message')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setModalType('message')
                  }
                }}
                className="cursor-pointer rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-sm transition hover:border-rose-200"
              >
                <h2 className="mb-2 text-base font-semibold text-gray-900">💌 남편의 메시지</h2>
                <p className="line-clamp-2 text-sm leading-relaxed text-gray-700">{husbandMessage.content}</p>
              </section>
            )}

            <section className="flex flex-col gap-4">
              <button
                type="button"
                onClick={handleNauseaMode}
                disabled={isNauseaLoading}
                className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isNauseaLoading ? '켜는 중...' : '입덧 모드 ON'}
              </button>
              {nauseaMessage && (
                <p className="text-sm text-gray-500">{nauseaMessage}</p>
              )}

              <button
                type="button"
                onClick={handleSleepMode}
                disabled={isSleepLoading}
                className="w-full rounded-2xl bg-violet-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-violet-600 disabled:opacity-60"
              >
                {isSleepLoading ? '켜는 중...' : '수면 모드 ON 🌙'}
              </button>
              {sleepMessage && (
                <p className="text-sm text-gray-500">{sleepMessage}</p>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base font-semibold text-gray-900">태동 카운터</h2>
              <p className="mb-4 text-sm text-gray-400">오늘 태동 횟수</p>
              <p className="mb-5 text-center text-6xl font-bold text-gray-900">{kickCount}</p>
              <button
                type="button"
                onClick={handleKick}
                disabled={isKickLoading}
                className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isKickLoading ? '기록 중...' : '태동 느꼈어요 👶'}
              </button>
            </section>
          </>
        )}

        {activeTab === 'record' && (
          <>
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">오늘 한마디</h2>
              <textarea
                value={diaryText}
                onChange={(e) => setDiaryText(e.target.value)}
                placeholder="오늘 몸 상태를 기록해보세요"
                rows={4}
                className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="button"
                onClick={handleDiarySave}
                disabled={isDiaryLoading || !diaryText.trim()}
                className="mt-4 w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isDiaryLoading ? 'AI 분석 중...' : '저장'}
              </button>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">초음파 사진 분석 🔬</h2>

              <div
                role="button"
                tabIndex={0}
                onClick={() => ultrasoundInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    ultrasoundInputRef.current?.click()
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsUltrasoundDragging(true)
                }}
                onDragLeave={() => setIsUltrasoundDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsUltrasoundDragging(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleUltrasoundFile(file)
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition ${
                  isUltrasoundDragging
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-gray-200 bg-gray-50 hover:border-rose-300 hover:bg-rose-50/50'
                }`}
              >
                <p className="text-sm font-medium text-gray-600">사진을 업로드하세요 📷</p>
                <p className="mt-2 text-xs text-gray-400">클릭 또는 드래그 · 10MB 이하</p>
                <input
                  ref={ultrasoundInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUltrasoundFile(file)
                    e.target.value = ''
                  }}
                />
              </div>

              {ultrasoundPreview && (
                <div className="mt-4 flex justify-center rounded-2xl bg-gray-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ultrasoundPreview}
                    alt="초음파 미리보기"
                    className="max-h-40 object-contain"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleUltrasoundAnalyze}
                disabled={isUltrasoundLoading || !ultrasoundFile}
                className="mt-4 w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isUltrasoundLoading ? '분석 중... 🔬' : 'AI 분석 시작'}
              </button>

              {ultrasoundError && (
                <p className="mt-3 text-center text-sm text-red-500">{ultrasoundError}</p>
              )}

              {ultrasoundResult && (
                <div className="mt-4 rounded-2xl bg-rose-50 p-5">
                  <p className="animate-bounce-once text-center text-6xl">{ultrasoundResult.fruit_emoji}</p>
                  <p className="mt-3 text-center text-xl font-bold text-gray-900">
                    {ultrasoundResult.fruit_name} 크기예요!
                  </p>
                  <p className="mt-2 text-center text-sm text-gray-600">
                    약 {ultrasoundResult.estimated_size_cm}cm · 추정 {ultrasoundResult.estimated_weeks}주차
                  </p>
                  <p className="mt-1 text-center text-xs text-gray-500">
                    📏 {ultrasoundResult.size_basis}
                  </p>

                  {(ultrasoundResult.crl || ultrasoundResult.bpd || ultrasoundResult.fl) && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {ultrasoundResult.crl && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-700">
                          CRL {ultrasoundResult.crl}
                        </span>
                      )}
                      {ultrasoundResult.bpd && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-700">
                          BPD {ultrasoundResult.bpd}
                        </span>
                      )}
                      {ultrasoundResult.fl && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-700">
                          FL {ultrasoundResult.fl}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-4 text-center text-sm leading-relaxed text-gray-700">
                    {ultrasoundResult.description}
                  </p>

                  <p className="mt-4 text-center text-xs text-gray-400">
                    ⚠️ AI 추정값이며 정확한 진단은 의사에게 문의하세요
                  </p>
                </div>
              )}
            </section>

            {diaryAdvice && (
              <section className="rounded-2xl border border-gray-100 bg-rose-50 p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold text-gray-900">AI 분석 조언</h2>
                <p className="text-sm leading-relaxed text-gray-700">💡 {diaryAdvice}</p>
              </section>
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">오늘 AI 일기</h2>
              <button
                type="button"
                onClick={handleGenerateAiDiary}
                disabled={isAiDiaryLoading}
                className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isAiDiaryLoading ? '일기 쓰는 중...' : '오늘 일기 생성 ✨'}
              </button>
              {aiDiary && (
                <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-4">
                  <p className="text-sm italic leading-relaxed text-gray-700">{aiDiary}</p>
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'care' && (
          <>
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">주간 AI 케어 리포트</h2>
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isReportLoading}
                className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isReportLoading ? '분석 중...' : '주간 리포트 생성 📊'}
              </button>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">태동 패턴 분석</h2>
              <button
                type="button"
                onClick={handleKickAnalysis}
                disabled={isKickAnalysisLoading}
                className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isKickAnalysisLoading ? '분석 중...' : '태동 패턴 분석 👶'}
              </button>
            </section>

            {kickAnalysisError && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-center text-sm text-gray-400">{kickAnalysisError}</p>
              </section>
            )}

          </>
        )}
      </main>

      {modalType && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50"
          onClick={() => setModalType(null)}
        >
          <div
            className={`relative mx-4 mt-20 w-full max-w-sm overflow-y-auto rounded-3xl p-6 ${
              modalType === 'message'
                ? 'max-h-[70vh] bg-rose-50'
                : modalType === 'report'
                  ? 'max-h-[80vh] bg-white'
                  : 'max-h-[70vh] bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>

            {modalType === 'mission' && dailyCareCard && (
              <>
                <h2 className="pr-8 text-base font-semibold text-gray-900">{dailyCareCard.title}</h2>
                <p className="mt-1 text-sm text-gray-400">{getTodayDateOnly()}</p>
                <hr className="my-4 border-gray-100" />
                <p className="text-sm leading-relaxed text-gray-700">{dailyCareCard.content}</p>
                <hr className="my-4 border-gray-100" />
                <div className="rounded-xl bg-rose-50 p-4 text-center">
                  <p className="text-sm font-medium text-rose-500">오늘 하루도 잘 하고 있어요 💕</p>
                  <p className="mt-2 text-sm text-rose-500">작은 것 하나씩, 천천히 해나가면 돼요</p>
                </div>
              </>
            )}

            {modalType === 'message' && husbandMessage && (
              <>
                <h2 className="mb-4 pr-8 text-base font-semibold text-rose-700">💌 남편의 메시지</h2>
                <p className="text-lg leading-relaxed text-gray-800">{husbandMessage.content}</p>
                <p className="mt-4 text-xs text-rose-400">
                  {formatMessageDateTime(husbandMessage.created_at)}
                </p>
              </>
            )}

            {modalType === 'report' && weeklyReport && (
              <div className="divide-y divide-gray-100 pr-2">
                <div className="pb-4">
                  <p className="mb-2 text-sm text-gray-400">📋 이번 주 요약</p>
                  <p className="text-lg font-semibold text-gray-900">{weeklyReport.summary}</p>
                </div>
                <div className="py-4">
                  <p className="mb-2 text-sm text-gray-400">🤒 증상 패턴</p>
                  <p className="text-sm leading-relaxed text-gray-700">{weeklyReport.symptoms}</p>
                </div>
                <div className="py-4">
                  <p className="mb-2 text-sm text-gray-400">🌬️ 기기 사용</p>
                  <p className="text-sm leading-relaxed text-gray-700">{weeklyReport.device_usage}</p>
                </div>
                <div className="py-4">
                  <p className="mb-2 text-sm text-gray-400">💡 다음 주 추천</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {weeklyReport.recommendation}
                  </p>
                </div>
                <div className="pt-4">
                  <p className="mb-2 text-sm text-rose-400">💕 응원 메시지</p>
                  <p className="text-sm font-medium leading-relaxed text-rose-700">
                    {weeklyReport.encouragement}
                  </p>
                </div>
              </div>
            )}

            {modalType === 'kick' && kickAnalysis && (
              <div className="pr-2">
                <h2 className="mb-4 pr-8 text-base font-semibold text-gray-900">태동 패턴 분석 👶</h2>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-rose-50 px-3 py-4 text-center">
                    <p className="text-xs text-gray-500">오늘 태동</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{kickAnalysis.today_count}회</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-4 text-center">
                    <p className="text-xs text-gray-500">7일 평균</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{kickAnalysis.daily_average}회</p>
                  </div>
                </div>
                <p className="mb-2 text-sm text-gray-700">
                  가장 활발한 시간대:{' '}
                  <span className="font-semibold text-gray-900">{kickAnalysis.most_active_time}</span>
                </p>
                <p className={`mb-4 text-sm font-semibold ${KICK_STATUS_COLORS[kickAnalysis.status]}`}>
                  상태: {KICK_STATUS_LABELS[kickAnalysis.status]}
                </p>
                <p className="mb-4 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-700">
                  {kickAnalysis.pattern_comment}
                </p>
                <p className="border-t border-gray-100 pt-4 text-sm font-medium text-gray-700">
                  💡 {kickAnalysis.advice}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showHeartOverlay && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-pink-500/20 transition-opacity duration-300 ${
            heartOverlayVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="text-center">
            <p className="text-6xl">💕</p>
            <p className="mt-4 text-lg font-semibold text-gray-900">남편이 사랑을 보냈어요 💕</p>
          </div>
        </div>
      )}
    </div>
  )
}
