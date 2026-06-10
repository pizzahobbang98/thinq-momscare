export const DEFAULT_ULTRASOUND_PREGNANCY_WEEK = 24
export const DEFAULT_ULTRASOUND_BABY_NAME = '아기'

export function resolveUltrasoundPregnancyWeek(week: number | null | undefined): number {
  if (week == null || !Number.isFinite(week) || week < 1) {
    return DEFAULT_ULTRASOUND_PREGNANCY_WEEK
  }
  return Math.min(42, Math.max(1, Math.round(week)))
}

export function resolveUltrasoundBabyName(name: string | null | undefined): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed : DEFAULT_ULTRASOUND_BABY_NAME
}
