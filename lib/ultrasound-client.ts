import {
  resolveUltrasoundBabyName,
  resolveUltrasoundPregnancyWeek,
} from '@/lib/ultrasound-defaults'
import {
  buildFallbackAnalyzeResponse,
  isValidationAnalyzeError,
} from '@/lib/ultrasound-fallback'
import { buildFallbackQuality } from '@/lib/ultrasound-memory'
import { computeUltrasoundQualityFromImageFile } from '@/lib/ultrasound-quality'
import type { UltrasoundAnalyzeResponse } from '@/lib/ultrasound-types'

export type UltrasoundSubmitResult =
  | { ok: true; data: UltrasoundAnalyzeResponse; usedClientFallback: boolean }
  | { ok: false; error: string }

async function readQualityScores(file: File) {
  try {
    return await computeUltrasoundQualityFromImageFile(file)
  } catch (error) {
    console.warn('[ultrasound-client] image quality fallback used:', error)
    return buildFallbackQuality()
  }
}

export async function submitUltrasoundAnalyze(options: {
  file: File
  pregnancyWeek: number | null
  babyName: string | null
  imagePreviewUrl?: string | null
}): Promise<UltrasoundSubmitResult> {
  const pregnancyWeek = options.pregnancyWeek == null
    ? null
    : resolveUltrasoundPregnancyWeek(options.pregnancyWeek)
  const babyName = resolveUltrasoundBabyName(options.babyName)
  const quality = await readQualityScores(options.file)

  const formData = new FormData()
  formData.append('image', options.file)
  formData.append('sharpnessScore', String(quality.sharpnessScore))
  formData.append('brightnessScore', String(quality.brightnessScore))
  formData.append('contrastScore', String(quality.contrastScore))
  formData.append('noiseScore', String(quality.noiseScore))
  formData.append('sectorScore', String(quality.sectorScore))
  formData.append('qualityScore', String(quality.qualityScore))
  if (pregnancyWeek !== null) {
    formData.append('pregnancyWeek', String(pregnancyWeek))
  }
  formData.append('babyName', babyName)

  try {
    const response = await fetch('/api/ultrasound/analyze', {
      method: 'POST',
      body: formData,
    })

    let data: UltrasoundAnalyzeResponse | null = null
    try {
      data = (await response.json()) as UltrasoundAnalyzeResponse
    } catch (parseError) {
      console.warn('[ultrasound-client] analyze response parse failed:', parseError)
    }

    if (isValidationAnalyzeError(response.status, data)) {
      return { ok: false, error: data?.error ?? '요청을 처리할 수 없어요.' }
    }

    if (!data?.success || !data.memoryCard) {
      const fallback = buildFallbackAnalyzeResponse({
        pregnancyWeek,
        babyName,
        imagePreviewUrl: options.imagePreviewUrl,
        quality,
        partialError: data?.error ?? '일부 기능을 기본값으로 대체했어요.',
      })
      return { ok: true, data: fallback, usedClientFallback: true }
    }

    return { ok: true, data, usedClientFallback: false }
  } catch (error) {
    console.warn('[ultrasound-client] analyze request failed, using fallback card:', error)
    const fallback = buildFallbackAnalyzeResponse({
      pregnancyWeek,
      babyName,
      imagePreviewUrl: options.imagePreviewUrl,
      quality,
      partialError: '연결 문제로 기본 감성 카드를 만들었어요.',
    })
    return { ok: true, data: fallback, usedClientFallback: true }
  }
}
