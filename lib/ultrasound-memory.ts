import { getPregnancyFruit } from '@/lib/pregnancy-fruit'
import {
  resolveUltrasoundBabyName,
  resolveUltrasoundPregnancyWeek,
} from '@/lib/ultrasound-defaults'
import type { UltrasoundPlaneResult, UltrasoundSceneCategory } from '@/lib/ultrasound-huggingface'
import { getSceneCopy } from '@/lib/ultrasound-huggingface'
import type { UltrasoundQualityScores } from '@/lib/ultrasound-quality'
import type { UltrasoundMemoryCardData } from '@/lib/ultrasound-types'

const FORBIDDEN_PATTERNS = [
  /정상/g,
  /비정상/g,
  /건강합니다/g,
  /건강해/g,
  /질환/g,
  /위험/g,
  /의학적으로/g,
  /진단/g,
  /판독/g,
  /판별/g,
  /이상 없/g,
  /의료/g,
  /CRL/gi,
  /BPD/gi,
  /\bFL\b/gi,
  /측정/g,
  /주수 판정/g,
]

export type RecordLabel = '좋음' | '보통' | '낮음'

const RECORD_NOTES: Record<RecordLabel, string> = {
  좋음: '사진 속 형태와 구도가 비교적 또렷해 성장 기록으로 남기기 좋아요.',
  보통: '조금 흐리거나 구도가 제한적이지만 오늘의 기록으로 저장할 수 있어요.',
  낮음: '사진이 다소 흐리거나 초음파 기록으로 보기 어려운 부분이 있어요. 그래도 참고용 기록으로 남길 수 있어요.',
}

export function sanitizeMemoryCopy(text: string) {
  let sanitized = text.trim()
  for (const pattern of FORBIDDEN_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }
  return sanitized.replace(/\s{2,}/g, ' ').trim()
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function computeFinalRecordScore(qualityScore: number, hfSceneScore: number | null) {
  if (hfSceneScore === null) return clampScore(qualityScore)
  return clampScore(qualityScore * 0.7 + hfSceneScore * 0.3)
}

export function computeAdjustedRecordScore(
  finalRecordScore: number,
  quality: UltrasoundQualityScores,
) {
  let adjusted = finalRecordScore
  if (quality.sectorScore < 45) adjusted -= 18
  if (quality.contrastScore < 35) adjusted -= 8
  return clampScore(adjusted)
}

export function getRecordLabel(score: number): RecordLabel {
  if (score >= 80) return '좋음'
  if (score >= 60) return '보통'
  return '낮음'
}

export function getRecordNote(score: number) {
  return RECORD_NOTES[getRecordLabel(score)]
}

function buildTitle(babyName: string, sceneCategory: UltrasoundSceneCategory) {
  switch (sceneCategory) {
    case 'face_head':
      return `${babyName}를 조금 더 가까이 본 날`
    case 'body_outline':
      return `${babyName}의 성장을 차분히 기록한 날`
    case 'limb_movement':
      return `${babyName}의 작은 움직임을 느낀 날`
    default:
      return `${babyName}의 오늘을 기록한 날`
  }
}

function buildGrowthText(pregnancyWeek: number | null, babyName: string) {
  const week = resolveUltrasoundPregnancyWeek(pregnancyWeek)
  const fruit = getPregnancyFruit(week)
  return sanitizeMemoryCopy(
    `${week}주차의 ${babyName}는 ${fruit.fruitName}만큼 자란 시기로 비유할 수 있어요. 튼튼하게 자라며 세상을 느끼고 있는 시기예요.`,
  )
}

function buildBabyVoiceText() {
  return sanitizeMemoryCopy(
    '엄마, 오늘 내 사진을 남겨줘서 고마워요. 나를 조금 더 가까이 느낀 날로 기억해줘요.',
  )
}

function buildDiarySnippet(babyName: string) {
  return sanitizeMemoryCopy(
    `오늘은 초음파 사진을 보며 ${babyName}를 더 가까이 느낀 하루였다. 작은 사진 한 장이지만 오래 기억하고 싶은 순간이 생겼다.`,
  )
}

function buildTags(pregnancyWeek: number | null, adjustedRecordScore: number) {
  const week = resolveUltrasoundPregnancyWeek(pregnancyWeek)
  const tags = [`#${week}주차기록`, '#초음파메모리', '#성장기록', '#소중한기록']
  tags.push(adjustedRecordScore >= 60 ? '#선명한기록' : '#흐려도소중한날')
  return tags
}

function buildRecordPoints(quality: UltrasoundQualityScores) {
  const points: string[] = []

  if (quality.sharpnessScore >= 65) {
    points.push('화면이 선명해서 오늘의 순간을 기록하기 좋아요.')
  } else {
    points.push('조금 흐릿하지만, 오늘의 순간을 기록할 수 있어요.')
  }

  if (quality.brightnessScore >= 60) {
    points.push('밝기가 고르게 담겨 있어요.')
  }

  if (quality.contrastScore >= 55) {
    points.push('초음파 화면의 윤곽이 잘 보여요.')
  }

  return points.slice(0, 3)
}

export function buildUltrasoundMemoryCard(options: {
  quality: UltrasoundQualityScores
  plane: UltrasoundPlaneResult | null
  pregnancyWeek: number | null
  babyName: string | null
}): UltrasoundMemoryCardData {
  const babyName = resolveUltrasoundBabyName(options.babyName)
  const pregnancyWeek = resolveUltrasoundPregnancyWeek(options.pregnancyWeek)
  const sceneCategory = options.plane?.sceneCategory ?? 'general_scene'
  const sceneCopy = options.plane ?? {
    label: 'fallback',
    confidence: 0,
    hfSceneScore: 0,
    sceneCategory,
    ...getSceneCopy(sceneCategory),
  }

  const qualityScore = options.quality.qualityScore
  const hfSceneScore = options.plane ? options.plane.hfSceneScore : null
  const finalRecordScore = computeFinalRecordScore(qualityScore, hfSceneScore)
  const adjustedRecordScore = computeAdjustedRecordScore(finalRecordScore, options.quality)
  const recordLabel = getRecordLabel(adjustedRecordScore)

  return {
    qualityScore,
    hfSceneScore,
    finalRecordScore,
    adjustedRecordScore,
    recordLabel,
    recordNote: RECORD_NOTES[recordLabel],
    sceneLabel: sceneCopy.sceneLabel,
    sceneNote: sceneCopy.sceneNote,
    title: buildTitle(babyName, sceneCategory),
    growthText: buildGrowthText(pregnancyWeek, babyName),
    tags: buildTags(pregnancyWeek, adjustedRecordScore),
    babyVoiceText: buildBabyVoiceText(),
    diarySnippet: buildDiarySnippet(babyName),
    recordPoints: buildRecordPoints(options.quality),
    quality: options.quality,
    planeLabel: options.plane?.label,
    planeConfidence: options.plane?.confidence,
  }
}

export function buildFallbackQuality(): UltrasoundQualityScores {
  return {
    sharpnessScore: 68,
    brightnessScore: 72,
    contrastScore: 70,
    noiseScore: 74,
    sectorScore: 66,
    qualityScore: 70,
  }
}

export function memoryCardToResponseFields(card: UltrasoundMemoryCardData) {
  return {
    qualityScore: card.qualityScore,
    hfSceneScore: card.hfSceneScore,
    finalRecordScore: card.finalRecordScore,
    adjustedRecordScore: card.adjustedRecordScore,
    recordLabel: card.recordLabel,
    recordNote: card.recordNote,
    sceneLabel: card.sceneLabel,
    sceneNote: card.sceneNote,
    title: card.title,
    growthText: card.growthText,
    tags: card.tags,
    babyVoiceText: card.babyVoiceText,
    diarySnippet: card.diarySnippet,
  }
}
