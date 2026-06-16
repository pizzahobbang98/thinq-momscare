import { getPregnancyFruit } from '@/lib/pregnancy-fruit'
import { normalizeFetalGrowthData, type RawGrowthItem } from './normalizeFetalGrowthData'

export type FetalGrowthWeek = {
  week: number
  label: string
  sizeCm?: number
  weightG?: number
  objectKey: string
  objectScale: number
  fetusScale: number
  description?: string
  accentColor?: string
}

// 주차별 대략적인 키(cm) — 모니터/설명 보강용 참고값 (의료 진단 아님)
const APPROX_SIZE_CM: Record<number, number> = {
  8: 1.6, 10: 3.1, 12: 5.4, 14: 8.7, 16: 11.6, 18: 14.2, 20: 25.6, 22: 27.8,
  24: 30, 26: 35.6, 28: 37.6, 30: 39.9, 32: 42.4, 34: 45, 36: 47.4, 38: 49.8,
}

const SOURCE_WEEKS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38]

// 앱의 기존 데이터(lib/pregnancy-fruit.ts)를 공개 API로 읽어 정규화합니다.
const rawFromApp: RawGrowthItem[] = SOURCE_WEEKS.map((week) => {
  const fruit = getPregnancyFruit(week)
  return {
    week,
    fruitName: fruit.fruitName,
    label: fruit.fruitName,
    description: fruit.description,
    sizeCm: APPROX_SIZE_CM[week],
  }
})

export const fetalGrowthData: FetalGrowthWeek[] = normalizeFetalGrowthData(rawFromApp)

// 데이터가 비었을 때를 위한 안전 폴백 (교체 가능)
export const fallbackFetalGrowthData: FetalGrowthWeek[] = normalizeFetalGrowthData([
  { week: 8, fruitName: '라즈베리', sizeCm: 1.6, description: '작은 열매만큼 자라기 시작했어요.' },
  { week: 12, fruitName: '라임', sizeCm: 5.4, description: '작은 과일만큼 또렷하게 자라고 있어요.' },
  { week: 20, fruitName: '바나나', sizeCm: 25, description: '아기의 움직임이 더 또렷해지는 시기예요.' },
  { week: 41, fruitName: '수박', sizeCm: 51.2, description: '이제 곧 만날 시간이 가까워졌어요.' },
])

// 선택 주차에 해당하는 데이터를 찾되, 없으면 가장 가까운 주차(없으면 마지막)로 폴백합니다.
export function findGrowthWeek(
  data: FetalGrowthWeek[],
  week: number | null | undefined,
): FetalGrowthWeek | null {
  if (data.length === 0) return null
  if (week == null || !Number.isFinite(week)) return data[data.length - 1]
  let closest = data[0]
  for (const item of data) {
    if (item.week === week) return item
    if (Math.abs(item.week - week) < Math.abs(closest.week - week)) closest = item
  }
  return closest
}
