'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveOnboardingProfile,
  type OnboardingRole,
  type OnboardingStatus,
} from '@/lib/onboarding-profile'

const BIRTH_YEARS = Array.from({ length: 2008 - 1985 + 1 }, (_, i) => 1985 + i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function formatBirthDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const inputClassName =
  'min-h-[44px] w-full rounded-2xl border border-white/30 bg-white/20 p-4 text-base text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20'

const selectClassName =
  'min-h-[44px] w-full appearance-none rounded-2xl border border-white/30 bg-white/20 px-2 py-3 text-sm text-white focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50'

export default function OnboardingPage() {
  const router = useRouter()
  const [babyName, setBabyName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [role, setRole] = useState<OnboardingRole | null>(null)
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [weeks, setWeeks] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [birthDateError, setBirthDateError] = useState<string | null>(null)
  const [checkupMessage, setCheckupMessage] = useState<string | null>(null)

  const birthDate = useMemo(
    () => formatBirthDate(birthYear, birthMonth, birthDay),
    [birthYear, birthMonth, birthDay],
  )

  const dayOptions = useMemo(() => {
    if (!birthYear || !birthMonth) return []
    const maxDays = getDaysInMonth(Number(birthYear), Number(birthMonth))
    return Array.from({ length: maxDays }, (_, i) => i + 1)
  }, [birthYear, birthMonth])

  function handleBirthYearChange(value: string) {
    setBirthYear(value)
    setBirthDateError(null)
    if (value && birthMonth && birthDay) {
      const maxDays = getDaysInMonth(Number(value), Number(birthMonth))
      if (Number(birthDay) > maxDays) setBirthDay('')
    }
  }

  function handleBirthMonthChange(value: string) {
    setBirthMonth(value)
    setBirthDateError(null)
    if (birthYear && value && birthDay) {
      const maxDays = getDaysInMonth(Number(birthYear), Number(value))
      if (Number(birthDay) > maxDays) setBirthDay('')
    }
  }

  const isStartDisabled =
    !babyName.trim() ||
    !status ||
    (status === 'pregnant' && (!weeks || Number(weeks) < 1 || Number(weeks) > 42)) ||
    isStarting

  async function handleStart() {
    if (isStartDisabled || !status) return

    let hasValidationError = false

    if (!birthYear || !birthMonth || !birthDay) {
      setBirthDateError('생년월일을 모두 선택해주세요.')
      hasValidationError = true
    } else {
      setBirthDateError(null)
    }

    if (!role) {
      setRoleError('아내 또는 남편 중 하나를 선택해주세요.')
      hasValidationError = true
    } else {
      setRoleError(null)
    }

    if (hasValidationError || !role) return

    const selectedRole = role

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
          role: selectedRole,
          birthDate,
          babyName: babyName.trim(),
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

      saveOnboardingProfile({
        babyName: babyName.trim(),
        status,
        weeks: status === 'pregnant' ? weeks : undefined,
        birthDate,
        role: selectedRole,
      })

      const setupMessages: string[] = []
      if (data.dataCleared) {
        setupMessages.push('이전 기록을 초기화했어요')
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
        role: selectedRole,
        birthDate,
        fresh: 'true',
      })

      if (status === 'pregnant') {
        params.set('weeks', weeks)
      }

      router.push(`/select?${params.toString()}`)
    } catch (error) {
      console.warn('온보딩 설정 실패:', error)
      setSetupError(error instanceof Error ? error.message : '설정 저장 중 오류가 발생했습니다.')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br from-violet-900 via-purple-800 to-pink-900 px-4 py-12 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-[430px] flex-col gap-8">
        <header className="flex flex-col items-center pt-4 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-4xl">
            🏠
          </div>
          <h1 className="text-3xl font-bold text-white">ThinQ Mom</h1>
          <p className="mt-3 text-sm text-white/80">가전과 함께하는 스마트 케어를 시작해요</p>
        </header>

        <div className="flex flex-col gap-6 rounded-3xl border border-white/25 bg-white/15 p-5 backdrop-blur-md sm:p-6">
          <div>
            <label htmlFor="baby-name" className="mb-3 block text-sm font-semibold text-white">
              태명
            </label>
            <input
              id="baby-name"
              type="text"
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              placeholder="태명을 입력해주세요"
              className={inputClassName}
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">생년월일을 입력해주세요</p>
            <div className="grid grid-cols-3 gap-2">
              <select
                id="birth-year"
                value={birthYear}
                onChange={(e) => handleBirthYearChange(e.target.value)}
                className={`${selectClassName} ${!birthYear ? 'text-white/50' : ''}`}
                aria-label="연도"
              >
                <option value="" disabled>
                  연도
                </option>
                {BIRTH_YEARS.map((year) => (
                  <option key={year} value={String(year)} className="text-gray-900">
                    {year}년
                  </option>
                ))}
              </select>

              <select
                id="birth-month"
                value={birthMonth}
                onChange={(e) => handleBirthMonthChange(e.target.value)}
                className={`${selectClassName} ${!birthMonth ? 'text-white/50' : ''}`}
                aria-label="월"
              >
                <option value="" disabled>
                  월
                </option>
                {MONTHS.map((month) => (
                  <option key={month} value={String(month)} className="text-gray-900">
                    {month}월
                  </option>
                ))}
              </select>

              <select
                id="birth-day"
                value={birthDay}
                onChange={(e) => {
                  setBirthDay(e.target.value)
                  setBirthDateError(null)
                }}
                disabled={!birthYear || !birthMonth}
                className={`${selectClassName} ${!birthDay ? 'text-white/50' : ''}`}
                aria-label="일"
              >
                <option value="" disabled>
                  일
                </option>
                {dayOptions.map((day) => (
                  <option key={day} value={String(day)} className="text-gray-900">
                    {day}일
                  </option>
                ))}
              </select>
            </div>
            {birthDateError && (
              <p className="mt-2 text-xs text-rose-200">{birthDateError}</p>
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">역할을 선택해주세요</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRole('wife')
                  setRoleError(null)
                }}
                className={`min-h-[44px] rounded-2xl py-3 text-center text-sm transition ${
                  role === 'wife'
                    ? 'bg-white font-semibold text-purple-700 shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                아내
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('husband')
                  setRoleError(null)
                }}
                className={`min-h-[44px] rounded-2xl py-3 text-center text-sm transition ${
                  role === 'husband'
                    ? 'bg-white font-semibold text-purple-700 shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                남편
              </button>
            </div>
            {roleError && (
              <p className="mt-2 text-xs text-rose-200">{roleError}</p>
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">지금 어떤 상황이에요?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('preparing')}
                className={`min-h-[44px] rounded-2xl py-3 text-center text-sm transition ${
                  status === 'preparing'
                    ? 'bg-white font-semibold text-purple-700 shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                임신 준비 중이에요
              </button>
              <button
                type="button"
                onClick={() => setStatus('pregnant')}
                className={`min-h-[44px] rounded-2xl py-3 text-center text-sm transition ${
                  status === 'pregnant'
                    ? 'bg-white font-semibold text-purple-700 shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                임신 중이에요
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
          className="min-h-[44px] w-full rounded-2xl bg-white py-4 text-lg font-bold text-purple-700 shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isStarting ? '잠깐만요...' : '시작하기'}
        </button>

        <p className="text-center text-xs text-white/60">
          임신 준비 중이어도 시작할 수 있어요
        </p>
      </div>
    </div>
  )
}
