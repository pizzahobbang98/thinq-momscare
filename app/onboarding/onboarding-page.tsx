'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PregnancyStatus = 'preparing' | 'pregnant' | null

const inputClassName =
  'w-full rounded-2xl border border-white/30 bg-white/20 p-4 text-base text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20'

export default function OnboardingPage() {
  const router = useRouter()
  const [babyName, setBabyName] = useState('')
  const [status, setStatus] = useState<PregnancyStatus>(null)
  const [weeks, setWeeks] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [checkupMessage, setCheckupMessage] = useState<string | null>(null)

  const isStartDisabled =
    !babyName.trim() ||
    !status ||
    (status === 'pregnant' && (!weeks || Number(weeks) < 1 || Number(weeks) > 42)) ||
    isStarting

  async function handleStart() {
    if (isStartDisabled || !status) return

    setIsStarting(true)
    setSetupError(null)
    setCheckupMessage(null)

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeks: status === 'pregnant' ? Number(weeks) : 0,
          status,
        }),
      })

      const data = (await response.json()) as {
        success?: boolean
        checkupsCreated?: number
        dataCleared?: boolean
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error ?? '설정 저장 실패')
      }

      const setupMessages: string[] = []
      if (data.dataCleared) {
        setupMessages.push('이전 기록을 초기화했어요 🌱')
      }
      if (data.checkupsCreated && data.checkupsCreated > 0) {
        setupMessages.push(
          status === 'preparing'
            ? `산전 검사 일정 ${data.checkupsCreated}개가 캘린더에 추가됐어요!`
            : `검진 일정 ${data.checkupsCreated}개가 캘린더에 추가됐어요!`,
        )
      }

      if (setupMessages.length > 0) {
        setCheckupMessage(setupMessages.join('\n'))
        await new Promise((resolve) => setTimeout(resolve, 1800))
      }

      const params = new URLSearchParams({
        name: babyName.trim(),
        status,
      })

      if (status === 'pregnant') {
        params.set('weeks', weeks)
      }

      router.push(`/select?${params.toString()}`)
    } catch (error) {
      console.error('온보딩 설정 실패:', error)
      setSetupError(error instanceof Error ? error.message : '설정 저장 중 오류가 발생했습니다.')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-900 via-purple-800 to-pink-900 px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col items-center pt-4 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-4xl">
            🌸
          </div>
          <h1 className="text-3xl font-bold text-white">ThinQ Mom 🌸</h1>
          <p className="mt-3 text-sm text-white/80">우리 아기와 함께하는 스마트 케어를 시작해요</p>
        </header>

        <div className="flex flex-col gap-6 rounded-3xl border border-white/25 bg-white/15 p-6 backdrop-blur-md">
          <div>
            <label htmlFor="baby-name" className="mb-3 block text-sm font-semibold text-white">
              아기 태명을 알려주세요 🍼
            </label>
            <input
              id="baby-name"
              type="text"
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              placeholder="예: 호빵, 콩콩, 별이"
              className={inputClassName}
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">지금 어떤 상황이에요?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('preparing')}
                className={`rounded-2xl py-3 text-center text-sm transition ${
                  status === 'preparing'
                    ? 'bg-white font-semibold text-purple-700 shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                임신 준비 중이에요 🌱
              </button>
              <button
                type="button"
                onClick={() => setStatus('pregnant')}
                className={`rounded-2xl py-3 text-center text-sm transition ${
                  status === 'pregnant'
                    ? 'bg-white font-semibold text-purple-700 shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                임신 중이에요 🤰
              </button>
            </div>
          </div>

          {status === 'pregnant' && (
            <div>
              <label htmlFor="weeks" className="mb-3 block text-sm font-semibold text-white">
                지금 몇 주차예요?
              </label>
              <input
                id="weeks"
                type="number"
                min={1}
                max={42}
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                placeholder="예: 26"
                className={inputClassName}
              />
              <p className="mt-2 text-xs text-white/60">1주~42주 사이로 입력해주세요</p>
            </div>
          )}
        </div>

        {checkupMessage && (
          <p className="whitespace-pre-line text-center text-sm font-medium text-emerald-200">
            {checkupMessage}
          </p>
        )}

        {setupError && (
          <p className="text-center text-sm text-rose-200">{setupError}</p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={isStartDisabled}
          className="w-full rounded-2xl bg-white py-4 text-lg font-bold text-purple-700 shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isStarting ? '잠깐만요... ✨' : '시작하기 →'}
        </button>

        <p className="text-center text-xs text-white/60">
          임신 준비 중이어도 시작할 수 있어요 🌱
        </p>
      </div>
    </div>
  )
}
