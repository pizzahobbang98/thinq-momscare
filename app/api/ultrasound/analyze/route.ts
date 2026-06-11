import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
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

function parseWeek(value: FormDataEntryValue | null) {
  const parsed = value ? Number(value) : null
  if (parsed !== null && Number.isInteger(parsed) && parsed >= 1 && parsed <= 42) {
    return parsed
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
      model: 'gpt-4o',
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

async function generateBabyVoiceTts(openai: OpenAI | null, text: string) {
  if (!openai) return undefined

  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text.slice(0, 200),
    })
    const buffer = Buffer.from(await mp3.arrayBuffer())
    return buffer.toString('base64')
  } catch (error) {
    console.warn('초음파 TTS 생성 실패:', error)
    return undefined
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

    const resolvedWeek = resolveUltrasoundPregnancyWeek(pregnancyWeek)
    const resolvedBabyName = resolveUltrasoundBabyName(babyName)

    if (imageBuffer) {
      imagePreviewUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`

      const demoMatch = matchDemoUltrasoundImage(imageBuffer, originalFileName)
      if (demoMatch) {
        const precomputed = getPrecomputedUltrasoundRecord(demoMatch.fileName)
        if (precomputed) {
          console.log('[ultrasound/analyze] precomputed demo cache hit:', {
            fileName: demoMatch.fileName,
            matchedBy: demoMatch.matchedBy,
            sha256: demoMatch.sha256,
          })

          const fruit = getPregnancyFruit(precomputed.pregnancyWeek)
          let imagePath: string | undefined
          let savedToStorage = false
          let savedToDb = false
          let recordId: string | undefined

          if (supabaseUrl && supabaseKey && demoWifeId) {
            const persisted = await persistUltrasoundRecord({
              supabaseUrl,
              supabaseKey,
              demoWifeId,
              imageBuffer,
              mimeType,
              resolvedWeek: precomputed.pregnancyWeek,
              fruit,
              aiMessage: precomputed.aiMessage,
              memoryCard: precomputed.memoryCard,
            })
            imagePath = persisted.imagePath
            savedToStorage = persisted.savedToStorage
            savedToDb = persisted.savedToDb
            recordId = persisted.recordId
          }

          const response = buildAnalyzeResponseFromPrecomputed(precomputed, {
            imagePreviewUrl,
            imagePath,
            recordId,
            savedToDb,
            savedToStorage,
          })

          return NextResponse.json(response)
        }
      }
    }

    const fruit = getPregnancyFruit(resolvedWeek)
    const planeResult = imageBuffer ? await classifyUltrasoundPlane(imageBuffer, mimeType) : null

    if (imageBuffer && !imagePreviewUrl) {
      imagePreviewUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`
    }

    let aiMessage = buildDefaultAiMessage(fruit, resolvedWeek, resolvedBabyName)
    let ttsAudioBase64: string | undefined
    let imagePath: string | undefined
    let savedToStorage = false
    let savedToDb = false
    let recordId: string | undefined

    const openai = apiKey ? new OpenAI({ apiKey }) : null
    const sceneLabel = planeResult?.sceneLabel ?? '오늘 병원에서 받은 초음파 장면'

    if (openai && imageBuffer) {
      const aiCopy = await generateWarmCopy(openai, {
        pregnancyWeek: resolvedWeek,
        babyName: resolvedBabyName,
        mimeType,
        base64: imageBuffer.toString('base64'),
        fruitName: fruit.fruitName,
        sceneLabel,
      })
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

    if (openai) {
      ttsAudioBase64 = await generateBabyVoiceTts(openai, memoryCard.babyVoiceText)
    }

    if (supabaseUrl && supabaseKey && demoWifeId && imageBuffer) {
      const persisted = await persistUltrasoundRecord({
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
      })
      imagePath = persisted.imagePath
      savedToStorage = persisted.savedToStorage
      savedToDb = persisted.savedToDb
      recordId = persisted.recordId
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
