import type { FetalGrowthWeek } from './fetalGrowthData'

// 원본 데이터 스키마가 달라도 UI가 직접 의존하지 않도록 정규화하는 어댑터입니다.
// (원본 lib/pregnancy-fruit.ts 는 수정하지 않습니다.)
export type RawGrowthItem = {
  week: number
  fruitName?: string
  label?: string
  description?: string
  sizeCm?: number
  weightG?: number
}

// 한글 과일명 -> 렌더링할 SVG 오브젝트 키
const OBJECT_KEY_BY_FRUIT: Record<string, string> = {
  라즈베리: 'raspberry',
  딸기: 'raspberry',
  라임: 'lime',
  레몬: 'lime',
  아보카도: 'avocado',
  고구마: 'generic',
  바나나: 'banana',
  파파야: 'generic',
  옥수수: 'generic',
  가지: 'eggplant',
  코코넛: 'generic',
  양배추: 'broccoli',
  호박: 'pumpkin',
  멜론: 'melon',
  '로메인 상추': 'broccoli',
  수박: 'watermelon',
  복숭아: 'peach',
  포도: 'grape',
  브로콜리: 'broccoli',
}

export const ACCENT_BY_OBJECT: Record<string, string> = {
  watermelon: '#E36B86',
  lime: '#A7C957',
  avocado: '#9CB257',
  banana: '#F2C84B',
  pumpkin: '#E8A15A',
  raspberry: '#D6557E',
  peach: '#F2A38C',
  grape: '#9A7BC2',
  eggplant: '#8E6BB0',
  broccoli: '#8FB36B',
  melon: '#BCD97A',
  generic: '#E59BB1',
}

const MIN_WEEK = 8
const MAX_WEEK = 41

// 주차에 따라 0~1로 보간해 오브젝트/태아 크기를 만듭니다.
export function scaleForWeek(week: number, min: number, max: number) {
  const t = Math.min(1, Math.max(0, (week - MIN_WEEK) / (MAX_WEEK - MIN_WEEK)))
  return Math.round((min + (max - min) * t) * 100) / 100
}

export function resolveObjectKey(fruitName?: string): string {
  if (!fruitName) return 'generic'
  return OBJECT_KEY_BY_FRUIT[fruitName.trim()] ?? 'generic'
}

export function normalizeFetalGrowthData(raw: RawGrowthItem[]): FetalGrowthWeek[] {
  return raw
    .filter((item) => item && Number.isFinite(item.week))
    .map((item) => {
      const label = item.label ?? item.fruitName ?? '과일'
      const objectKey = resolveObjectKey(item.fruitName ?? item.label)
      return {
        week: Math.round(item.week),
        label,
        sizeCm: item.sizeCm,
        weightG: item.weightG,
        objectKey,
        objectScale: scaleForWeek(item.week, 0.46, 1.05),
        fetusScale: scaleForWeek(item.week, 0.4, 1),
        description: item.description,
        accentColor: ACCENT_BY_OBJECT[objectKey] ?? ACCENT_BY_OBJECT.generic,
      }
    })
    .sort((a, b) => a.week - b.week)
}
