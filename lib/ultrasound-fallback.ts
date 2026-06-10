import {
  buildDefaultAiMessage,
  getPregnancyFruit,
  ULTRASOUND_DISCLAIMER,
} from '@/lib/pregnancy-fruit'
import {
  resolveUltrasoundBabyName,
  resolveUltrasoundPregnancyWeek,
} from '@/lib/ultrasound-defaults'
import {
  buildFallbackQuality,
  buildUltrasoundMemoryCard,
  memoryCardToResponseFields,
} from '@/lib/ultrasound-memory'
import type { UltrasoundQualityScores } from '@/lib/ultrasound-quality'
import type { UltrasoundAnalyzeResponse } from '@/lib/ultrasound-types'

export function buildFallbackAnalyzeResponse(options: {
  pregnancyWeek?: number | null
  babyName?: string | null
  imagePreviewUrl?: string | null
  quality?: UltrasoundQualityScores
  partialError?: string
}): UltrasoundAnalyzeResponse {
  const pregnancyWeek = resolveUltrasoundPregnancyWeek(options.pregnancyWeek)
  const babyName = resolveUltrasoundBabyName(options.babyName)
  const quality = options.quality ?? buildFallbackQuality()
  const fruit = getPregnancyFruit(pregnancyWeek)

  const memoryCard = buildUltrasoundMemoryCard({
    quality,
    plane: null,
    pregnancyWeek,
    babyName,
  })

  return {
    success: true,
    fruitName: fruit.fruitName,
    fruitEmoji: fruit.fruitEmoji,
    fruitDescription: fruit.description,
    aiMessage: buildDefaultAiMessage(fruit, pregnancyWeek, babyName),
    imagePreviewUrl: options.imagePreviewUrl ?? undefined,
    pregnancyWeek,
    savedToDb: false,
    savedToStorage: false,
    disclaimer: ULTRASOUND_DISCLAIMER,
    memoryCard,
    ...memoryCardToResponseFields(memoryCard),
    error: options.partialError,
  }
}

export function isValidationAnalyzeError(status: number, data: UltrasoundAnalyzeResponse | null) {
  return status === 400 && data?.success === false
}
