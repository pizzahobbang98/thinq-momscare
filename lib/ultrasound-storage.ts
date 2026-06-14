import { ULTRASOUND_DISCLAIMER } from '@/lib/pregnancy-fruit'
import type { UltrasoundRecord } from '@/lib/supabase'
import {
  resolveUltrasoundBabyName,
  resolveUltrasoundPregnancyWeek,
} from '@/lib/ultrasound-defaults'
import { getRecordLabel, getRecordNote } from '@/lib/ultrasound-memory'
import type { UltrasoundAnalyzeResponse, UltrasoundStoredCard } from '@/lib/ultrasound-types'

export const ULTRASOUND_CARDS_STORAGE_KEY = 'thinq-mom-ultrasound-cards'

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function resolveStoredPregnancyWeek(
  week: number | null | undefined,
  textValues: Array<string | null | undefined>,
) {
  for (const text of textValues) {
    const match = text?.match(/(?:임신\s*)?(\d{1,2})\s*주(?:차)?/)
    const textWeek = match ? Number(match[1]) : null
    if (textWeek && textWeek >= 4 && textWeek <= 42) return textWeek
  }

  if (week && week >= 4 && week <= 42) return Math.round(week)
  return resolveUltrasoundPregnancyWeek(null)
}

export function buildStoredCardFromAnalyzeResponse(
  result: UltrasoundAnalyzeResponse,
  options: { babyName?: string | null; pregnancyWeek?: number | null } = {},
): UltrasoundStoredCard {
  const card = result.memoryCard
  const id = result.recordId ?? `local-${Date.now()}`
  const babyName = resolveUltrasoundBabyName(options.babyName)

  return {
    id,
    imageUrl: result.imagePreviewUrl ?? '',
    createdAt: new Date().toISOString(),
    babyName,
    pregnancyWeek: resolveUltrasoundPregnancyWeek(result.pregnancyWeek ?? options.pregnancyWeek),
    title: card.title,
    recordScore: card.adjustedRecordScore,
    recordLabel: card.recordLabel,
    recordNote: card.recordNote,
    sceneLabel: card.sceneLabel,
    sceneNote: card.sceneNote,
    growthText: card.growthText,
    tags: card.tags,
    babyVoiceText: card.babyVoiceText,
    diarySnippet: card.diarySnippet,
    disclaimer: result.disclaimer ?? ULTRASOUND_DISCLAIMER,
  }
}

export function storedCardToUltrasoundRecord(card: UltrasoundStoredCard): UltrasoundRecord {
  return {
    id: card.id,
    user_id: '',
    image_path: '',
    weeks: card.pregnancyWeek > 0 ? card.pregnancyWeek : null,
    fruit_emoji: '🍼',
    fruit_name: card.growthText.split('만큼')[0]?.trim() ?? '성장 기록',
    size_cm: null,
    size_basis: '임신 주차 기준',
    description: card.diarySnippet,
    ai_message: null,
    baby_voice_text: card.babyVoiceText,
    fruit_description: card.growthText,
    card_title: card.title,
    today_scene: card.sceneLabel,
    readiness_score: card.recordScore,
    auto_tags: card.tags,
    diary_snippet: card.diarySnippet,
    created_at: card.createdAt,
    is_demo: true,
    local_image_url: card.imageUrl,
  }
}

export function ultrasoundRecordToStoredCard(
  record: UltrasoundRecord,
  imageUrl: string,
): UltrasoundStoredCard {
  const score = record.readiness_score ?? 0
  const recordLabel = getRecordLabel(score)

  return {
    id: record.id,
    imageUrl,
    createdAt: record.created_at,
    babyName: '아기',
    pregnancyWeek: resolveStoredPregnancyWeek(record.weeks, [
      record.fruit_description,
      record.description,
      record.diary_snippet,
      record.card_title,
    ]),
    title: record.card_title ?? `${record.fruit_name} 성장 기록`,
    recordScore: score,
    recordLabel,
    recordNote: getRecordNote(score),
    sceneLabel: record.today_scene ?? '초음파 장면',
    sceneNote: '',
    growthText: record.fruit_description ?? record.description,
    tags: record.auto_tags ?? [],
    babyVoiceText: record.baby_voice_text ?? '',
    diarySnippet: record.diary_snippet ?? record.description,
    disclaimer: ULTRASOUND_DISCLAIMER,
  }
}

export function readUltrasoundCardsFromLocalStorage(): UltrasoundStoredCard[] {
  try {
    const storage = getStorage()
    if (!storage) return []

    const raw = storage.getItem(ULTRASOUND_CARDS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as UltrasoundStoredCard[]
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((card) => card?.id && card?.title)
      .map((card) => ({
        ...card,
        pregnancyWeek: resolveStoredPregnancyWeek(card.pregnancyWeek, [
          card.growthText,
          card.diarySnippet,
          card.title,
          ...card.tags,
        ]),
      }))
  } catch (error) {
    console.warn('[ultrasound-storage] localStorage read failed:', error)
    return []
  }
}

export function saveUltrasoundCardToLocalStorage(card: UltrasoundStoredCard) {
  try {
    const storage = getStorage()
    if (!storage) return

    const existing = readUltrasoundCardsFromLocalStorage()
    const next = [card, ...existing.filter((item) => item.id !== card.id)].slice(0, 30)
    storage.setItem(ULTRASOUND_CARDS_STORAGE_KEY, JSON.stringify(next))
  } catch (error) {
    console.warn('[ultrasound-storage] localStorage save failed:', error)
  }
}

export function removeUltrasoundCardFromLocalStorage(id: string) {
  try {
    const storage = getStorage()
    if (!storage) return

    const existing = readUltrasoundCardsFromLocalStorage()
    storage.setItem(
      ULTRASOUND_CARDS_STORAGE_KEY,
      JSON.stringify(existing.filter((item) => item.id !== id)),
    )
  } catch (error) {
    console.warn('[ultrasound-storage] localStorage remove failed:', error)
  }
}

export function mergeLocalOnlyCards(
  supabaseRecords: UltrasoundRecord[],
  imageUrls: Record<string, string>,
): UltrasoundStoredCard[] {
  const supabaseIds = new Set(supabaseRecords.map((record) => record.id))
  const localCards = readUltrasoundCardsFromLocalStorage().filter((card) => !supabaseIds.has(card.id))

  const fromSupabase = supabaseRecords.map((record) =>
    ultrasoundRecordToStoredCard(record, imageUrls[record.id] ?? record.local_image_url ?? ''),
  )

  return [...fromSupabase, ...localCards].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
