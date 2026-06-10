export type PregnancyFruit = {
  week: number
  fruitName: string
  fruitEmoji: string
  description: string
}

const PREGNANCY_FRUITS: PregnancyFruit[] = [
  { week: 8, fruitName: '라즈베리', fruitEmoji: '🫐', description: '이번 주 아기는 라즈베리만큼 자란 시기로 비유할 수 있어요.' },
  { week: 10, fruitName: '딸기', fruitEmoji: '🍓', description: '이번 주 아기는 딸기만큼 자란 시기로 비유할 수 있어요.' },
  { week: 12, fruitName: '라임', fruitEmoji: '🍋', description: '이번 주 아기는 라임만큼 자란 시기로 비유할 수 있어요.' },
  { week: 14, fruitName: '레몬', fruitEmoji: '🍋', description: '이번 주 아기는 레몬만큼 자란 시기로 비유할 수 있어요.' },
  { week: 16, fruitName: '아보카도', fruitEmoji: '🥑', description: '이번 주 아기는 아보카도만큼 자란 시기로 비유할 수 있어요.' },
  { week: 18, fruitName: '고구마', fruitEmoji: '🍠', description: '이번 주 아기는 고구마만큼 자란 시기로 비유할 수 있어요.' },
  { week: 20, fruitName: '바나나', fruitEmoji: '🍌', description: '이번 주 아기는 바나나만큼 자란 시기로 비유할 수 있어요.' },
  { week: 22, fruitName: '파파야', fruitEmoji: '🥭', description: '이번 주 아기는 파파야만큼 자란 시기로 비유할 수 있어요.' },
  { week: 24, fruitName: '옥수수', fruitEmoji: '🌽', description: '이번 주 아기는 옥수수만큼 자란 시기로 비유할 수 있어요.' },
  { week: 26, fruitName: '가지', fruitEmoji: '🍆', description: '이번 주 아기는 가지만큼 자란 시기로 비유할 수 있어요.' },
  { week: 28, fruitName: '코코넛', fruitEmoji: '🥥', description: '이번 주 아기는 코코넛만큼 자란 시기로 비유할 수 있어요.' },
  { week: 30, fruitName: '양배추', fruitEmoji: '🥬', description: '이번 주 아기는 양배추만큼 자란 시기로 비유할 수 있어요.' },
  { week: 32, fruitName: '호박', fruitEmoji: '🎃', description: '이번 주 아기는 호박만큼 자란 시기로 비유할 수 있어요.' },
  { week: 34, fruitName: '멜론', fruitEmoji: '🍈', description: '이번 주 아기는 멜론만큼 자란 시기로 비유할 수 있어요.' },
  { week: 36, fruitName: '로메인 상추', fruitEmoji: '🥬', description: '이번 주 아기는 로메인 상추만큼 자란 시기로 비유할 수 있어요.' },
  { week: 38, fruitName: '수박', fruitEmoji: '🍉', description: '이번 주 아기는 수박만큼 자란 시기로 비유할 수 있어요.' },
]

const FALLBACK_FRUIT: PregnancyFruit = {
  week: 0,
  fruitName: '작은 별',
  fruitEmoji: '✨',
  description: '오늘의 작은 별처럼 소중한 순간을 기록할 수 있어요.',
}

export function getPregnancyFruit(week: number | null | undefined): PregnancyFruit {
  if (week == null || !Number.isFinite(week) || week < 1) {
    return FALLBACK_FRUIT
  }

  const roundedWeek = Math.min(42, Math.max(1, Math.round(week)))
  let matched = PREGNANCY_FRUITS[0]

  for (const fruit of PREGNANCY_FRUITS) {
    if (fruit.week <= roundedWeek) {
      matched = fruit
    } else {
      break
    }
  }

  return matched
}

export function buildDefaultAiMessage(
  fruit: PregnancyFruit,
  pregnancyWeek: number | null | undefined,
  babyName?: string | null,
) {
  const weekLabel =
    pregnancyWeek && pregnancyWeek > 0 ? `${Math.round(pregnancyWeek)}주차의 ` : ''
  const namePart = babyName?.trim() ? `${babyName} ` : '아기 '
  return `오늘의 초음파 사진이 갤러리에 저장되었어요. ${weekLabel}${namePart}는 ${fruit.fruitName}만큼 자란 시기로 비유할 수 있어요. 오늘도 엄마와 함께 잘 자라고 있는 순간을 기록해둘게요.`
}

export function buildDefaultBabyVoiceText(
  fruit: PregnancyFruit,
  babyName?: string | null,
) {
  const speaker = babyName?.trim() ? babyName.trim() : '엄마'
  return `${speaker}, 나 오늘은 ${fruit.fruitName}만큼 자랐대요. 오늘도 내 사진 예쁘게 저장해줘서 고마워요.`
}

export const ULTRASOUND_DISCLAIMER =
  '이 내용은 의료 진단이 아닌 성장 기록용 감성 해석입니다. 정확한 의학적 판단은 의료진 상담이 필요합니다.'
