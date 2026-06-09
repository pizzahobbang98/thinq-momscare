export type Mode =
  | 'NAUSEA_MODE'
  | 'SLEEP_MODE'
  | 'HOUSEWORK_MODE'
  | 'TRAVEL_MODE'
  | 'MORNING_BRIEFING'
  | 'UNKNOWN'

export interface ModeRouterInput {
  text: string
  pregnancyWeek?: number
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
}

export interface ModeRouterResult {
  mode: Mode
  modeLabel: string
  confidence: number
  signals: string[]
  reason: string
  reply: string
  wifeCard: string
  husbandCard: string
}

type KeywordRule = {
  mode: Mode
  keywords: string[]
  baseConfidence: number
}

export const MODE_LABELS: Record<Mode, string> = {
  NAUSEA_MODE: '입덧모드',
  SLEEP_MODE: '수면모드',
  HOUSEWORK_MODE: '가사케어 모드',
  TRAVEL_MODE: '여행 모드',
  MORNING_BRIEFING: '굿모닝 브리핑',
  UNKNOWN: '알 수 없음',
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    mode: 'MORNING_BRIEFING',
    keywords: ['굿모닝', '굿모닝 브리핑', '좋은 아침', '나 일어났어', '기상', '일어났어', '아침 브리핑'],
    baseConfidence: 0.68,
  },
  {
    mode: 'NAUSEA_MODE',
    keywords: [
      '입덧',
      '울렁',
      '구역',
      '토할',
      '냄새',
      '못 먹겠어',
      '음식 냄새',
      '주방 냄새',
      '기름 냄새',
      '속 안 좋아',
      '메스꺼워',
    ],
    baseConfidence: 0.64,
  },
  {
    mode: 'SLEEP_MODE',
    keywords: [
      '잘 거야',
      '자고 싶어',
      '졸려',
      '피곤해',
      '잠이 안 와',
      '자꾸 깼어',
      '수면',
      '쉬고 싶어',
      '눕고 싶어',
    ],
    baseConfidence: 0.62,
  },
  {
    mode: 'HOUSEWORK_MODE',
    keywords: [
      '몸이 무거워',
      '움직이기 힘들어',
      '허리 아파',
      '빨래',
      '세탁',
      '건조',
      '집안일',
      '청소 못 하겠어',
      '식기',
      '일어나기 힘들어',
    ],
    baseConfidence: 0.6,
  },
  {
    mode: 'TRAVEL_MODE',
    keywords: [
      '답답해',
      '어디 가고 싶어',
      '바다',
      '숲',
      '여행',
      '우울해',
      '기분 전환',
      '리조트',
      '호텔',
      '힐링',
      '환기',
      '비 오는 창가',
      '온천',
      '카페',
    ],
    baseConfidence: 0.58,
  },
]

const DEFAULT_RESPONSES: Record<Mode, Omit<ModeRouterResult, 'mode' | 'signals' | 'confidence'>> = {
  NAUSEA_MODE: {
    modeLabel: MODE_LABELS.NAUSEA_MODE,
    reason: '입덧, 냄새, 구역감과 관련된 표현이 감지됐어요.',
    reply: '냄새 부담이 줄어들도록 공기 케어를 먼저 도와드릴게요.',
    wifeCard: '입덧 부담을 줄이기 위해 공기청정기 강력 모드를 준비했어요.',
    husbandCard: '오늘은 냄새가 적은 음식과 조용한 주방 환경을 도와주세요.',
  },
  SLEEP_MODE: {
    modeLabel: MODE_LABELS.SLEEP_MODE,
    reason: '수면, 피로, 휴식과 관련된 표현이 감지됐어요.',
    reply: '편하게 쉴 수 있도록 수면 환경을 차분하게 맞춰드릴게요.',
    wifeCard: '잠들기 좋은 침실 환경으로 공기청정기 수면 모드를 준비했어요.',
    husbandCard: '오늘은 소리와 조명을 낮추고 편히 쉬게 도와주세요.',
  },
  HOUSEWORK_MODE: {
    modeLabel: MODE_LABELS.HOUSEWORK_MODE,
    reason: '집안일, 몸의 무거움, 움직이기 어려움과 관련된 표현이 감지됐어요.',
    reply: '지금 바로 움직이지 않아도 되도록 집안일 타이밍을 조정해볼게요.',
    wifeCard: '무리하지 않도록 집안일 케어 루틴을 준비했어요.',
    husbandCard: '빨래와 청소처럼 몸을 많이 쓰는 일을 먼저 확인해 주세요.',
  },
  TRAVEL_MODE: {
    modeLabel: MODE_LABELS.TRAVEL_MODE,
    reason: '답답함, 기분 전환, 여행 욕구와 관련된 표현이 감지됐어요.',
    reply: '집 안에서도 잠시 다른 곳에 온 것처럼 기분 전환을 도와드릴게요.',
    wifeCard: '공기청정기 쾌적 모드와 함께 집 안 여행 분위기를 준비했어요.',
    husbandCard: '함께 쉬자는 메시지와 간단한 간식을 준비해 주세요.',
  },
  MORNING_BRIEFING: {
    modeLabel: MODE_LABELS.MORNING_BRIEFING,
    reason: '아침 인사나 기상 표현이 감지됐어요.',
    reply: '좋은 아침이에요. 오늘 컨디션에 맞춰 하루 케어를 정리해드릴게요.',
    wifeCard: '오늘의 컨디션과 케어 루틴을 아침 브리핑으로 준비했어요.',
    husbandCard: '오늘 필요한 배려 포인트를 함께 확인해 주세요.',
  },
  UNKNOWN: {
    modeLabel: MODE_LABELS.UNKNOWN,
    reason: '분류 가능한 케어 모드 신호를 찾지 못했어요.',
    reply: `무슨 말인지 잘 이해하지 못했어요 🙏
다시 한번 말씀해주세요.`,
    wifeCard: '아직 실행할 케어 모드를 찾지 못했어요.',
    husbandCard: '아내의 상태를 한 번 더 부드럽게 물어봐 주세요.',
  },
}

const SYSTEM_PROMPT = `임산부 케어 AI입니다.
발화를 분석해서 아래 JSON만 반환하세요.

모드:
- NAUSEA_MODE: 입덧, 냄새, 구역감, 식사 부담
- SLEEP_MODE: 수면, 피로, 휴식, 취침
- HOUSEWORK_MODE: 집안일, 세탁, 청소, 몸이 무거움
- TRAVEL_MODE: 답답함, 기분 전환, 여행, 장소감 전환
- MORNING_BRIEFING: 굿모닝, 기상 인사
- UNKNOWN: 위 어디에도 해당 없음

{
  "mode": string,
  "modeLabel": string,
  "confidence": number (0~1),
  "signals": string[] (감지된 신호 2~3개),
  "reason": string (짧은 이유),
  "reply": string (한국어 공감 응답 1~2문장),
  "wifeCard": string (아내 화면 요약 1문장),
  "husbandCard": string (남편 행동 중심 1문장, 신체 수치 노출 금지)
}`

const VALID_MODES = Object.keys(MODE_LABELS) as Mode[]

export function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && VALID_MODES.includes(value as Mode)
}

export function getModeLabel(mode: Mode) {
  return MODE_LABELS[mode]
}

function normalizeText(text: string) {
  return text.trim().toLocaleLowerCase('ko-KR')
}

function clampConfidence(value: unknown, fallback: number) {
  const confidence = typeof value === 'number' ? value : fallback
  return Math.max(0, Math.min(1, confidence))
}

function buildFallbackResult(mode: Mode, signals: string[], confidence: number): ModeRouterResult {
  const defaults = DEFAULT_RESPONSES[mode]
  return {
    mode,
    modeLabel: defaults.modeLabel,
    confidence,
    signals,
    reason: defaults.reason,
    reply: defaults.reply,
    wifeCard: defaults.wifeCard,
    husbandCard: defaults.husbandCard,
  }
}

export function routeModeByKeywords(input: ModeRouterInput): ModeRouterResult {
  const text = normalizeText(input.text)
  if (!text) return buildFallbackResult('UNKNOWN', [], 0)

  const matches = KEYWORD_RULES.map((rule) => ({
    mode: rule.mode,
    baseConfidence: rule.baseConfidence,
    signals: rule.keywords.filter((keyword) => text.includes(keyword.toLowerCase())),
  })).filter((match) => match.signals.length > 0)

  if (matches.length === 0) {
    return buildFallbackResult('UNKNOWN', [], 0.2)
  }

  const bestMatch = matches.sort((a, b) => {
    const scoreA = a.baseConfidence + a.signals.length * 0.12
    const scoreB = b.baseConfidence + b.signals.length * 0.12
    return scoreB - scoreA
  })[0]
  const confidence = Math.min(0.95, bestMatch.baseConfidence + bestMatch.signals.length * 0.12)

  return buildFallbackResult(bestMatch.mode, bestMatch.signals, confidence)
}

function extractJsonObject(content: string) {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const match = trimmed.match(/\{[\s\S]*\}/)
  return match?.[0] ?? trimmed
}

function parseString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function parseGptResult(content: string, fallback: ModeRouterResult): ModeRouterResult {
  try {
    const parsed = JSON.parse(extractJsonObject(content)) as Partial<ModeRouterResult>
    const mode = isMode(parsed.mode) ? parsed.mode : fallback.mode
    const defaults = DEFAULT_RESPONSES[mode]
    const signals =
      Array.isArray(parsed.signals) && parsed.signals.every((signal) => typeof signal === 'string')
        ? parsed.signals
        : fallback.signals

    return {
      mode,
      modeLabel: parseString(parsed.modeLabel, defaults.modeLabel),
      confidence: clampConfidence(parsed.confidence, fallback.confidence),
      signals,
      reason: parseString(parsed.reason, defaults.reason),
      reply: parseString(parsed.reply, defaults.reply),
      wifeCard: parseString(parsed.wifeCard, defaults.wifeCard),
      husbandCard: parseString(parsed.husbandCard, defaults.husbandCard),
    }
  } catch {
    return fallback
  }
}

export async function routeAIMode(input: ModeRouterInput): Promise<ModeRouterResult> {
  const keywordResult = routeModeByKeywords(input)
  const text = input.text.trim()

  if (!text) return keywordResult

  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[ai-mode-router] OPENAI_API_KEY missing, keyword fallback used')
      return keywordResult
    }

    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            text,
            pregnancyWeek: input.pregnancyWeek,
            timeOfDay: input.timeOfDay,
            keywordFallback: keywordResult,
          }),
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return keywordResult

    return parseGptResult(content, keywordResult)
  } catch (error) {
    console.warn('[ai-mode-router] GPT classification failed, keyword fallback used:', error)
    return keywordResult
  }
}

export async function routeMode(text: string, pregnancyWeek?: number): Promise<ModeRouterResult>
export async function routeMode(input: ModeRouterInput): Promise<ModeRouterResult>
export async function routeMode(
  input: ModeRouterInput | string,
  pregnancyWeek?: number,
): Promise<ModeRouterResult> {
  return routeAIMode(typeof input === 'string' ? { text: input, pregnancyWeek } : input)
}
