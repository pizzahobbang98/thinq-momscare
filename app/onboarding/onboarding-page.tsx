'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveOnboardingProfile,
  type OnboardingRole,
  type OnboardingStatus,
} from '@/lib/onboarding-profile'

const BIRTH_YEAR_START = 1970
const BIRTH_YEAR_END = 2008
const BIRTH_YEARS = Array.from(
  { length: BIRTH_YEAR_END - BIRTH_YEAR_START + 1 },
  (_, i) => BIRTH_YEAR_START + i,
)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function formatBirthDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const inputClassName =
  'relative z-10 min-h-[44px] w-full rounded-2xl border border-white/30 bg-white/20 p-4 text-base text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20'

const selectClassName =
  'relative z-10 min-h-[44px] w-full appearance-none rounded-2xl border border-white/30 bg-white/20 px-2 py-3 text-sm text-white focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50'

const fieldGroupClassName = 'relative isolate space-y-3'

export default function OnboardingPage() {
  const router = useRouter()
  const [babyName, setBabyName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [role, setRole] = useState<OnboardingRole | ''>('')
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [pregnancyWeek, setPregnancyWeek] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [birthDateError, setBirthDateError] = useState<string | null>(null)
  const [checkupMessage, setCheckupMessage] = useState<string | null>(null)

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

  function handleBirthDayChange(value: string) {
    setBirthDay(value)
    setBirthDateError(null)
  }

  function handleSelectWife() {
    setRole('wife')
    setRoleError(null)
  }

  function handleSelectHusband() {
    setRole('husband')
    setRoleError(null)
  }

  const isStartDisabled =
    !babyName.trim() ||
    !status ||
    (status === 'pregnant' &&
      (!pregnancyWeek || Number(pregnancyWeek) < 1 || Number(pregnancyWeek) > 42)) ||
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

    if (role !== 'wife' && role !== 'husband') {
      setRoleError('아내 또는 남편 중 하나를 선택해주세요.')
      hasValidationError = true
    } else {
      setRoleError(null)
    }

    if (hasValidationError || (role !== 'wife' && role !== 'husband')) return

    const selectedRole: OnboardingRole = role
    const trimmedBabyName = babyName.trim()
    const formattedBirthDate = formatBirthDate(birthYear, birthMonth, birthDay)

    const onboardingPayload = {
      babyName: trimmedBabyName,
      pregnancyWeek: status === 'pregnant' ? pregnancyWeek : undefined,
      birthDate: formattedBirthDate,
      role: selectedRole,
    }

    setIsStarting(true)
    setSetupError(null)
    setCheckupMessage(null)

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeks: status === 'pregnant' ? Number(pregnancyWeek) : 0,
          status,
          role: onboardingPayload.role,
          birthDate: onboardingPayload.birthDate,
          babyName: onboardingPayload.babyName,
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
        babyName: onboardingPayload.babyName,
        status,
        weeks: onboardingPayload.pregnancyWeek,
        birthDate: onboardingPayload.birthDate,
        role: onboardingPayload.role,
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
        name: onboardingPayload.babyName,
        status,
        role: onboardingPayload.role,
        birthDate: onboardingPayload.birthDate,
        fresh: 'true',
      })

      if (status === 'pregnant' && onboardingPayload.pregnancyWeek) {
        params.set('weeks', onboardingPayload.pregnancyWeek)
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

        <form
          autoComplete="off"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void handleStart()
          }}
          className="flex flex-col gap-6 rounded-3xl border border-white/25 bg-white/15 p-5 backdrop-blur-md sm:p-6"
        >
          <div className={fieldGroupClassName}>
            <label htmlFor="babyName" className="block text-sm font-semibold text-white">
              태명
            </label>
            <input
              id="babyName"
              name="babyName"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              value={babyName}
              onChange={(event) => setBabyName(event.target.value)}
              placeholder="태명을 입력해주세요"
              className={inputClassName}
            />
          </div>

          <fieldset className={`${fieldGroupClassName} border-0 p-0`}>
            <legend className="mb-0 block text-sm font-semibold text-white">
              생년월일을 입력해주세요
            </legend>
            <div className="grid grid-cols-3 gap-2 pt-3">
              <div className="min-w-0">
                <label htmlFor="birthYear" className="sr-only">
                  연도
                </label>
                <select
                  id="birthYear"
                  name="birthYear"
                  autoComplete="off"
                  value={birthYear}
                  onChange={(event) => handleBirthYearChange(event.target.value)}
                  className={`${selectClassName} ${!birthYear ? 'text-white/50' : ''}`}
                >
                  <option value="">연도</option>
                  {BIRTH_YEARS.map((year) => (
                    <option key={year} value={String(year)} className="text-gray-900">
                      {year}년
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label htmlFor="birthMonth" className="sr-only">
                  월
                </label>
                <select
                  id="birthMonth"
                  name="birthMonth"
                  autoComplete="off"
                  value={birthMonth}
                  onChange={(event) => handleBirthMonthChange(event.target.value)}
                  className={`${selectClassName} ${!birthMonth ? 'text-white/50' : ''}`}
                >
                  <option value="">월</option>
                  {MONTHS.map((month) => (
                    <option key={month} value={String(month)} className="text-gray-900">
                      {month}월
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label htmlFor="birthDay" className="sr-only">
                  일
                </label>
                <select
                  id="birthDay"
                  name="birthDay"
                  autoComplete="off"
                  value={birthDay}
                  onChange={(event) => handleBirthDayChange(event.target.value)}
                  disabled={!birthYear || !birthMonth}
                  className={`${selectClassName} ${!birthDay ? 'text-white/50' : ''}`}
                >
                  <option value="">일</option>
                  {dayOptions.map((day) => (
                    <option key={day} value={String(day)} className="text-gray-900">
                      {day}일
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {birthDateError && (
              <p className="text-xs text-rose-200">{birthDateError}</p>
            )}
          </fieldset>

          <div className={fieldGroupClassName} role="group" aria-labelledby="role-label">
            <p id="role-label" className="text-sm font-semibold text-white">
              역할을 선택해주세요
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                id="role-wife"
                type="button"
                aria-pressed={role === 'wife'}
                onClick={handleSelectWife}
                className={`relative z-10 min-h-[44px] rounded-2xl py-3 text-center text-sm transition ${
                  role === 'wife'
                    ? 'bg-white font-semibold text-purple-700 shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                아내
              </button>
              <button
                id="role-husband"
                type="button"
                aria-pressed={role === 'husband'}
                onClick={handleSelectHusband}
                className={`relative z-10 min-h-[44px] rounded-2xl py-3 text-center text-sm transition ${
                  role === 'husband'
                    ? 'bg-white font-semibold text-purple-700 shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                남편
              </button>
            </div>
            {roleError && <p className="text-xs text-rose-200">{roleError}</p>}
          </div>

          <div className={fieldGroupClassName} role="group" aria-labelledby="status-label">
            <p id="status-label" className="text-sm font-semibold text-white">
              지금 어떤 상황이에요?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('preparing')}
                className={`relative z-10 min-h-[44px] rounded-2xl py-3 text-center text-sm transition ${
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
                className={`relative z-10 min-h-[44px] rounded-2xl py-3 text-center text-sm transition ${
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
            <div className={fieldGroupClassName}>
              <label htmlFor="pregnancyWeek" className="block text-sm font-semibold text-white">
                지금 몇 주차예요?
              </label>
              <input
                id="pregnancyWeek"
                name="pregnancyWeek"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                min={1}
                max={42}
                value={pregnancyWeek}
                onChange={(event) => setPregnancyWeek(event.target.value)}
                placeholder="예: 26"
                className={inputClassName}
              />
              <p className="text-xs text-white/60">1주~42주 사이로 입력해주세요</p>
            </div>
          )}
        </form>

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
          onClick={() => void handleStart()}
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
