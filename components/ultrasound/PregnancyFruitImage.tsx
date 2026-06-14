'use client'

const FRUIT_SPRITE_WEEKS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38]

type PregnancyFruitImageProps = {
  pregnancyWeek: number
  fruitName: string
  className?: string
}

export default function PregnancyFruitImage({
  pregnancyWeek,
  fruitName,
  className = '',
}: PregnancyFruitImageProps) {
  const matchedIndex = FRUIT_SPRITE_WEEKS.findLastIndex((week) => week <= pregnancyWeek)
  const fruitIndex = Math.max(0, matchedIndex)
  const column = fruitIndex % 4
  const row = Math.floor(fruitIndex / 4)

  return (
    <div
      role="img"
      aria-label={`${fruitName} 성장 비유`}
      className={`bg-white bg-no-repeat ${className}`}
      style={{
        backgroundImage: "url('/images/pregnancy-fruit-sprite.png')",
        backgroundPosition: `${column * 33.333}% ${row * 33.333}%`,
        backgroundSize: '400% 400%',
      }}
    />
  )
}
