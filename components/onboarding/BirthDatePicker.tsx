'use client'

export const BIRTH_YEAR_START = 1970
export const BIRTH_YEAR_END = 2008
export const BIRTH_YEARS = Array.from(
  { length: BIRTH_YEAR_END - BIRTH_YEAR_START + 1 },
  (_, i) => BIRTH_YEAR_START + i,
)
export const BIRTH_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export type BirthDatePickerField = 'year' | 'month' | 'day'

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function formatBirthDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

type BirthDatePickerProps = {
  birthYear: string
  birthMonth: string
  birthDay: string
  onOpenYear: () => void
  onOpenMonth: () => void
  onOpenDay: () => void
  dayHint?: string | null
  errorMessage?: string | null
}

const pickerButtonClassName = (hasValue: boolean, disabled = false) =>
  `flex min-h-[48px] w-full items-center justify-center rounded-2xl border px-2 text-sm transition ${
    disabled
      ? 'cursor-not-allowed border-[#E6E8EC] bg-[#F3F4F6] text-[#9CA3AF]'
      : hasValue
        ? 'border-[#E6E8EC] bg-white font-medium text-[#202124]'
        : 'border-[#E6E8EC] bg-[#F8F8F8] text-[#9CA3AF]'
  }`

export default function BirthDatePicker({
  birthYear,
  birthMonth,
  birthDay,
  onOpenYear,
  onOpenMonth,
  onOpenDay,
  dayHint,
  errorMessage,
}: BirthDatePickerProps) {
  return (
    <div className="space-y-3">
      <p id="birth-date-label" className="text-sm font-semibold text-[#202124]">
        생년월일을 입력해주세요
      </p>

      <div
        role="group"
        aria-labelledby="birth-date-label"
        className="grid grid-cols-3 gap-2"
      >
        <button
          id="birthYear"
          type="button"
          onClick={onOpenYear}
          className={pickerButtonClassName(Boolean(birthYear))}
        >
          {birthYear ? `${birthYear}년` : '연도'}
        </button>

        <button
          id="birthMonth"
          type="button"
          onClick={onOpenMonth}
          className={pickerButtonClassName(Boolean(birthMonth))}
        >
          {birthMonth ? `${birthMonth}월` : '월'}
        </button>

        <button
          id="birthDay"
          type="button"
          onClick={onOpenDay}
          disabled={!birthYear || !birthMonth}
          className={pickerButtonClassName(Boolean(birthDay), !birthYear || !birthMonth)}
        >
          {birthDay ? `${birthDay}일` : '일'}
        </button>
      </div>

      {dayHint && <p className="text-xs text-[#6B7280]">{dayHint}</p>}
      {errorMessage && <p className="text-xs text-rose-500">{errorMessage}</p>}
    </div>
  )
}
