import type { Mode } from '@/lib/ai-mode-router'
import type { PreparationMode } from '@/lib/shared-demo-state'
import { SIMULATION_BROADCAST_CHANNEL } from '@/lib/simulation-broadcast'

export const PREPARATION_MODE_STORAGE_KEY = 'thinq-mom-preparation-mode'

type PreparationIntent = {
  mode: PreparationMode
  hubMode: Mode
  label: string
  reply: string
}

const PREPARATION_INTENTS: Array<PreparationIntent & { patterns: RegExp[] }> = [
  {
    mode: 'sleep-rhythm',
    hubMode: 'SLEEP_MODE',
    label: '수면 리듬',
    reply: '공기청정기를 수면 모드로 바꾸고, 화면 자극과 생활 소음을 차분하게 낮췄어요.',
    patterns: [/잠/, /수면/, /취침/, /자주\s*깨/, /늦게\s*자/, /피곤/],
  },
  {
    mode: 'refresh',
    hubMode: 'TRAVEL_MODE',
    label: '마음 환기',
    reply: '공기청정기를 자동 모드로 바꾸고, 숲길 화면과 산뜻한 자연풍을 준비했어요.',
    patterns: [/스트레스/, /답답/, /환기/, /산책/, /숲/, /기분\s*전환/, /상쾌/],
  },
  {
    mode: 'couple-routine',
    hubMode: 'TRAVEL_MODE',
    label: '둘의 저녁',
    reply: '공기청정기를 자동 모드로 바꾸고, 둘이 편안히 머무는 저녁 공간을 만들었어요.',
    patterns: [/우리\s*둘/, /부부/, /함께/, /데이트/, /저녁/, /대화/, /둘만/],
  },
  {
    mode: 'rest-ready',
    hubMode: 'SLEEP_MODE',
    label: '휴식 준비',
    reply: '공기청정기를 수면 모드로 바꾸고, 잔잔한 음악과 따뜻한 조명으로 맞췄어요.',
    patterns: [/쉬고\s*싶/, /휴식/, /긴장/, /지쳤/, /힘들/, /잔잔/, /편안/],
  },
  {
    mode: 'condition',
    hubMode: 'HOUSEWORK_MODE',
    label: '컨디션 밸런스',
    reply: '공기청정기를 자동 모드로 바꾸고, 맑은 공기와 부드러운 아침빛으로 컨디션을 맞췄어요.',
    patterns: [/컨디션/, /아침/, /일어났/, /생활\s*리듬/, /건강/, /가볍게/],
  },
]

export function resolvePreparationIntent(
  text: string,
  role: 'wife' | 'husband' = 'wife',
): PreparationIntent {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (
    role === 'husband' &&
    /아내|배우자/.test(normalized) &&
    /예민|피곤|지쳤|힘들|쉬|휴식/.test(normalized)
  ) {
    return PREPARATION_INTENTS[3]
  }
  if (role === 'husband' && /아내|배우자|우리\s*둘|함께/.test(normalized)) {
    return PREPARATION_INTENTS[2]
  }

  return (
    PREPARATION_INTENTS.find((intent) =>
      intent.patterns.some((pattern) => pattern.test(normalized)),
    ) ?? PREPARATION_INTENTS[4]
  )
}

export function dispatchPreparationMode(intent: PreparationIntent, source: string) {
  if (typeof window === 'undefined') return

  const timestamp = Date.now()
  try {
    window.localStorage.setItem(
      PREPARATION_MODE_STORAGE_KEY,
      JSON.stringify({
        preparationMode: intent.mode,
        label: intent.label,
        source,
        timestamp,
      }),
    )

    const channel = new BroadcastChannel(SIMULATION_BROADCAST_CHANNEL)
    channel.postMessage({
      type: 'PREPARATION_MODE_CHANGE',
      preparationMode: intent.mode,
      label: intent.label,
      source,
      timestamp,
    })
    channel.close()
  } catch (error) {
    console.warn('[hub] preparation simulation dispatch failed:', error)
  }
}
