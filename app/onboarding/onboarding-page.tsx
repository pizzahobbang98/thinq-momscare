'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import BirthDatePicker, {
  BIRTH_MONTHS,
  BIRTH_YEARS,
  formatBirthDate,
  getDaysInMonth,
  type BirthDatePickerField,
} from '@/components/onboarding/BirthDatePicker'
import PickerSheet from '@/components/onboarding/PickerSheet'
import {
  saveOnboardingProfile,
  type OnboardingRole,
  type OnboardingStatus,
} from '@/lib/onboarding-profile'
import { calculateDueDateFromWeeks, savePregnancyJourneyToStorage } from '@/lib/pregnancy'
import {
  buildDefaultWifeProfile,
  mergeWifeProfile,
  readWifeProfile,
  saveWifeProfile,
} from '@/lib/wife-profile-storage'

const inputClassName =
  'onboarding-input min-h-[48px] w-full rounded-2xl border border-[#E6E8EC] bg-white px-4 text-base text-[#202124] placeholder:text-[#9CA3AF] focus:border-[#F3A6A6] focus:outline-none focus:ring-2 focus:ring-[#FCE7E7]'

const fieldGroupClassName = 'space-y-3'

function choiceButtonClassName(selected: boolean) {
  return `min-h-[48px] rounded-2xl border px-3 py-3 text-center text-sm transition ${
    selected
      ? 'border-[#F3CFCF] bg-[#FFF1F1] font-semibold text-[#D84C4C]'
      : 'border-[#E6E8EC] bg-[#F8F8F8] text-[#374151] hover:border-[#D1D5DB] hover:bg-white'
  }`
}

export default function OnboardingPage() {
  const router = useRouter()
  const [babyName, setBabyName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [role, setRole] = useState<OnboardingRole | ''>('')
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [pregnancyWeek, setPregnancyWeek] = useState('')
  const [pregnancyDay, setPregnancyDay] = useState('0')
  const [activePicker, setActivePicker] = useState<BirthDatePickerField | null>(null)
  const [dayHint, setDayHint] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [birthDateError, setBirthDateError] = useState<string | null>(null)
  const [checkupMessage, setCheckupMessage] = useState<string | null>(null)

  const pickerOpen = activePicker !== null

  const dayOptions = useMemo(() => {
    if (!birthYear || !birthMonth) return []
    const maxDays = getDaysInMonth(Number(birthYear), Number(birthMonth))
    return Array.from({ length: maxDays }, (_, i) => i + 1)
  }, [birthYear, birthMonth])

  const yearOptions = useMemo(
    () => BIRTH_YEARS.map((year) => ({ label: `${year}년`, value: String(year) })),
    [],
  )

  const monthOptions = useMemo(
    () => BIRTH_MONTHS.map((month) => ({ label: `${month}월`, value: String(month) })),
    [],
  )

  const dayPickerOptions = useMemo(
    () => dayOptions.map((day) => ({ label: `${day}일`, value: String(day) })),
    [dayOptions],
  )

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

  function openDayPicker() {
    if (!birthYear || !birthMonth) {
      setDayHint('연도와 월을 먼저 선택해주세요.')
      return
    }
    setDayHint(null)
    setActivePicker('day')
  }

  const isStartDisabled =
    !babyName.trim() ||
    !status ||
    (status === 'pregnant' &&
      (!pregnancyWeek ||
        Number(pregnancyWeek) < 1 ||
        Number(pregnancyWeek) > 42 ||
        Number(pregnancyDay) < 0 ||
        Number(pregnancyDay) > 6)) ||
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
      pregnancyDay: status === 'pregnant' ? pregnancyDay : undefined,
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
        pregnancyDay: onboardingPayload.pregnancyDay,
        birthDate: onboardingPayload.birthDate,
        role: onboardingPayload.role,
      })

      const pregnancyWeekNumber =
        status === 'pregnant' && onboardingPayload.pregnancyWeek
          ? Number(onboardingPayload.pregnancyWeek)
          : null
      const pregnancyDayNumber =
        status === 'pregnant' && onboardingPayload.pregnancyDay != null
          ? Number(onboardingPayload.pregnancyDay)
          : null
      const dueDate =
        pregnancyWeekNumber != null ? calculateDueDateFromWeeks(pregnancyWeekNumber) : null

      if (status === 'pregnant' && pregnancyWeekNumber != null) {
        savePregnancyJourneyToStorage({
          week: pregnancyWeekNumber,
          day: pregnancyDayNumber ?? 0,
          nickname: trimmedBabyName,
        })
      }

      saveWifeProfile(
        mergeWifeProfile(readWifeProfile() ?? buildDefaultWifeProfile({}), {
          babyName: trimmedBabyName,
          pregnancyStatus: status,
          pregnancyWeek: pregnancyWeekNumber,
          pregnancyDay: pregnancyDayNumber,
          dueDate,
          preparationStartDate: status === 'preparing' ? formattedBirthDate : null,
        }),
      )

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
    <>
      <div
        className="flex min-h-dvh flex-col items-center overflow-x-hidden bg-[#F8F8F8] px-4 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
        aria-hidden={pickerOpen}
      >
        <div className="flex w-full max-w-[430px] flex-col gap-6">
          <header className="flex flex-col items-center pt-2 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#E6E8EC] bg-white text-3xl shadow-sm">
              🏠
            </div>
            <h1 className="text-2xl font-bold text-[#202124]">ThinQ Mom</h1>
            <p className="mt-2 text-sm text-[#6B7280]">가전과 함께하는 스마트 케어를 시작해요</p>
          </header>

          <div className="rounded-3xl border border-[#E6E8EC] bg-white p-5 shadow-sm sm:p-6">
            <form
              autoComplete="off"
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                void handleStart()
              }}
              className="flex flex-col gap-4"
            >
              <div className={fieldGroupClassName}>
                <label htmlFor="babyName" className="block text-sm font-semibold text-[#202124]">
                  태명
                </label>
                <input
                  id="babyName"
                  name="babyName"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore
                  data-form-type="other"
                  value={babyName}
                  onChange={(event) => setBabyName(event.target.value)}
                  placeholder="태명을 입력해주세요"
                  className={inputClassName}
                />
              </div>

              <BirthDatePicker
                birthYear={birthYear}
                birthMonth={birthMonth}
                birthDay={birthDay}
                onOpenYear={() => {
                  setDayHint(null)
                  setActivePicker('year')
                }}
                onOpenMonth={() => {
                  setDayHint(null)
                  setActivePicker('month')
                }}
                onOpenDay={openDayPicker}
                dayHint={dayHint}
                errorMessage={birthDateError}
              />

              <div className={fieldGroupClassName} role="group" aria-labelledby="role-label">
                <p id="role-label" className="text-sm font-semibold text-[#202124]">
                  역할을 선택해주세요
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="role-wife"
                    type="button"
                    aria-pressed={role === 'wife'}
                    onClick={() => {
                      setRole('wife')
                      setRoleError(null)
                    }}
                    className={choiceButtonClassName(role === 'wife')}
                  >
                    아내
                  </button>
                  <button
                    id="role-husband"
                    type="button"
                    aria-pressed={role === 'husband'}
                    onClick={() => {
                      setRole('husband')
                      setRoleError(null)
                    }}
                    className={choiceButtonClassName(role === 'husband')}
                  >
                    남편
                  </button>
                </div>
                {roleError && <p className="text-xs text-rose-500">{roleError}</p>}
              </div>

              <div className={fieldGroupClassName} role="group" aria-labelledby="status-label">
                <p id="status-label" className="text-sm font-semibold text-[#202124]">
                  지금 어떤 상황이에요?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('preparing')}
                    className={choiceButtonClassName(status === 'preparing')}
                  >
                    임신 준비 중이에요
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('pregnant')}
                    className={choiceButtonClassName(status === 'pregnant')}
                  >
                    임신 중이에요
                  </button>
                </div>
              </div>

              {status === 'pregnant' && (
                <div className={fieldGroupClassName}>
                  <label htmlFor="pregnancyWeek" className="block text-sm font-semibold text-[#202124]">
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
                  <label htmlFor="pregnancyDay" className="mt-3 block text-sm font-semibold text-[#202124]">
                    추가 일차 (0~6일)
                  </label>
                  <input
                    id="pregnancyDay"
                    name="pregnancyDay"
                    type="number"
                    inputMode="numeric"
                    autoComplete="off"
                    min={0}
                    max={6}
                    value={pregnancyDay}
                    onChange={(event) => setPregnancyDay(event.target.value)}
                    placeholder="예: 3"
                    className={inputClassName}
                  />
                  <p className="text-xs text-[#6B7280]">
                    예: 8주 3일차라면 주차 8, 추가 일차 3을 입력해주세요
                  </p>
                </div>
              )}
            </form>
          </div>

          {checkupMessage && (
            <p className="whitespace-pre-line text-center text-sm font-medium text-emerald-600">
              {checkupMessage}
            </p>
          )}

          {setupError && (
            <p className="text-center text-sm text-rose-500">{setupError}</p>
          )}

          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={isStartDisabled}
            className="min-h-[52px] w-full rounded-[18px] bg-[#111827] py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF]"
          >
            {isStarting ? '잠깐만요...' : '시작하기'}
          </button>

          <p className="text-center text-xs text-[#9CA3AF]">
            임신 준비 중이어도 시작할 수 있어요
          </p>
        </div>
      </div>

      <PickerSheet
        open={activePicker === 'year'}
        title="연도 선택"
        options={yearOptions}
        selectedValue={birthYear}
        onSelect={handleBirthYearChange}
        onClose={() => setActivePicker(null)}
      />

      <PickerSheet
        open={activePicker === 'month'}
        title="월 선택"
        options={monthOptions}
        selectedValue={birthMonth}
        onSelect={handleBirthMonthChange}
        onClose={() => setActivePicker(null)}
      />

      <PickerSheet
        open={activePicker === 'day'}
        title="일 선택"
        options={dayPickerOptions}
        selectedValue={birthDay}
        onSelect={handleBirthDayChange}
        onClose={() => setActivePicker(null)}
      />
    </>
  )
}
