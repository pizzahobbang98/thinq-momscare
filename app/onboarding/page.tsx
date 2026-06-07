'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PregnancyStatus = 'preparing' | 'pregnant' | null

export default function OnboardingPage() {
  const router = useRouter()
  const [babyName, setBabyName] = useState('')
  const [status, setStatus] = useState<PregnancyStatus>(null)
  const [weeks, setWeeks] = useState('')

  const isStartDisabled =
    !babyName.trim() ||
    !status ||
    (status === 'pregnant' && (!weeks || Number(weeks) < 1 || Number(weeks) > 42))

  function handleStart() {
    if (isStartDisabled || !status) return

    const params = new URLSearchParams({
      name: babyName.trim(),
      status,
    })

    if (status === 'pregnant') {
      params.set('weeks', weeks)
    }

    router.push(`/select?${params.toString()}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-white">ThinQ Mom</h1>
          <p className="mt-3 text-sm text-gray-400">시작하기 전에 몇 가지만 알려주세요</p>
        </header>

        <div className="flex flex-col gap-6">
          <div>
            <label htmlFor="baby-name" className="mb-3 block text-sm font-semibold text-white">
              아기 태명이 뭔가요? 🍼
            </label>
            <input
              id="baby-name"
              type="text"
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              placeholder="예: 호빵, 콩콩, 별이"
              className="w-full rounded-2xl border border-gray-700 bg-white p-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">현재 상태를 알려주세요</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setStatus('preparing')}
                className={`rounded-2xl p-4 text-left text-base font-semibold transition ${
                  status === 'preparing'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                임신 준비 중 🌱
              </button>
              <button
                type="button"
                onClick={() => setStatus('pregnant')}
                className={`rounded-2xl p-4 text-left text-base font-semibold transition ${
                  status === 'pregnant'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                임신 중 🤰
              </button>
            </div>
          </div>

          {status === 'pregnant' && (
            <div>
              <label htmlFor="weeks" className="mb-3 block text-sm font-semibold text-white">
                현재 몇 주차인가요?
              </label>
              <input
                id="weeks"
                type="number"
                min={1}
                max={42}
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                placeholder="예: 26"
                className="w-full rounded-2xl border border-gray-700 bg-white p-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={isStartDisabled}
          className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          시작하기 →
        </button>
      </div>
    </div>
  )
}
