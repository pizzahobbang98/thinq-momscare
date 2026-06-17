import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { getHomeCareMessage } from '@/lib/home-care-messages'
import { OPENAI_MODELS } from '@/lib/openai-models'
import type { DemoPregnancyStatus, DemoRole, PreparationMode } from '@/lib/shared-demo-state'

type VoiceIntentRequest = {
  text?: string
  pregnancyStatus?: DemoPregnancyStatus
  role?: DemoRole
  pregnancyWeek?: number
  preparationMode?: PreparationMode
}

type VoiceIntentResponse = {
  success: boolean
  transcript: string
  intentSentence: string
  executionText: string
  ttsText: string
  routineId: string | null
  preparationMode: PreparationMode | null
  queryMode: string | null
  defaultMode?: boolean
  airPowerOff?: boolean
  airPowerOn?: boolean
  deviceAction?: 'on' | 'off'
  source: 'keyword' | 'openai' | 'fallback'
}

const PREPARING_RULES: Array<{
  terms: string[]
  preparationMode: PreparationMode
  routineId: string
  intentSentence: string
  executionText: string
}> = [
  {
    terms: ['아침 컨디션', '컨디션', '밸런스', '아침 상태'],
    preparationMode: 'condition',
    routineId: 'housework_care',
    intentSentence: '아침 컨디션과 생활 리듬 조정 의도를 감지했습니다.',
    executionText: '네, 컨디션 밸런스 모드를 실행할게요. 맑은 공기와 부드러운 빛으로 아침 컨디션을 맞출게요.',
  },
  {
    terms: ['잠을 잘', '수면 리듬', '잠이', '잘 자게', '못 자겠어'],
    preparationMode: 'sleep-rhythm',
    routineId: 'sleep_care',
    intentSentence: '수면 리듬을 안정시키려는 의도를 감지했습니다.',
    executionText: '네, 수면 리듬 모드를 실행할게요. 화면 자극과 생활 소음을 차분하게 낮출게요.',
  },
  {
    terms: ['기분', '마음', '환기', '답답'],
    preparationMode: 'refresh',
    routineId: 'destination_forest',
    intentSentence: '마음 환기와 기분 전환 의도를 감지했습니다.',
    executionText: '네, 마음 환기 모드를 실행할게요. 숲길 화면과 산뜻한 자연풍으로 분위기를 바꿀게요.',
  },
  {
    terms: ['편하게 쉬', '휴식', '쉬고 싶', '편히 쉬'],
    preparationMode: 'rest-ready',
    routineId: 'sleep_care',
    intentSentence: '편안한 휴식 준비 의도를 감지했습니다.',
    executionText: '네, 휴식 준비 모드를 실행할게요. 잔잔한 음악과 따뜻한 조명으로 편하게 쉴 수 있게 할게요.',
  },
  {
    terms: ['둘의 저녁', '우리 둘', '저녁을 준비', '둘만의'],
    preparationMode: 'couple-routine',
    routineId: 'destination_city',
    intentSentence: '둘이 함께 머무는 저녁 루틴 의도를 감지했습니다.',
    executionText: '네, 둘의 저녁 모드를 실행할게요. 둘만의 플레이리스트와 로즈 앰버 조명으로 차분한 저녁을 준비할게요.',
  },
]

const PREGNANT_RULES: Array<{
  terms: string[]
  routineId: string
  queryMode: string
  intentSentence: string
  executionText: string
}> = [
  {
    terms: ['음식 냄새', '냄새', '속이 안', '입덧', '메스꺼', '구역'],
    routineId: 'nausea_food',
    queryMode: 'nausea',
    intentSentence: '음식 냄새와 입덧 불편을 감지했습니다.',
    executionText: '네, 입덧 케어 모드를 실행할게요. 냄새가 덜 느껴지도록 공기청정기를 강하게 돌릴게요.',
  },
  {
    terms: ['잠이 잘', '잠을 잘', '못 자겠', '수면', '잘 오게', '잠들'],
    routineId: 'sleep_care',
    queryMode: 'sleep',
    intentSentence: '수면 불편과 휴식 필요를 감지했습니다.',
    executionText: '네, 수면 모드를 실행할게요. 조명과 공기를 낮춰 잠들기 좋은 환경으로 바꿀게요.',
  },
  {
    terms: ['빨래', '청소', '집안일', '가사', '움직이기', '힘들어'],
    routineId: 'housework_care',
    queryMode: 'housework',
    intentSentence: '집안일 부담과 움직임을 줄이고 싶은 의도를 감지했습니다.',
    executionText: '네, 가사 케어 모드를 실행할게요. 오늘은 무리하지 않도록 집안일 부담을 낮춰둘게요.',
  },
  {
    terms: ['바다', '해변', '시원한 분위기'],
    routineId: 'destination_ocean',
    queryMode: 'travel_ocean',
    intentSentence: '바다 휴양지 분위기로 전환하려는 의도를 감지했습니다.',
    executionText: '네, 바다 모드로 바꿀게요. 화면과 공기를 시원한 휴양지 분위기로 맞출게요.',
  },
  {
    terms: ['숲', '숲속', '조용히 쉬', '자연'],
    routineId: 'destination_forest',
    queryMode: 'travel_forest',
    intentSentence: '숲속처럼 조용한 휴식 분위기를 원하는 의도를 감지했습니다.',
    executionText: '네, 숲 모드로 바꿀게요. 고요한 자연 분위기와 산뜻한 공기로 맞출게요.',
  },
  {
    terms: ['도시', '야경', '라운지'],
    routineId: 'destination_city',
    queryMode: 'travel_city',
    intentSentence: '도시 야경 분위기로 전환하려는 의도를 감지했습니다.',
    executionText: '네, 도시 모드로 바꿀게요. 차분한 도심 라운지 분위기로 연출할게요.',
  },
]

function normalizeText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?~。！？'"“”‘’]/g, '')
    .replace(/\s+/g, '')
    .replace(/공청기/g, '공기청정기')
    .replace(/공기청정끼/g, '공기청정기')
    .replace(/공기청정키/g, '공기청정기')
    .replace(/굳모닝/g, '굿모닝')
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => {
    const normalized = normalizeText(term)
    return text.includes(normalized)
  })
}

function buildMorningResponse(body: VoiceIntentRequest, text: string): VoiceIntentResponse {
  const role = body.role === 'husband' ? 'husband' : 'wife'
  const status = body.pregnancyStatus === 'preparing' ? 'preparing' : 'pregnant'
  const message = getHomeCareMessage({ pregnancyStatus: status, role })
  const executionText = `좋은 아침이에요. ${message.cheer}`

  return {
    success: true,
    transcript: text,
    intentSentence: '아침 인사와 오늘의 한마디 요청을 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: 'morning',
    source: 'keyword',
  }
}

function buildDefaultModeResponse(text: string): VoiceIntentResponse {
  const executionText = '네, 기본 모드로 돌아갈게요. 가전은 차분한 기본 상태로 유지할게요.'
  return {
    success: true,
    transcript: text,
    intentSentence: '초기 기본모드로 복귀하려는 의도를 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: 'default',
    defaultMode: true,
    source: 'keyword',
  }
}

function buildAirOffResponse(text: string): VoiceIntentResponse {
  const executionText = '네, 공기청정기를 끌게요.'
  return {
    success: true,
    transcript: text,
    intentSentence: '공기청정기 전원 끄기 의도를 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: 'default',
    airPowerOff: true,
    deviceAction: 'off',
    source: 'keyword',
  }
}

function buildAirOnResponse(text: string): VoiceIntentResponse {
  const executionText = '네, 공기청정기를 켤게요.'
  return {
    success: true,
    transcript: text,
    intentSentence: '공기청정기 전원 켜기 의도를 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: 'default',
    airPowerOn: true,
    deviceAction: 'on',
    source: 'keyword',
  }
}

function keywordRoute(body: VoiceIntentRequest): VoiceIntentResponse | null {
  const rawText = body.text?.trim() ?? ''
  const text = normalizeText(rawText)

  if (!text) return null
  if (includesAny(text, ['좋은 아침이야', '좋은 아침', '굿모닝', '아침이야', '오늘 시작해줘'])) return buildMorningResponse(body, rawText)
  if (includesAny(text, ['기본 모드', '기본모드', '처음 화면으로 돌아가', '처음으로', '원래대로'])) return buildDefaultModeResponse(rawText)
  if (includesAny(text, ['공기청정기 꺼줘', '공청기 꺼줘', '공기청정기 꺼', '공청기 꺼', '공기청정기 전원 꺼줘'])) return buildAirOffResponse(rawText)
  if (includesAny(text, ['공기청정기 켜줘', '공청기 켜줘', '공기청정기 켜', '공청기 켜', '공기청정기 전원 켜줘'])) return buildAirOnResponse(rawText)

  if (body.pregnancyStatus === 'preparing') {
    const prepRule = PREPARING_RULES.find((rule) => includesAny(text, rule.terms))
    if (prepRule) {
      return {
        success: true,
        transcript: rawText,
        intentSentence: prepRule.intentSentence,
        executionText: prepRule.executionText,
        ttsText: prepRule.executionText,
        routineId: prepRule.routineId,
        preparationMode: prepRule.preparationMode,
        queryMode: 'pregnancy-prep',
        source: 'keyword',
      }
    }
  }

  const pregnantRule = PREGNANT_RULES.find((rule) => includesAny(text, rule.terms))
  if (pregnantRule) {
    return {
      success: true,
      transcript: rawText,
      intentSentence: pregnantRule.intentSentence,
      executionText: pregnantRule.executionText,
      ttsText: pregnantRule.executionText,
      routineId: pregnantRule.routineId,
      preparationMode: null,
      queryMode: pregnantRule.queryMode,
      source: 'keyword',
    }
  }

  return null
}

function fallbackRoute(body: VoiceIntentRequest): VoiceIntentResponse {
  const rawText = body.text?.trim() || ''
  const executionText = '말씀은 들었어요. 입덧, 수면, 가사, 바다, 숲, 도시처럼 원하는 케어를 조금 더 짧게 말해주세요.'
  return {
    success: false,
    transcript: rawText,
    intentSentence: '명확한 3D 케어 루틴을 찾지 못했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: null,
    source: 'fallback',
  }
}

async function openAIRoute(body: VoiceIntentRequest): Promise<VoiceIntentResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY
  const text = body.text?.trim()
  if (!apiKey || !text) return null

  try {
    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODELS.text,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '3D 임산부 케어 시연 발화를 분류합니다. JSON만 반환하세요. category는 default,morning,air_on,air_off,prep_condition,prep_sleep,prep_refresh,prep_rest,prep_couple,nausea,sleep,housework,ocean,forest,city,unknown 중 하나입니다.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            text,
            pregnancyStatus: body.pregnancyStatus ?? 'pregnant',
            role: body.role ?? 'wife',
            pregnancyWeek: body.pregnancyWeek ?? 16,
          }),
        },
      ],
    })
    const content = completion.choices[0]?.message?.content
    if (!content) return null
    const parsed = JSON.parse(content) as { category?: string }
    const category = parsed.category

    const syntheticTextByCategory: Record<string, string> = {
      default: '기본 모드로 바꿔줘',
      morning: '좋은 아침이야',
      air_on: '공기청정기 켜줘',
      air_off: '공기청정기 꺼줘',
      prep_condition: '아침 컨디션을 맞춰줘',
      prep_sleep: '잠을 잘 자게 도와줘',
      prep_refresh: '기분을 바꾸고 싶어',
      prep_rest: '편하게 쉬고 싶어',
      prep_couple: '우리 둘의 저녁을 준비해줘',
      nausea: '음식 냄새 때문에 속이 안 좋아',
      sleep: '잠이 잘 오게 해줘',
      housework: '빨래와 청소를 도와줘',
      ocean: '바다 분위기로 바꿔줘',
      forest: '숲 분위기로 바꿔줘',
      city: '도시 야경을 보여줘',
    }
    const routed = category ? keywordRoute({ ...body, text: syntheticTextByCategory[category] ?? text }) : null
    return routed ? { ...routed, transcript: text, source: 'openai' } : null
  } catch (error) {
    console.warn('[simulation-3d/voice-intent] OpenAI fallback failed:', error)
    return null
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VoiceIntentRequest
  const text = body.text?.trim() ?? ''

  if (!text) {
    return NextResponse.json(fallbackRoute({ ...body, text: '' }), { status: 400 })
  }

  const keywordResult = keywordRoute({ ...body, text })
  if (keywordResult) return NextResponse.json(keywordResult)

  const aiResult = await openAIRoute({ ...body, text })
  if (aiResult) return NextResponse.json(aiResult)

  return NextResponse.json(fallbackRoute({ ...body, text }))
}
