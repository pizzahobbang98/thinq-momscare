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
}

const MODE_LABELS: Record<Mode, string> = {
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
    keywords: ['굿모닝', '좋은 아침', '나 일어났어', '기상', '일어났어'],
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
      '밤에 더웠어',
      '수면',
      '쉬고 싶어',
      '눕고 싶어',
    ],
  },
  {
    mode: 'HOUSEWORK_MODE',
    keywords: [
      '몸이 무거워',
      '움직이기 힘들어',
      '허리 아파',
      '빨래',
      '집안일 하기 힘들어',
      '청소 못 하겠어',
      '식기',
      '일어나기 힘들어',
    ],
  },
  {
    mode: 'TRAVEL_MODE',
    keywords: [
      '답답해',
      '어디 가고 싶어',
      '바다 보고 싶어',
      '숲',
      '여행',
      '우울해',
      '기분 전환',
      '리조트',
      '호텔',
      '힐링',
      '환기',
    ],
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
    reason: '4대 모드와 직접 연결되는 신호를 찾지 못했어요.',
    reply: '조금만 더 구체적으로 말씀해주시면 필요한 케어를 찾아드릴게요.',
    wifeCard: '아직 실행할 케어 모드를 찾지 못했어요.',
    husbandCard: '아내의 상태를 한 번 더 부드럽게 물어봐 주세요.',
  },
}

const SYSTEM_PROMPT = `임산부 케어 서비스 AI입니다.
아래 발화를 분석해서 4대 모드 중 하나로 분류하고
JSON만 반환하세요.

모드:
- NAUSEA_MODE: 입덧, 냄새, 구역감 관련
- SLEEP_MODE: 수면, 피로, 휴식 관련
- HOUSEWORK_MODE: 가사, 집안일, 무거운 몸 관련
- TRAVEL_MODE: 답답함, 기분 전환, 여행 관련
- MORNING_BRIEFING: 굿모닝, 기상 인사 관련
- UNKNOWN: 위 어디에도 해당 없음

반환 형식:
{
  "mode": string,
  "modeLabel": string,
  "confidence": number,
  "signals": string[],
  "reason": string,
  "reply": string,
  "wifeCard": string,
  "husbandCard": string
}`

const VALID_MODES = Object.keys(MODE_LABELS) as Mode[]

function normalizeText(text: string) {
  return text.trim().toLowerCase()
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
    signals: rule.keywords.filter((keyword) => text.includes(keyword.toLowerCase())),
  })).filter((match) => match.signals.length > 0)

  if (matches.length === 0) {
    return buildFallbackResult('UNKNOWN', [], 0.2)
  }

  const bestMatch = matches.sort((a, b) => b.signals.length - a.signals.length)[0]
  const confidence = Math.min(0.95, 0.55 + bestMatch.signals.length * 0.15)

  return buildFallbackResult(bestMatch.mode, bestMatch.signals, confidence)
}

function parseGptResult(content: string, fallback: ModeRouterResult): ModeRouterResult {
  try {
    const parsed = JSON.parse(content) as Partial<ModeRouterResult>
    const mode = VALID_MODES.includes(parsed.mode as Mode) ? (parsed.mode as Mode) : fallback.mode
    const defaults = DEFAULT_RESPONSES[mode]
    const signals =
      Array.isArray(parsed.signals) && parsed.signals.every((signal) => typeof signal === 'string')
        ? parsed.signals
        : fallback.signals

    return {
      mode,
      modeLabel: parsed.modeLabel?.trim() || defaults.modeLabel,
      confidence: clampConfidence(parsed.confidence, fallback.confidence),
      signals,
      reason: parsed.reason?.trim() || defaults.reason,
      reply: parsed.reply?.trim() || defaults.reply,
      wifeCard: parsed.wifeCard?.trim() || defaults.wifeCard,
      husbandCard: parsed.husbandCard?.trim() || defaults.husbandCard,
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
