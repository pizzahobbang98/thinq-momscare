import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { OPENAI_MODELS } from '@/lib/openai-models'
import { classifyUltrasoundPlane } from '@/lib/ultrasound-huggingface'
import {
  resolveUltrasoundBabyName,
  resolveUltrasoundPregnancyWeek,
} from '@/lib/ultrasound-defaults'
import { buildFallbackAnalyzeResponse } from '@/lib/ultrasound-fallback'
import {
  buildFallbackQuality,
  buildUltrasoundMemoryCard,
  memoryCardToResponseFields,
} from '@/lib/ultrasound-memory'
import {
  buildAnalyzeResponseFromPrecomputed,
  getPrecomputedUltrasoundRecord,
  matchDemoUltrasoundImage,
} from '@/lib/ultrasound-precomputed'
import {
  buildDefaultAiMessage,
  getPregnancyFruit,
  ULTRASOUND_DISCLAIMER,
} from '@/lib/pregnancy-fruit'
import type { UltrasoundQualityScores } from '@/lib/ultrasound-quality'
import type { UltrasoundAnalyzeResponse, UltrasoundMemoryCardData } from '@/lib/ultrasound-types'
import { syncUltrasoundGrowthCareFromAnalyze } from '@/lib/ultrasound-care-bridge'

const MAX_FILE_SIZE = 10 * 1024 * 1024

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
  /CRL/gi,
  /BPD/gi,
  /\bFL\b/gi,
]

const ANALYSIS_PROMPT = `당신은 임신 성장 기록 앱 ThinQ Mom의 감성 메시지 작성자입니다.
사용자가 초음파 사진을 업로드했습니다. 이 사진을 의학적으로 해석하거나 수치를 추정하지 마세요.

임신 주차와 태명 정보를 바탕으로, 오늘의 성장 기록을 따뜻하게 남기는 문장을 작성하세요.

금지 표현: 정상, 비정상, 건강합니다, 질환, 위험, 의학적으로, 진단, 판독, 판별, CRL, BPD, FL, 측정, 주수 판정

아래 JSON만 반환하세요:
{
  "aiMessage": "엄마에게 전하는 2문장 이내의 따뜻한 성장 기록 메시지",
  "babyVoiceText": "아기 말투 1~2문장. 짧고 담백하게. 이모지 없음."
}`

type ParsedAiCopy = {
  aiMessage: string
  babyVoiceText: string
}

type ParsedPregnancyWeek = {
  pregnancyWeek: number | null
  evidence: string
}

function sanitizeCopy(text: string) {
  let sanitized = text.trim()
  for (const pattern of FORBIDDEN_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }
  return sanitized.replace(/\s{2,}/g, ' ').trim()
}

function parseAiCopy(content: string): ParsedAiCopy | null {
  try {
    const parsed = JSON.parse(content) as Partial<ParsedAiCopy>
    const aiMessage = sanitizeCopy(parsed.aiMessage ?? '')
    const babyVoiceText = sanitizeCopy(parsed.babyVoiceText ?? '')
    if (!aiMessage || !babyVoiceText) return null
    return { aiMessage, babyVoiceText }
  } catch {
    return null
  }
}

function parsePregnancyWeek(content: string): ParsedPregnancyWeek | null {
  try {
    const parsed = JSON.parse(content) as {
      pregnancyWeek?: unknown
      evidence?: unknown
    }
    const week = Number(parsed.pregnancyWeek)
    const pregnancyWeek = Number.isInteger(week) && week >= 1 && week <= 42
      ? week
      : null
    const evidence = typeof parsed.evidence === 'string'
      ? parsed.evidence.trim().slice(0, 120)
      : ''

    return { pregnancyWeek, evidence }
  } catch {
    return null
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(fallback)
      })
  })
}

async function extractPrintedPregnancyWeek(
  openai: OpenAI,
  options: { mimeType: string; base64: string },
): Promise<ParsedPregnancyWeek | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODELS.text,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${options.mimeType};base64,${options.base64}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: `초음파 이미지의 화면이나 테두리에 인쇄된 문자만 OCR로 읽으세요.
태아 형태를 해석하거나 크기를 직접 측정하거나 임신 주차를 의학적으로 추론하지 마세요.

GA, Gestational Age, weeks, 주차처럼 임신 주차가 명시되어 있으면 완료된 주 단위 정수로 반환하세요.
예: GA 24w3d -> 24, 18주 5일 -> 18.
CRL, BPD, FL 같은 측정값만 있고 임신 주차가 명시되지 않았다면 변환하지 말고 null을 반환하세요.

JSON만 반환:
{
  "pregnancyWeek": number | null,
  "evidence": "이미지에서 실제로 읽은 짧은 표기 또는 빈 문자열"
}`,
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    return content ? parsePregnancyWeek(content) : null
  } catch (error) {
    console.warn('초음파 인쇄 주차 OCR 실패, 기본값 사용:', error)
    return null
  }
}

function parseWeek(value: FormDataEntryValue | null) {
  const parsed = value ? Number(value) : null
  if (parsed !== null && Number.isInteger(parsed) && parsed >= 1 && parsed <= 42) {
    return parsed
  }
  return null
}

function parseWeekFromFileName(fileName: string | null) {
  if (!fileName) return null
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

function parseQualityFromForm(formData: FormData): UltrasoundQualityScores {
  const fallback = buildFallbackQuality()
  const readScore = (key: keyof UltrasoundQualityScores) => {
    const raw = Number(formData.get(key))
    if (!Number.isFinite(raw)) return fallback[key]
    return Math.max(0, Math.min(100, Math.round(raw)))
  }

  const quality: UltrasoundQualityScores = {
    sharpnessScore: readScore('sharpnessScore'),
    brightnessScore: readScore('brightnessScore'),
    contrastScore: readScore('contrastScore'),
    noiseScore: readScore('noiseScore'),
    sectorScore: readScore('sectorScore'),
    qualityScore: readScore('qualityScore'),
  }

  if (!formData.get('qualityScore')) {
    quality.qualityScore = Math.round(
      quality.sharpnessScore * 0.3 +
        quality.brightnessScore * 0.2 +
        quality.contrastScore * 0.25 +
        quality.noiseScore * 0.1 +
        quality.sectorScore * 0.15,
    )
  }

  return quality
}

async function generateWarmCopy(
  openai: OpenAI,
  options: {
    pregnancyWeek: number | null
    babyName: string | null
    mimeType: string
    base64: string
    fruitName: string
    sceneLabel: string
  },
): Promise<ParsedAiCopy | null> {
  try {
    const weekHint = options.pregnancyWeek
      ? `\n\n현재 임신 주차: ${options.pregnancyWeek}주차`
      : ''
    const nameHint = options.babyName ? `\n태명: ${options.babyName}` : ''
    const fruitHint = `\n과일 비유: ${options.fruitName}`
    const sceneHint = `\n오늘의 장면: ${options.sceneLabel}`

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODELS.text,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${options.mimeType};base64,${options.base64}` },
            },
            {
              type: 'text',
              text: `${ANALYSIS_PROMPT}${weekHint}${nameHint}${fruitHint}${sceneHint}`,
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null
    return parseAiCopy(content)
  } catch (error) {
    console.warn('초음파 AI 문구 생성 실패, fallback 사용:', error)
    return null
  }
}

async function persistUltrasoundRecord(options: {
  supabaseUrl: string
  supabaseKey: string
  demoWifeId: string
  imageBuffer: Buffer
  mimeType: string
  resolvedWeek: number
  fruit: ReturnType<typeof getPregnancyFruit>
  aiMessage: string
  memoryCard: UltrasoundMemoryCardData
  ttsAudioBase64?: string
}) {
  let imagePath: string | undefined
  let savedToStorage = false
  let savedToDb = false
  let recordId: string | undefined

  try {
    const supabase = createClient(options.supabaseUrl, options.supabaseKey)
    imagePath = `${options.demoWifeId}/${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('ultrasound-images')
      .upload(imagePath, options.imageBuffer, { contentType: options.mimeType, upsert: false })

    if (uploadError) {
      console.warn('초음파 Storage 업로드 실패, preview fallback:', uploadError.message)
      imagePath = undefined
    } else {
      savedToStorage = true
    }

    const baseRecord = {
      user_id: options.demoWifeId,
      image_path: imagePath ?? `demo/${Date.now()}.jpg`,
      weeks: options.resolvedWeek,
      fruit_emoji: options.fruit.fruitEmoji,
      fruit_name: options.fruit.fruitName,
      size_cm: 0,
      size_basis: '임신 주차 기준',
      description: options.memoryCard.diarySnippet,
    }

    const extendedRecord = {
      ...baseRecord,
      ai_message: options.aiMessage,
      baby_voice_text: options.memoryCard.babyVoiceText,
      fruit_description: options.fruit.description,
      tts_audio_url: options.ttsAudioBase64 ? `inline:${Date.now()}` : null,
      card_title: options.memoryCard.title,
      today_scene: options.memoryCard.sceneLabel,
      readiness_score: options.memoryCard.adjustedRecordScore,
      record_points: options.memoryCard.recordPoints,
      auto_tags: options.memoryCard.tags,
      diary_snippet: options.memoryCard.diarySnippet,
      quality_scores: options.memoryCard.quality,
      plane_label: options.memoryCard.planeLabel ?? null,
      plane_confidence: options.memoryCard.planeConfidence ?? null,
    }

    let insertResult = await supabase
      .from('ultrasound_records')
      .insert(extendedRecord)
      .select('id')
      .single()

    if (insertResult.error) {
      console.warn('확장 컬럼 저장 실패, 기본 컬럼으로 재시도:', insertResult.error.message)
      insertResult = await supabase.from('ultrasound_records').insert(baseRecord).select('id').single()
    }

    if (insertResult.error) {
      console.warn('초음파 DB 저장 실패, 시연용 fallback:', insertResult.error.message)
    } else {
      savedToDb = true
      recordId = insertResult.data?.id as string | undefined
    }
  } catch (storageError) {
    console.warn('Supabase 초음파 저장 처리 실패:', storageError)
  }

  return { imagePath, savedToStorage, savedToDb, recordId }
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID
  const apiKey = process.env.OPENAI_API_KEY

  let pregnancyWeek: number | null = null
  let babyName: string | null = null
  let imageBuffer: Buffer | null = null
  let mimeType = 'image/jpeg'
  let imagePreviewUrl: string | undefined
  let quality = buildFallbackQuality()
  let originalFileName: string | null = null

  try {
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const image = formData.get('image')
      pregnancyWeek = parseWeek(formData.get('pregnancyWeek') ?? formData.get('weeks'))
      babyName = String(formData.get('babyName') ?? '').trim() || null
      quality = parseQualityFromForm(formData)

      if (image instanceof File) {
        originalFileName = image.name || null
        pregnancyWeek = pregnancyWeek ?? parseWeekFromFileName(originalFileName)
        if (!image.type.startsWith('image/')) {
          return NextResponse.json({ success: false, error: '이미지 파일만 업로드할 수 있습니다.' }, { status: 400 })
        }
        if (image.size > MAX_FILE_SIZE) {
          return NextResponse.json({ success: false, error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 })
        }
        imageBuffer = Buffer.from(await image.arrayBuffer())
        mimeType = image.type || 'image/jpeg'
      }
    } else {
      const body = (await request.json()) as {
        imageUrl?: string
        pregnancyWeek?: number
        babyName?: string
        quality?: UltrasoundQualityScores
      }
      pregnancyWeek =
        body.pregnancyWeek && body.pregnancyWeek >= 1 && body.pregnancyWeek <= 42
          ? Math.round(body.pregnancyWeek)
          : null
      babyName = body.babyName?.trim() || null
      imagePreviewUrl = body.imageUrl
      if (body.quality) quality = body.quality
    }

    const resolvedBabyName = resolveUltrasoundBabyName(babyName)

    if (imageBuffer) {
      imagePreviewUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`

      const demoMatch = pregnancyWeek == null ? matchDemoUltrasoundImage(imageBuffer, originalFileName) : null
      if (demoMatch) {
        const precomputed = getPrecomputedUltrasoundRecord(demoMatch.fileName)
        if (precomputed) {
          console.log('[ultrasound/analyze] precomputed demo cache hit:', {
            fileName: demoMatch.fileName,
            matchedBy: demoMatch.matchedBy,
            sha256: demoMatch.sha256,
          })

          const fruit = getPregnancyFruit(precomputed.pregnancyWeek)

          if (supabaseUrl && supabaseKey && demoWifeId) {
            void persistUltrasoundRecord({
              supabaseUrl,
              supabaseKey,
              demoWifeId,
              imageBuffer,
              mimeType,
              resolvedWeek: precomputed.pregnancyWeek,
              fruit,
              aiMessage: precomputed.aiMessage,
              memoryCard: precomputed.memoryCard,
            }).then((persisted) => {
              void syncUltrasoundGrowthCareFromAnalyze({
                pregnancyWeek: precomputed.pregnancyWeek,
                babyName: resolvedBabyName,
                recordId: persisted.recordId,
              })
            })
          } else {
            void syncUltrasoundGrowthCareFromAnalyze({
              pregnancyWeek: precomputed.pregnancyWeek,
              babyName: resolvedBabyName,
            })
          }

          const response = buildAnalyzeResponseFromPrecomputed(precomputed, {
            imagePreviewUrl,
            savedToDb: false,
            savedToStorage: false,
          })

          return NextResponse.json(response)
        }
      }
    }

    const openai = apiKey ? new OpenAI({ apiKey }) : null
    const imageBase64 = imageBuffer?.toString('base64') ?? ''
    const shouldExtractPrintedWeek = pregnancyWeek == null
    const [printedWeek, planeResult] = await Promise.all([
      openai && imageBuffer && shouldExtractPrintedWeek
        ? extractPrintedPregnancyWeek(openai, { mimeType, base64: imageBase64 })
        : Promise.resolve(null),
      imageBuffer ? classifyUltrasoundPlane(imageBuffer, mimeType) : Promise.resolve(null),
    ])
    const resolvedWeek = resolveUltrasoundPregnancyWeek(
      printedWeek?.pregnancyWeek ?? pregnancyWeek,
    )
    const fruit = getPregnancyFruit(resolvedWeek)

    if (imageBuffer && !imagePreviewUrl) {
      imagePreviewUrl = `data:${mimeType};base64,${imageBase64}`
    }

    let aiMessage = buildDefaultAiMessage(fruit, resolvedWeek, resolvedBabyName)
    const ttsAudioBase64: string | undefined = undefined
    const imagePath: string | undefined = undefined
    const savedToStorage = false
    const savedToDb = false
    const recordId: string | undefined = undefined

    const sceneLabel = planeResult?.sceneLabel ?? '오늘 병원에서 받은 초음파 장면'

    if (openai && imageBuffer) {
      const aiCopy = await withTimeout(
        generateWarmCopy(openai, {
          pregnancyWeek: resolvedWeek,
          babyName: resolvedBabyName,
          mimeType,
          base64: imageBase64,
          fruitName: fruit.fruitName,
          sceneLabel,
        }),
        2200,
        null,
      )
      if (aiCopy) {
        aiMessage = aiCopy.aiMessage
      }
    }

    const memoryCard = buildUltrasoundMemoryCard({
      quality,
      plane: planeResult,
      pregnancyWeek: resolvedWeek,
      babyName: resolvedBabyName,
    })

    if (supabaseUrl && supabaseKey && demoWifeId && imageBuffer) {
      void persistUltrasoundRecord({
        supabaseUrl,
        supabaseKey,
        demoWifeId,
        imageBuffer,
        mimeType,
        resolvedWeek,
        fruit,
        aiMessage,
        memoryCard,
        ttsAudioBase64,
      }).then((persisted) => {
        void syncUltrasoundGrowthCareFromAnalyze({
          pregnancyWeek: resolvedWeek,
          babyName: resolvedBabyName,
          recordId: persisted.recordId,
        })
      })
    } else {
      void syncUltrasoundGrowthCareFromAnalyze({
        pregnancyWeek: resolvedWeek,
        babyName: resolvedBabyName,
      })
    }

    const response: UltrasoundAnalyzeResponse = {
      success: true,
      recordId,
      fruitName: fruit.fruitName,
      fruitEmoji: fruit.fruitEmoji,
      fruitDescription: fruit.description,
      aiMessage,
      ttsAudioBase64,
      imagePath,
      imagePreviewUrl,
      pregnancyWeek: resolvedWeek,
      savedToDb,
      savedToStorage,
      disclaimer: ULTRASOUND_DISCLAIMER,
      memoryCard,
      ...memoryCardToResponseFields(memoryCard),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('초음파 analyze API 처리 실패:', error)

    const fallback = buildFallbackAnalyzeResponse({
      pregnancyWeek,
      babyName,
      imagePreviewUrl,
      quality,
      partialError: '일부 기능을 시연용 기본값으로 대체했어요.',
    })

    return NextResponse.json(fallback)
  }
}
