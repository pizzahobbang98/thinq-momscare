export const BABY_ENCOURAGEMENT_MESSAGES = [
  '엄마, 오늘 조금만 쉬어도 괜찮아요. 저는 여기 있어요.',
  '엄마, 힘든 날도 있는 거 알아요. 그래도 잘 버티고 계세요.',
  '엄마, 너무 무리하지 마요. 천천히 가도 돼요.',
  '엄마, 오늘은 편한 만큼만 해도 충분해요.',
  '엄마, 잠깐 숨 고를 시간 가져도 괜찮아요.',
  '엄마, 몸이 무거워도 괜찮아요. 제가 옆에 있어요.',
  '엄마, 컨디션이 안 좋아도 괜찮아요. 그런 날도 있는 거예요.',
  '엄마, 혼자 버티지 않아도 돼요. 도와달라고 말해도 괜찮아요.',
  '엄마, 오늘은 스스로에게 조금만 더 친절해도 돼요.',
  '엄마, 피곤할 땐 천천히 가도 괜찮아요. 기다릴게요.',
] as const

export function pickRandomEncouragementMessage(current?: string | null) {
  const pool =
    current != null
      ? BABY_ENCOURAGEMENT_MESSAGES.filter((message) => message !== current)
      : [...BABY_ENCOURAGEMENT_MESSAGES]

  return pool[Math.floor(Math.random() * pool.length)] ?? BABY_ENCOURAGEMENT_MESSAGES[0]
}
