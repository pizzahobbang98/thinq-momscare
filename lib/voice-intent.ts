import { MODE_LABELS, routeModeByKeywords, type Mode } from '@/lib/ai-mode-router'
import type { HubDemoUtterance } from '@/lib/hub-demo-utterances'
import {
  buildSimulationTestModeSnapshot,
  type SimulationTestModeSlug,
} from '@/lib/simulation-test-mode-sync'
import type { SimulationRoutineId, TravelDestination } from '@/lib/simulation-routine-bridge'

export type CareIntentId =
  | 'sleep_care'
  | 'nausea_care'
  | 'destination_ocean'
  | 'destination_forest'
  | 'destination_city'
  | 'housework_care'
  | 'morning_briefing'
  | 'air_control'
  | 'unknown'

export type HubCareIntent = {
  intent: CareIntentId
  hubMode: Mode
  routineId: SimulationRoutineId | null
  destination: TravelDestination | null
  simulationModeSlug: SimulationTestModeSlug | null
  modeLabel: string
  confidence: number
  matchedKeywords: string[]
  signals: string[]
  reason: string
  replyPreview: string
  wifeCardPreview: string
  husbandCardPreview: string
  transcriptUsed: string
  userFeedback: string
}

type IntentRule = {
  intent: CareIntentId
  hubMode: Mode
  routineId: SimulationRoutineId | null
  destination: TravelDestination | null
  simulationModeSlug: SimulationTestModeSlug | null
  keywords: string[]
  phrases: string[]
  phraseWeight: number
  keywordWeight: number
  baseConfidence: number
}

const PHRASE_WEIGHT = 0.28
const KEYWORD_WEIGHT = 0.14

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'sleep_care',
    hubMode: 'SLEEP_MODE',
    routineId: 'sleep_care',
    destination: null,
    simulationModeSlug: 'sleep',
    keywords: [
      '잠',
      '잠들',
      '수면',
      '숙면',
      '자고 싶',
      '잠이 안',
      '안들지',
      '잘 안 와',
      '어둡게',
      '조용하게',
      '편안하게',
      '차분하게',
      '밤',
      '자주 깨',
      '푹 자',
      '침실',
      '졸려',
      '피곤',
      '쉬고 싶',
    ],
    phrases: [
      '왜 이렇게 잠이 안들지',
      '왜 이렇게 잠이 안 들지',
      '잠이 안 와',
      '잠이 잘 안 와',
      '편하게 자고 싶어',
      '조용히 잠들고 싶어',
      '잠들기 편하게',
      '잠이 잘 안 와',
    ],
    phraseWeight: PHRASE_WEIGHT,
    keywordWeight: KEYWORD_WEIGHT,
    baseConfidence: 0.62,
  },
  {
    intent: 'nausea_care',
    hubMode: 'NAUSEA_MODE',
    routineId: 'nausea_food',
    destination: null,
    simulationModeSlug: 'morning_sickness',
    keywords: [
      '냄새',
      '울렁',
      '메스꺼',
      '속이 안 좋',
      '토할',
      '입덧',
      '주방',
      '냉장고',
      '음식 냄새',
      '환기',
      '상쾌',
      '역겨',
      '구역',
    ],
    phrases: [
      '냄새 때문에 너무 힘들어',
      '음식 냄새가 힘들어',
      '냄새가 너무 힘들어',
      '속이 울렁거려',
      '냄새 좀 줄여줘',
      '음식 냄새',
      '주방 냄새',
    ],
    phraseWeight: PHRASE_WEIGHT,
    keywordWeight: KEYWORD_WEIGHT,
    baseConfidence: 0.64,
  },
  {
    intent: 'destination_ocean',
    hubMode: 'TRAVEL_MODE',
    routineId: 'destination_ocean',
    destination: 'ocean',
    simulationModeSlug: 'travel_ocean',
    keywords: [
      '바다',
      '바닷가',
      '해변',
      '파도',
      '리조트',
      '시원한',
      '휴양지',
      '오션',
      '물결',
      '해물',
    ],
    phrases: [
      '시원한 바다 보고 싶어',
      '바다 보고 싶어',
      '바다에 가고 싶어',
      '시원한 곳으로 가고 싶어',
      '파도 소리 듣고 싶어',
      '바다 보면서 쉬고 싶어',
    ],
    phraseWeight: PHRASE_WEIGHT,
    keywordWeight: KEYWORD_WEIGHT,
    baseConfidence: 0.6,
  },
  {
    intent: 'destination_forest',
    hubMode: 'TRAVEL_MODE',
    routineId: 'destination_forest',
    destination: 'forest',
    simulationModeSlug: 'travel_forest',
    keywords: [
      '숲',
      '숲속',
      '숲 속',
      '나무',
      '초록',
      '자연',
      '산장',
      '피톤치드',
      '풀향',
      '조용한 자연',
      '산속',
      '숲 같은',
    ],
    phrases: [
      '조용한 숲에 가고 싶어',
      '숲에 가고 싶어',
      '초록색 나무 보고 싶어',
      '자연 속에 있고 싶어',
      '조용한 곳에서 쉬고 싶어',
      '숲처럼 편하게 해줘',
      '초록빛으로 편하게 해줘',
    ],
    phraseWeight: PHRASE_WEIGHT,
    keywordWeight: KEYWORD_WEIGHT,
    baseConfidence: 0.6,
  },
  {
    intent: 'destination_city',
    hubMode: 'TRAVEL_MODE',
    routineId: 'destination_city',
    destination: 'city',
    simulationModeSlug: 'travel_city',
    keywords: [
      '도시',
      '도심',
      '야경',
      '호텔',
      '라운지',
      '고층',
      '창밖',
      '세련',
      '시티뷰',
      '밤 풍경',
      '빌딩',
    ],
    phrases: [
      '도시 야경 보고 싶어',
      '도시 야경을 보고 싶어',
      '야경 보고 싶어',
      '밤 풍경 보고 싶어',
      '반짝이는 도시 보고 싶어',
      '호텔 라운지처럼 해줘',
      '창밖 야경 느낌으로 해줘',
    ],
    phraseWeight: PHRASE_WEIGHT,
    keywordWeight: KEYWORD_WEIGHT,
    baseConfidence: 0.6,
  },
  {
    intent: 'housework_care',
    hubMode: 'HOUSEWORK_MODE',
    routineId: 'housework_care',
    destination: null,
    simulationModeSlug: 'housework',
    keywords: [
      '몸이 무거워',
      '빨래',
      '청소',
      '집안일',
      '세탁',
      '건조',
      '정리',
      '먼지',
      '로봇청소기',
      '바닥',
      '가사',
      '밀려',
      '식기',
    ],
    phrases: [
      '몸이 너무 무거워',
      '오늘 몸이 무거워',
      '움직이기 힘들어',
      '집안일이 힘들어',
      '청소하기 힘들어',
      '빨래가 부담돼',
      '몸이 무거워서 못 움직이겠어',
    ],
    phraseWeight: PHRASE_WEIGHT,
    keywordWeight: KEYWORD_WEIGHT,
    baseConfidence: 0.58,
  },
]

const SPEECH_CORRECTIONS: Array<{
  from: string
  to: string
  whenNearby: string[]
}> = [
  { from: '숙소', to: '숲속', whenNearby: ['나무', '자연', '초록', '산장', '피톤치드', '숲'] },
  { from: '수박', to: '수면', whenNearby: ['잠', '밤', '자고', '어둡게', '편안'] },
  { from: '바닥', to: '바닷가', whenNearby: ['파도', '해변', '리조트', '시원한', '바다'] },
  { from: '속소', to: '숲속', whenNearby: ['나무', '자연', '초록', '숲'] },
]

const FOREST_CONTEXT = ['나무', '자연', '초록', '산장', '피톤치드', '숲', '산속', '풀']
const OCEAN_CONTEXT = ['파도', '해변', '리조트', '시원한', '바다', '물결']
const CITY_CONTEXT = ['야경', '호텔', '라운지', '고층', '창밖', '도심', '도시']

export function normalizeCareTranscript(text: string) {
  return text
    .trim()
    .replace(/[.!?。！？,，…]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

export function buildTranscriptVariants(rawText: string) {
  const normalized = normalizeCareTranscript(rawText)
  const compact = normalized.replace(/\s/g, '')
  const variants = new Set<string>([rawText.trim(), normalized, compact])

  for (const correction of SPEECH_CORRECTIONS) {
    if (!normalized.includes(correction.from)) continue
    if (!includesAny(normalized, correction.whenNearby)) continue
    variants.add(normalized.replaceAll(correction.from, correction.to))
    variants.add(compact.replaceAll(correction.from, correction.to))
  }

  if (normalized.includes('숙소')) {
    if (includesAny(normalized, FOREST_CONTEXT)) {
      variants.add(normalized.replaceAll('숙소', '숲속'))
    }
    if (includesAny(normalized, OCEAN_CONTEXT)) {
      variants.add(normalized.replaceAll('숙소', '바닷가'))
    }
    if (includesAny(normalized, CITY_CONTEXT)) {
      variants.add(normalized.replaceAll('숙소', '호텔'))
    }
  }

  return Array.from(variants).filter(Boolean)
}

function scoreRuleOnText(rule: IntentRule, text: string) {
  const normalized = normalizeCareTranscript(text)
  const compact = normalized.replace(/\s/g, '')

  const matchedKeywords = rule.keywords.filter(
    (keyword) => normalized.includes(keyword) || compact.includes(keyword.replace(/\s/g, '')),
  )
  const matchedPhrases = rule.phrases.filter(
    (phrase) => normalized.includes(phrase) || compact.includes(phrase.replace(/\s/g, '')),
  )

  if (matchedKeywords.length === 0 && matchedPhrases.length === 0) {
    return null
  }

  const score = Math.min(
    0.98,
    rule.baseConfidence +
      matchedPhrases.length * rule.phraseWeight +
      matchedKeywords.length * rule.keywordWeight,
  )

  return {
    rule,
    score,
    matchedKeywords: [...matchedPhrases, ...matchedKeywords],
    signals: [...matchedPhrases, ...matchedKeywords],
  }
}

function buildIntentFromRule(
  rule: IntentRule,
  score: number,
  matchedKeywords: string[],
  signals: string[],
  transcriptUsed: string,
): HubCareIntent {
  const snapshot = rule.routineId
    ? buildSimulationTestModeSnapshot(rule.routineId, 'hub-execute')
    : null

  const modeLabel =
    rule.hubMode === 'TRAVEL_MODE' && rule.destination
      ? `${MODE_LABELS.TRAVEL_MODE} · ${rule.destination === 'ocean' ? '바다' : rule.destination === 'forest' ? '숲' : '도시'}`
      : MODE_LABELS[rule.hubMode]

  const replyPreview = snapshot?.reply ?? `${modeLabel}로 이해했어요.`
  const wifeCardPreview = snapshot?.wifeCard ?? replyPreview
  const husbandCardPreview = snapshot?.husbandCard ?? '오늘 필요한 배려를 행동으로 준비해보세요.'
  const reason = snapshot?.reason ?? `${modeLabel} 의도가 감지됐어요.`

  return {
    intent: rule.intent,
    hubMode: rule.hubMode,
    routineId: rule.routineId,
    destination: rule.destination,
    simulationModeSlug: rule.simulationModeSlug,
    modeLabel,
    confidence: score,
    matchedKeywords,
    signals,
    reason,
    replyPreview,
    wifeCardPreview,
    husbandCardPreview,
    transcriptUsed,
    userFeedback: buildIntentUserFeedback(modeLabel, rule.intent),
  }
}

export function buildIntentUserFeedback(modeLabel: string, intent: CareIntentId) {
  if (intent === 'sleep_care') {
    return '잠들기 좋은 분위기로 이해했어요. 3D 공간을 먼저 전환하고, 공기청정기 작동을 요청하고 있어요.'
  }
  if (intent === 'nausea_care') {
    return '냄새 부담을 줄이는 케어로 이해했어요. 3D 공간을 먼저 전환하고, 공기청정기 작동을 요청하고 있어요.'
  }
  if (intent.startsWith('destination_')) {
    return `${modeLabel}로 이해했어요. 3D 공간을 먼저 전환하고, 공기청정기 작동을 요청하고 있어요.`
  }
  if (intent === 'housework_care') {
    return '집안일 케어로 이해했어요. 시뮬레이션 환경을 먼저 적용하고 있어요.'
  }
  return `${modeLabel}로 이해했어요. 3D 공간을 먼저 전환하고 있어요.`
}

export function parseCareIntent(transcripts: string[]): HubCareIntent {
  const candidates = transcripts.flatMap((text) => buildTranscriptVariants(text))
  const uniqueCandidates = Array.from(new Set(candidates))

  let best:
    | {
        rule: IntentRule
        score: number
        matchedKeywords: string[]
        signals: string[]
        transcriptUsed: string
      }
    | null = null

  for (const transcript of uniqueCandidates) {
    for (const rule of INTENT_RULES) {
      const scored = scoreRuleOnText(rule, transcript)
      if (!scored) continue
      if (!best || scored.score > best.score) {
        best = {
          rule: scored.rule,
          score: scored.score,
          matchedKeywords: scored.matchedKeywords,
          signals: scored.signals,
          transcriptUsed: transcript,
        }
      }
    }
  }

  for (const transcript of uniqueCandidates) {
    const keywordRoute = routeModeByKeywords({ text: transcript })
    if (keywordRoute.mode === 'UNKNOWN') continue

    const mappedRule = INTENT_RULES.find((rule) => rule.hubMode === keywordRoute.mode)
    const score = Math.max(keywordRoute.confidence, mappedRule?.baseConfidence ?? 0.5)
    if (!best || score > best.score) {
      best = {
        rule:
          mappedRule ??
          ({
            intent: 'unknown',
            hubMode: keywordRoute.mode,
            routineId: null,
            destination: null,
            simulationModeSlug: null,
            keywords: [],
            phrases: [],
            phraseWeight: 0,
            keywordWeight: 0,
            baseConfidence: keywordRoute.confidence,
          } as IntentRule),
        score,
        matchedKeywords: keywordRoute.signals,
        signals: keywordRoute.signals,
        transcriptUsed: transcript,
      }
    }
  }

  if (!best || best.score < 0.5) {
    return {
      intent: 'unknown',
      hubMode: 'UNKNOWN',
      routineId: null,
      destination: null,
      simulationModeSlug: null,
      modeLabel: MODE_LABELS.UNKNOWN,
      confidence: best?.score ?? 0,
      matchedKeywords: best?.matchedKeywords ?? [],
      signals: best?.signals ?? [],
      reason: '의도를 확실히 파악하지 못했어요.',
      replyPreview: '조금 더 구체적으로 말해주시면 케어 모드를 찾아볼게요.',
      wifeCardPreview: '조금 더 구체적으로 말해주시면 케어 모드를 찾아볼게요.',
      husbandCardPreview: '오늘 필요한 배려를 행동으로 준비해보세요.',
      transcriptUsed: uniqueCandidates[0] ?? '',
      userFeedback: '조금 더 구체적으로 말해주시면 케어 모드를 찾아볼게요.',
    }
  }

  return buildIntentFromRule(
    best.rule,
    best.score,
    best.matchedKeywords,
    best.signals,
    best.transcriptUsed,
  )
}

export function resolveHubCareIntent(
  text: string,
  demoUtterance?: HubDemoUtterance | null,
  alternatives: string[] = [],
): HubCareIntent {
  if (demoUtterance) {
    const snapshot = buildSimulationTestModeSnapshot(demoUtterance.routineId, 'hub-execute')
    const intentId: CareIntentId =
      demoUtterance.routineId === 'sleep_care'
        ? 'sleep_care'
        : demoUtterance.routineId === 'nausea_food'
          ? 'nausea_care'
          : demoUtterance.routineId === 'housework_care'
            ? 'housework_care'
            : demoUtterance.routineId === 'destination_forest'
              ? 'destination_forest'
              : demoUtterance.routineId === 'destination_city'
                ? 'destination_city'
                : 'destination_ocean'

    return {
      intent: intentId,
      hubMode: demoUtterance.hubMode,
      routineId: demoUtterance.routineId,
      destination: demoUtterance.destination,
      simulationModeSlug: demoUtterance.simulationMode,
      modeLabel: snapshot.modeLabel,
      confidence: 1,
      matchedKeywords: [demoUtterance.label],
      signals: snapshot.signals,
      reason: snapshot.reason,
      replyPreview: snapshot.reply,
      wifeCardPreview: snapshot.wifeCard,
      husbandCardPreview: snapshot.husbandCard,
      transcriptUsed: text.trim(),
      userFeedback: buildIntentUserFeedback(snapshot.modeLabel, intentId),
    }
  }

  const transcripts = [text, ...alternatives].filter((item) => item.trim())
  return parseCareIntent(transcripts)
}

export function buildPendingDeviceResults(hubMode: Mode) {
  if (hubMode === 'UNKNOWN' || hubMode === 'MORNING_BRIEFING') return []

  const label =
    hubMode === 'HOUSEWORK_MODE'
      ? '집안 환경 케어 요청 중'
      : '공기청정기 작동 요청 중'

  return [
    {
      device: '공기청정기',
      action: 'pending',
      label,
      status: 'planned' as const,
      executionStatus: 'skipped' as const,
      executionMessage: '요청 중',
    },
  ]
}
