'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'
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

function calculateWeeksPregnant(dueDate: string) {
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return Math.floor((daysUntilDue - 280) / -7)
}

type WifeTab = 'quick' | 'record' | 'care'

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

export default function WifePage() {
  const router = useRouter()
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
  const adviceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (adviceTimerRef.current) clearTimeout(adviceTimerRef.current)
    }
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
  }, [])

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

      setDiaryText('')
      if (advice) showDiaryAdvice(advice)
    } catch (error) {
      console.error('오늘 한마디 저장 실패:', error)
    } finally {
      setIsDiaryLoading(false)
    }
  }

  const wifeTabs: { id: WifeTab; label: string }[] = [
    { id: 'quick', label: '빠른 실행' },
    { id: 'record', label: '기록' },
    { id: 'care', label: '케어' },
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <header className="bg-rose-50 px-5 pb-4 pt-5">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mb-3 text-sm text-gray-500 transition hover:text-gray-700"
          >
            ← 홈으로
          </button>
          <h1 className="text-xl font-bold text-gray-900">오늘도 잘하고 있어요 🌸</h1>
          {weeksPregnant !== null && (
            <p className="mt-1 text-base font-semibold text-rose-500">{weeksPregnant}주차</p>
          )}
          <p className="mt-1 text-sm text-gray-400">{getTodayLabel()}</p>
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
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold text-gray-900">{dailyCareCard.title}</h2>
                <p className="text-sm leading-relaxed text-gray-500">{dailyCareCard.content}</p>
              </section>
            )}

            {husbandMessage && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold text-gray-900">💌 남편의 메시지</h2>
                <p className="text-sm leading-relaxed text-gray-700">{husbandMessage.content}</p>
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
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-center text-sm text-gray-400">곧 업데이트 예정이에요 🌿</p>
          </section>
        )}
      </main>
    </div>
  )
}
