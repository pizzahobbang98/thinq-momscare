'use client'

import {
  Avocado,
  Banana,
  Broccoli,
  Eggplant,
  GenericFruit,
  Grape,
  Lime,
  Melon,
  Peach,
  Pumpkin,
  Raspberry,
  Watermelon,
} from './growthObjects'

const OBJECT_MAP: Record<string, () => React.ReactElement> = {
  watermelon: Watermelon,
  lime: Lime,
  avocado: Avocado,
  banana: Banana,
  pumpkin: Pumpkin,
  raspberry: Raspberry,
  peach: Peach,
  grape: Grape,
  eggplant: Eggplant,
  broccoli: Broccoli,
  melon: Melon,
}

export default function GrowthObjectRenderer({
  objectKey,
  accentColor,
}: {
  objectKey: string
  accentColor?: string
}) {
  const Component = OBJECT_MAP[objectKey]
  if (Component) return <Component />

  if (process.env.NODE_ENV === 'development' && objectKey !== 'generic') {
    console.warn(`[GrowthObjectRenderer] 알 수 없는 objectKey "${objectKey}" — GenericFruit로 대체합니다.`)
  }
  return <GenericFruit color={accentColor} />
}
