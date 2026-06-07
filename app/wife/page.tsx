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

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 via-rose-50 to-pink-50">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-5 px-4 py-6">
        <header className="relative text-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="absolute left-0 top-0 text-xs text-pink-400 transition hover:text-pink-600"
          >
            ← 홈으로
          </button>
          <h1 className="text-2xl font-bold text-pink-600">ThinQ Mom 🌸</h1>
          <p className="mt-1 text-sm text-purple-500">{getTodayLabel()}</p>
        </header>

        {dailyCareCard && (
          <section className="overflow-hidden rounded-2xl border border-pink-200 bg-white shadow-md">
            <div className="h-1 bg-pink-500" />
            <div className="p-5">
              <h2 className="mb-2 text-base font-semibold text-pink-700">{dailyCareCard.title}</h2>
              <p className="text-sm leading-relaxed text-purple-600">{dailyCareCard.content}</p>
            </div>
          </section>
        )}

        {husbandMessage && (
          <section className="rounded-2xl border border-pink-200 bg-white p-5 shadow-md">
            <h2 className="mb-2 text-sm font-semibold text-pink-600">💌 남편의 메시지</h2>
            <p className="text-sm leading-relaxed text-pink-800">{husbandMessage.content}</p>
          </section>
        )}

        {/* 카드 1 - 입덧 모드 */}
        <section className="rounded-2xl border border-pink-200 bg-white p-5 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-pink-600">입덧 모드</h2>
          <button
            type="button"
            onClick={handleNauseaMode}
            disabled={isNauseaLoading}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 py-4 text-lg font-semibold text-white shadow-md transition hover:from-pink-600 hover:to-rose-600 disabled:opacity-60"
          >
            {isNauseaLoading ? '켜는 중...' : '입덧 모드 ON'}
          </button>
          {nauseaMessage && (
            <p className="mt-3 text-center text-sm text-purple-500">{nauseaMessage}</p>
          )}
          <button
            type="button"
            onClick={handleSleepMode}
            disabled={isSleepLoading}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-lg font-semibold text-white shadow-md transition hover:from-violet-600 hover:to-purple-700 disabled:opacity-60"
          >
            {isSleepLoading ? '켜는 중...' : '수면 모드 ON 🌙'}
          </button>
          {sleepMessage && (
            <p className="mt-3 text-center text-sm text-violet-500">{sleepMessage}</p>
          )}
        </section>

        {/* 카드 2 - 태동 카운터 */}
        <section className="rounded-2xl border border-pink-200 bg-white p-5 shadow-md">
          <h2 className="mb-2 text-lg font-semibold text-pink-600">태동 카운터</h2>
          <p className="mb-1 text-center text-sm text-purple-500">오늘 태동 횟수</p>
          <p className="mb-4 text-center text-5xl font-bold text-pink-500">{kickCount}</p>
          <button
            type="button"
            onClick={handleKick}
            disabled={isKickLoading}
            className="w-full rounded-xl bg-pink-500 py-3 font-medium text-white transition hover:bg-pink-600 disabled:opacity-60"
          >
            {isKickLoading ? '기록 중...' : '태동 느꼈어요 👶'}
          </button>
        </section>

        {/* 카드 3 - 오늘 한마디 */}
        <section className="rounded-2xl border border-pink-200 bg-white p-5 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-pink-600">오늘 한마디</h2>
          <textarea
            value={diaryText}
            onChange={(e) => setDiaryText(e.target.value)}
            placeholder="오늘 몸 상태를 기록해보세요"
            rows={4}
            className="w-full resize-none rounded-xl border border-pink-100 bg-pink-50/50 px-4 py-3 text-sm text-purple-800 placeholder:text-purple-300 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          {diaryAdvice && (
            <p className="mt-3 rounded-xl border border-purple-100 bg-purple-50/80 px-4 py-3 text-sm text-purple-700">
              💡 {diaryAdvice}
            </p>
          )}
          <button
            type="button"
            onClick={handleDiarySave}
            disabled={isDiaryLoading || !diaryText.trim()}
            className="mt-3 w-full rounded-xl bg-purple-500 py-3 font-medium text-white transition hover:bg-purple-600 disabled:opacity-60"
          >
            {isDiaryLoading ? 'AI 분석 중...' : '저장'}
          </button>
        </section>

        {/* 카드 4 - 오늘 AI 일기 */}
        <section className="rounded-2xl border border-pink-200 bg-white p-5 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-pink-600">오늘 AI 일기</h2>
          <button
            type="button"
            onClick={handleGenerateAiDiary}
            disabled={isAiDiaryLoading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-medium text-white transition hover:from-purple-600 hover:to-pink-600 disabled:opacity-60"
          >
            {isAiDiaryLoading ? '일기 쓰는 중...' : '오늘 일기 생성 ✨'}
          </button>
          {aiDiary && (
            <div className="mt-4 rounded-xl border border-pink-100 bg-gradient-to-br from-pink-50/80 to-purple-50/80 px-4 py-4 shadow-inner">
              <p className="text-sm italic leading-relaxed text-purple-700">{aiDiary}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
