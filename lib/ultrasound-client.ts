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

const ANALYZE_MAX_DIMENSION = 1280
const ANALYZE_JPEG_QUALITY = 0.82
const ANALYZE_COMPRESS_THRESHOLD = 900 * 1024
const inFlightAnalyzeRequests = new Map<string, Promise<UltrasoundSubmitResult>>()

function parsePregnancyWeekFromFileName(fileName: string) {
  const normalized = fileName.trim().replace(/\.[^.]+$/, '')
  const patterns = [
    /(?:^|[^0-9])(\d{1,2})\s*주(?:차)?(?=$|[^0-9])/,
    /(?:^|[^0-9])(\d{1,2})\s*(?:weeks?|w)(?=$|[^a-z0-9])/i,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    const week = match ? Number(match[1]) : null
    if (week && Number.isInteger(week) && week >= 1 && week <= 42) return week
  }

  return null
}

function resolveAnalyzePregnancyWeek(file: File, pregnancyWeek: number | null) {
  const fileNameWeek = parsePregnancyWeekFromFileName(file.name)
  if (fileNameWeek !== null) return fileNameWeek
  return pregnancyWeek == null ? null : resolveUltrasoundPregnancyWeek(pregnancyWeek)
}

function getAnalyzeCacheKey(file: File, pregnancyWeek: number | null, babyName: string) {
  return [
    file.name,
    file.size,
    file.lastModified,
    pregnancyWeek ?? 'auto',
    babyName,
  ].join(':')
}

async function readQualityScores(file: File) {
  try {
    return await computeUltrasoundQualityFromImageFile(file)
  } catch (error) {
    console.warn('[ultrasound-client] image quality fallback used:', error)
    return buildFallbackQuality()
  }
}

async function prepareAnalyzeImage(file: File): Promise<File> {
  if (
    typeof window === 'undefined'
    || !file.type.startsWith('image/')
    || file.size <= ANALYZE_COMPRESS_THRESHOLD
  ) {
    return file
  }

  return new Promise((resolve) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      try {
        const scale = Math.min(1, ANALYZE_MAX_DIMENSION / Math.max(image.width, image.height))
        if (scale >= 1 && file.type === 'image/jpeg') {
          resolve(file)
          return
        }

        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          resolve(file)
          return
        }

        context.drawImage(image, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file)
              return
            }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: file.lastModified,
            }))
          },
          'image/jpeg',
          ANALYZE_JPEG_QUALITY,
        )
      } catch {
        resolve(file)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    image.src = objectUrl
  })
}

async function submitUltrasoundAnalyzeOnce(options: {
  file: File
  pregnancyWeek: number | null
  babyName: string | null
  imagePreviewUrl?: string | null
}): Promise<UltrasoundSubmitResult> {
  const pregnancyWeek = resolveAnalyzePregnancyWeek(options.file, options.pregnancyWeek)
  const babyName = resolveUltrasoundBabyName(options.babyName)
  const analyzeFile = await prepareAnalyzeImage(options.file)
  const quality = await readQualityScores(analyzeFile)

  const formData = new FormData()
  formData.append('image', analyzeFile)
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

export async function submitUltrasoundAnalyze(options: {
  file: File
  pregnancyWeek: number | null
  babyName: string | null
  imagePreviewUrl?: string | null
}): Promise<UltrasoundSubmitResult> {
  const pregnancyWeek = resolveAnalyzePregnancyWeek(options.file, options.pregnancyWeek)
  const babyName = resolveUltrasoundBabyName(options.babyName)
  const cacheKey = getAnalyzeCacheKey(options.file, pregnancyWeek, babyName)
  const inFlight = inFlightAnalyzeRequests.get(cacheKey)
  if (inFlight) return inFlight

  const request = submitUltrasoundAnalyzeOnce(options)
  inFlightAnalyzeRequests.set(cacheKey, request)
  try {
    return await request
  } finally {
    inFlightAnalyzeRequests.delete(cacheKey)
  }
}
