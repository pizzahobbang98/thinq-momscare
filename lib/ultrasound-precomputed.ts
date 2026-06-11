import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import path from 'path'
import type {
  UltrasoundAnalyzeResponse,
  UltrasoundMemoryCardData,
} from '@/lib/ultrasound-types'

export type DemoUltrasoundFileName =
  | '01_main_upload_profile_ultrasound.png'
  | '02_gallery_full_body_ultrasound.png'
  | '03_gallery_movement_ultrasound.png'

type PrecomputedRecordPayload = Omit<
  UltrasoundAnalyzeResponse,
  'savedToDb' | 'savedToStorage' | 'recordId' | 'imagePreviewUrl' | 'imagePath' | 'ttsAudioBase64'
> & {
  memoryCard: UltrasoundMemoryCardData
}

type PrecomputedManifest = {
  _hashes?: Record<string, string>
  records: Record<string, PrecomputedRecordPayload>
}

const DEMO_FILE_NAMES = new Set<string>([
  '01_main_upload_profile_ultrasound.png',
  '02_gallery_full_body_ultrasound.png',
  '03_gallery_movement_ultrasound.png',
])

let cachedManifest: PrecomputedManifest | null = null
let hashToFileName: Map<string, DemoUltrasoundFileName> | null = null

function loadManifest(): PrecomputedManifest {
  if (cachedManifest) return cachedManifest

  const filePath = path.join(process.cwd(), 'data', 'ultrasound_precomputed.json')
  const raw = readFileSync(filePath, 'utf8')
  cachedManifest = JSON.parse(raw) as PrecomputedManifest
  return cachedManifest
}

function loadHashIndex(): Map<string, DemoUltrasoundFileName> {
  if (hashToFileName) return hashToFileName

  const manifest = loadManifest()
  hashToFileName = new Map()

  for (const [fileName, hash] of Object.entries(manifest._hashes ?? {})) {
    if (!DEMO_FILE_NAMES.has(fileName)) continue
    hashToFileName.set(hash.toLowerCase(), fileName as DemoUltrasoundFileName)
  }

  return hashToFileName
}

export function sha256Hex(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

export type DemoUltrasoundMatch = {
  fileName: DemoUltrasoundFileName
  sha256: string
  matchedBy: 'hash' | 'hash_and_filename'
}

/**
 * 데모 PNG와 바이트 단위로 일치할 때만 사전계산 결과를 사용합니다.
 * 파일명만 같고 내용이 다르면(사용자 업로드) 매칭하지 않습니다.
 */
export function matchDemoUltrasoundImage(
  imageBuffer: Buffer,
  originalFileName?: string | null,
): DemoUltrasoundMatch | null {
  const sha256 = sha256Hex(imageBuffer)
  const index = loadHashIndex()
  const fileName = index.get(sha256)

  if (!fileName) return null

  const normalizedName = originalFileName?.trim().split(/[/\\]/).pop()?.toLowerCase()
  const matchedBy =
    normalizedName && normalizedName === fileName.toLowerCase() ? 'hash_and_filename' : 'hash'

  return { fileName, sha256, matchedBy }
}

export function getPrecomputedUltrasoundRecord(
  fileName: DemoUltrasoundFileName,
): PrecomputedRecordPayload | null {
  const manifest = loadManifest()
  return manifest.records[fileName] ?? null
}

export function buildAnalyzeResponseFromPrecomputed(
  record: PrecomputedRecordPayload,
  options: {
    imagePreviewUrl?: string
    imagePath?: string
    recordId?: string
    savedToDb?: boolean
    savedToStorage?: boolean
    ttsAudioBase64?: string
  } = {},
): UltrasoundAnalyzeResponse {
  const memoryCard: UltrasoundMemoryCardData = {
    ...record.memoryCard,
    hfSceneScore: null,
    planeLabel: record.memoryCard.planeLabel ?? undefined,
    planeConfidence: record.memoryCard.planeConfidence ?? undefined,
  }

  return {
    success: record.success,
    recordId: options.recordId,
    fruitName: record.fruitName,
    fruitEmoji: record.fruitEmoji,
    fruitDescription: record.fruitDescription,
    aiMessage: record.aiMessage,
    ttsAudioBase64: options.ttsAudioBase64,
    imagePath: options.imagePath,
    imagePreviewUrl: options.imagePreviewUrl,
    pregnancyWeek: record.pregnancyWeek,
    savedToDb: options.savedToDb ?? false,
    savedToStorage: options.savedToStorage ?? false,
    qualityScore: record.qualityScore,
    hfSceneScore: null,
    finalRecordScore: record.finalRecordScore,
    adjustedRecordScore: record.adjustedRecordScore,
    recordLabel: record.recordLabel,
    recordNote: record.recordNote,
    sceneLabel: record.sceneLabel,
    sceneNote: record.sceneNote,
    title: record.title,
    growthText: record.growthText,
    tags: record.tags,
    babyVoiceText: record.babyVoiceText,
    diarySnippet: record.diarySnippet,
    disclaimer: record.disclaimer,
    memoryCard,
  }
}
