export type Mode =
  | 'NAUSEA_MODE'
  | 'AIR_ON'
  | 'AIR_OFF'
  | 'SLEEP_MODE'
  | 'HOUSEWORK_MODE'
  | 'TRAVEL_MODE'
  | 'MORNING_BRIEFING'
  | 'UNKNOWN'

export interface ModeRouterInput {
  text: string
  pregnancyWeek?: number
  pregnancyStatus?: 'preparing' | 'pregnant'
  audience?: 'wife' | 'husband' | 'hub'
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
  AIR_ON: '공기청정기 켜기',
  AIR_OFF: '공기청정기 끄기',
  SLEEP_MODE: '수면모드',
  HOUSEWORK_MODE: '가사케어 모드',
  TRAVEL_MODE: '휴양지모드',
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
    mode: 'AIR_OFF',
    keywords: ['공기청정기 꺼줘', '공기 꺼줘', '공기청정기 off', '공기청정기 꺼', '전원 꺼줘'],
    baseConfidence: 0.92,
  },
  {
    mode: 'AIR_ON',
    keywords: [
      '공기청정기 켜줘',
      '공기 켜줘',
      '공기청정기 on',
      '공기청정기 켜',
      '환기',
      '공기 탁해',
      '숨막혀',
    ],
    baseConfidence: 0.91,
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
      '역겨',
      '밥 냄새',
      '속이',
    ],
    baseConfidence: 0.64,
  },
  {
    mode: 'SLEEP_MODE',
    keywords: [
      '잘 거야',
      '잘거야',
      '잘 것 같아',
      '잘것 같아',
      '잘거 같아',
      '잘거같아',
      '잘 것 같애',
      '잘거 같애',
      '잘거같애',
      '자고 싶어',
      '졸려',
      '졸리다',
      '졸린',
      '잠 와',
      '잠온다',
      '잠이 와',
      '잠이 온다',
      '피곤해',
      '잠이 안 와',
      '자꾸 깼어',
      '수면',
      '쉬고 싶어',
      '눕고 싶어',
      '이제 잘래',
      '곧 잘래',
      '잘 준비',
      '잠을 제대로 못',
      '피곤해서 눕',
      '천근만근',
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
      '청소',
      '청소 못 하겠어',
      '식기',
      '일어나기 힘들어',
      '가사',
      '밀려',
      '가사 케어',
      '가사모드',
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
      '숲속',
      '도시',
      '야경',
      '파도',
      '여행',
      '우울해',
      '기분 전환',
      '리조트',
      '호텔',
      '힐링',
      '비 오는 창가',
      '온천',
      '카페',
      '발리',
      '여행 가고',
      '바다 보면',
      '호텔에서',
      '휴가',
      '휴양지',
      '라운지',
      '도심',
    ],
    baseConfidence: 0.58,
  },
]

const DEFAULT_RESPONSES: Record<Mode, Omit<ModeRouterResult, 'mode' | 'signals' | 'confidence'>> = {
  NAUSEA_MODE: {
    modeLabel: MODE_LABELS.NAUSEA_MODE,
    reason: '입덧, 냄새, 구역감과 관련된 표현이 감지됐어요.',
    reply: '냄새 부담이 줄어들도록 공기청정기를 터보 모드로 바꿔드릴게요.',
    wifeCard: '입덧 부담을 줄이기 위해 공기청정기 터보 모드를 준비했어요.',
    husbandCard: '오늘은 냄새가 적은 음식과 조용한 주방 환경을 도와주세요.',
  },
  AIR_ON: {
    modeLabel: MODE_LABELS.AIR_ON,
    reason: '공기청정기를 켜 달라는 직접 명령이 감지됐어요.',
    reply: '공기청정기를 켜드릴게요.',
    wifeCard: '공기청정기를 켜서 실내 공기를 정화할게요.',
    husbandCard: '공기청정기 켜기 요청이 실행됐어요.',
  },
  AIR_OFF: {
    modeLabel: MODE_LABELS.AIR_OFF,
    reason: '공기청정기 전원을 끄는 직접 명령이 감지됐어요.',
    reply: '공기청정기를 꺼드릴게요.',
    wifeCard: '공기청정기 전원을 껐어요.',
    husbandCard: '공기청정기 전원을 끄는 요청이 실행됐어요.',
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
    modeLabel: '다시 말해주세요',
    reason: '분류 가능한 케어 모드 신호를 찾지 못했어요.',
    reply: '조금 더 구체적으로 말해주시면 케어 모드를 찾아볼게요.',
    wifeCard: '아직 실행할 케어 모드를 찾지 못했어요.',
    husbandCard: '오늘 필요한 배려가 생기면 여기에서 알려드릴게요.',
  },
}

const MORNING_BRIEFING_KEYWORDS =
  KEYWORD_RULES.find((rule) => rule.mode === 'MORNING_BRIEFING')?.keywords ?? []

const SYSTEM_PROMPT = `임산부 케어 서비스의 자연어 해석 AI입니다.
임산부의 발화를 문맥과 감정까지 고려해서
아래 모드 중 하나로 분류하세요.

모드 정의:
- NAUSEA_MODE (입덧모드):
  입덧, 메스꺼움, 냄새 민감, 식욕 부진, 구역감,
  음식 거부감 등 입덧 관련 모든 표현.
  예: '밥 냄새가 역겨워', '아무것도 못 먹겠어',
  '비린내 때문에 미치겠어', '속이 뒤집어져'

- SLEEP_MODE (수면모드):
  피로, 졸림, 수면 준비, 불면, 휴식 욕구.
  예: '몸이 천근만근이야', '눕고만 싶다',
  '밤에 계속 깨', '쉬어야겠어'

- TRAVEL_MODE (휴양지모드):
  답답함, 우울감, 기분 전환 욕구, 여행 욕구,
  특정 장소에 대한 그리움.
  예: '발리 가고 싶다', '집에만 있으니 미치겠어',
  '바닷바람 쐬고 싶어', '제주도 생각난다',
  '카페에서 여유 부리고 싶어'

- HOUSEWORK_MODE (가사케어 모드):
  집안일 부담, 몸이 무거움, 허리 통증으로 인한
  가사 어려움.
  예: '빨래 산더미인데 못 하겠어', '허리가 끊어질 것 같아'

- AIR_ON: 공기청정기 켜기, 환기, 공기 정화 요청
- AIR_OFF: 공기청정기 끄기, 전원 OFF
- MORNING_BRIEFING: 아침 인사, 기상 알림
- UNKNOWN: 위 어디에도 해당 없음 (날씨, 일반 잡담 등)

중요:
- 직접적인 키워드가 없어도 문맥상 의도를 파악하세요
- 임산부의 감정 상태를 고려하세요
- 애매하면 가장 가까운 모드로 분류하되 confidence를 낮추세요
- confidence 0.5 미만이면 UNKNOWN으로

반환 JSON:
{
  "mode": string,
  "modeLabel": string,
  "confidence": number,
  "signals": string[] (감지된 신호 2~3개),
  "reason": string,
  "reply": string (한국어 공감 응답 1~2문장, 따뜻하게),
  "wifeCard": string (아내 화면 케어 요약 1~2문장),
  "husbandCard": string (남편 행동 제안 1문장.
    중요: 아내 증상을 직접 언급하지 말고
    행동만 자연스럽게 제안.
    예: '오늘 저녁은 담백한 메뉴 어떠세요?'
    금지: '아내가 입덧이 심하니까...')
}`

const PREPARING_CONTEXT_PROMPT = `현재 사용자는 "임신준비중" 데모 트랙에 있습니다.
- 임신 증상이나 태아 상태를 전제로 말하지 마세요.
- 생활 리듬, 수면, 공기, 스트레스 완화, 휴식, 부부 루틴 관점으로 해석하세요.
- wifeCard는 아내가 자신을 돌보는 차분한 안내로 작성하세요.
- husbandCard는 민감 상태를 전달하지 말고 지금 하기 좋은 행동과 말하기 팁만 제안하세요.
- 기존 가전 실행 모드 중 가장 가까운 것을 선택하되, 응답 문구는 반드시 준비기 맥락으로 작성하세요.`

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

function isDirectAirControlIntent(text: string) {
  return /공기청정기\s*(켜|꺼|on|off)|공기\s*(켜|꺼)/.test(text)
}

function resolveDirectAirControlIntent(text: string): ModeRouterResult | null {
  if (/공기청정기\s*(켜|on)|공기\s*켜/.test(text)) {
    return buildFallbackResult('AIR_ON', ['공기청정기 켜기'], 0.92)
  }
  if (/공기청정기\s*(꺼|off)|공기\s*꺼/.test(text)) {
    return buildFallbackResult('AIR_OFF', ['공기청정기 끄기'], 0.92)
  }
  return null
}

function isMorningBriefingIntent(text: string) {
  return MORNING_BRIEFING_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))
}

function clampConfidence(value: unknown, fallback: number) {
  const confidence = typeof value === 'number' ? value : fallback
  return Math.max(0, Math.min(1, confidence))
}

function applyLowConfidenceRule(result: ModeRouterResult): ModeRouterResult {
  if (result.mode !== 'UNKNOWN' && result.confidence < 0.5) {
    console.log('[ai-mode-router] low confidence, routing to UNKNOWN:', {
      originalMode: result.mode,
      confidence: result.confidence,
    })
    return buildFallbackResult('UNKNOWN', result.signals, result.confidence)
  }
  return result
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

  console.log('[ai-mode-router] keyword routing input:', text)

  const matches = KEYWORD_RULES.map((rule) => ({
    mode: rule.mode,
    baseConfidence: rule.baseConfidence,
    signals: rule.keywords.filter((keyword) => text.includes(keyword.toLowerCase())),
  })).filter((match) => match.signals.length > 0)

  if (matches.length === 0) {
    console.log('[ai-mode-router] keyword routing result: UNKNOWN')
    return buildFallbackResult('UNKNOWN', [], 0.2)
  }

  const bestMatch = matches.sort((a, b) => {
    const scoreA = a.baseConfidence + a.signals.length * 0.12
    const scoreB = b.baseConfidence + b.signals.length * 0.12
    return scoreB - scoreA
  })[0]
  const confidence = Math.min(0.95, bestMatch.baseConfidence + bestMatch.signals.length * 0.12)

  console.log('[ai-mode-router] keyword routing result:', {
    mode: bestMatch.mode,
    signals: bestMatch.signals,
    confidence,
  })

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
  const text = input.text.trim()
  const normalizedText = normalizeText(text)
  const keywordResult = routeModeByKeywords(input)

  if (!text) return keywordResult

  if (isDirectAirControlIntent(normalizedText)) {
    const directAirResult = resolveDirectAirControlIntent(normalizedText) ?? keywordResult
    console.log('[ai-mode-router] direct air control keyword priority:', {
      mode: directAirResult.mode,
      signals: directAirResult.signals,
    })
    return directAirResult
  }

  if (isMorningBriefingIntent(normalizedText)) {
    console.log('[ai-mode-router] morning briefing keyword priority:', {
      mode: keywordResult.mode,
      signals: keywordResult.signals,
    })
    return keywordResult.mode === 'MORNING_BRIEFING'
      ? keywordResult
      : buildFallbackResult(
          'MORNING_BRIEFING',
          MORNING_BRIEFING_KEYWORDS.filter((keyword) =>
            normalizedText.includes(keyword.toLowerCase()),
          ),
          0.85,
        )
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[ai-mode-router] OPENAI_API_KEY missing, keyword fallback used')
      return keywordResult
    }

    console.log('[ai-mode-router] GPT classification start:', { text })

    const { default: OpenAI } = await import('openai')
    const { OPENAI_MODELS } = await import('@/lib/openai-models')
    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODELS.text,
      messages: [
        {
          role: 'system',
          content:
            input.pregnancyStatus === 'preparing'
              ? `${SYSTEM_PROMPT}\n\n${PREPARING_CONTEXT_PROMPT}`
              : SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: JSON.stringify({
            text,
            pregnancyWeek: input.pregnancyWeek,
            pregnancyStatus: input.pregnancyStatus,
            audience: input.audience,
            timeOfDay: input.timeOfDay,
          }),
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      console.warn('[ai-mode-router] GPT returned empty content, keyword fallback used')
      return keywordResult
    }

    const result = applyLowConfidenceRule(parseGptResult(content, keywordResult))
    console.log('[ai-mode-router] GPT routing result:', {
      mode: result.mode,
      confidence: result.confidence,
      signals: result.signals,
    })
    return result
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
