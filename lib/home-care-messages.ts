import type { DemoPregnancyStatus, DemoRole } from '@/lib/shared-demo-state'

export type HomeCareMessage = {
  condition: string
  cheer: string
}

type HomeCareMessageKey = `${DemoPregnancyStatus}:${DemoRole}`

const HOME_CARE_MESSAGES: Record<HomeCareMessageKey, HomeCareMessage[]> = {
  'preparing:wife': [
    {
      condition: '몸이 무겁게 느껴진다면 오늘 계획을 줄이고 수면 리듬부터 맞춰보세요.',
      cheer: '따뜻한 조명과 조용한 공기로 몸의 긴장을 낮추는 하루가 좋아요.',
    },
    {
      condition: '아침부터 피로가 남아 있다면 카페인보다 물 한 잔과 가벼운 스트레칭을 먼저 챙겨보세요.',
      cheer: '오늘은 속도를 내기보다 내 몸이 편한 순서를 찾는 것만으로 충분해요.',
    },
    {
      condition: '컨디션이 들쑥날쑥한 날에는 식사 시간과 잠드는 시간을 일정하게 잡아보세요.',
      cheer: '작은 루틴 하나가 하루의 부담을 꽤 많이 덜어줄 수 있어요.',
    },
    {
      condition: '배가 차갑거나 몸이 긴장된다면 따뜻한 물과 조용한 휴식 시간을 먼저 만들어보세요.',
      cheer: '오늘은 준비를 잘하는 날보다 몸을 편하게 돌보는 날로 보내도 좋아요.',
    },
    {
      condition: '기분이 쉽게 가라앉는다면 집 안 공기를 바꾸고 화면 자극을 조금 줄여보세요.',
      cheer: '차분한 공간이 마음의 속도를 낮춰줄 거예요. 한 번에 많이 하지 않아도 괜찮아요.',
    },
    {
      condition: '움직이기 귀찮은 날에는 큰 운동 대신 5분 정도만 몸을 풀어도 리듬을 지키는 데 도움이 돼요.',
      cheer: '오늘의 목표는 완벽한 관리가 아니라 내 몸과 사이좋게 지내는 거예요.',
    },
  ],
  'preparing:husband': [
    {
      condition: '오늘은 컨디션을 길게 묻기보다 저녁 루틴을 먼저 가볍게 정리해주는 게 좋아요.',
      cheer: '집안 분위기를 편안하게 만들어두면 둘이 함께 쉬는 시간이 더 좋아집니다.',
    },
    {
      condition: '아침에는 일정 확인과 집안 정리를 먼저 해두면 하루 시작이 훨씬 부드러워져요.',
      cheer: '묻기 전에 작은 일을 하나 줄여주는 배려가 오늘의 좋은 출발이 될 수 있어요.',
    },
    {
      condition: '오늘은 밝은 조명보다 은은한 빛과 조용한 공기를 먼저 준비해보세요.',
      cheer: '편안한 환경을 만들어두면 둘의 대화도 더 자연스럽게 이어질 거예요.',
    },
    {
      condition: '저녁 식사는 무겁게 정하기보다 준비와 정리가 쉬운 메뉴로 맞추는 게 좋아요.',
      cheer: '함께 보내는 시간을 남겨두는 선택이 오늘은 더 큰 도움이 됩니다.',
    },
    {
      condition: '집안일이 쌓여 있다면 눈에 보이는 한 가지부터 먼저 치워두세요.',
      cheer: '작은 정리가 하루의 긴장을 줄여줘요. 말보다 먼저 움직이면 더 든든하게 느껴집니다.',
    },
    {
      condition: '오늘은 둘의 수면 리듬을 위해 늦은 시간 소음과 화면 밝기를 줄여보세요.',
      cheer: '편히 쉬는 분위기를 같이 만들어두면 내일 아침도 조금 더 가벼워질 거예요.',
    },
  ],
  'pregnant:wife': [
    {
      condition: '냄새가 예민한 날에는 식사보다 먼저 공기와 환기 상태를 편하게 맞춰보세요.',
      cheer: '오늘은 많이 해내는 것보다 덜 불편하게 보내는 것이 더 중요해요.',
    },
    {
      condition: '잠이 부족했다면 오전 일정은 하나 줄이고, 밝은 조명보다 부드러운 빛으로 시작해보세요.',
      cheer: '회복이 먼저인 날이에요. 몸이 쉬자는 신호를 보내면 그 신호를 믿어도 괜찮아요.',
    },
    {
      condition: '피로가 빠르게 올라오면 서서 버티기보다 앉아서 할 수 있는 일부터 골라보세요.',
      cheer: '오늘은 덜 움직이는 선택도 충분히 좋은 케어예요.',
    },
    {
      condition: '식사 냄새가 부담된다면 따뜻한 음식보다 향이 적은 간단한 메뉴로 시작해보세요.',
      cheer: '참아내는 하루가 아니라 편해지는 방법을 하나씩 찾는 하루로 보내요.',
    },
    {
      condition: '몸이 무겁게 느껴지는 날에는 물을 가까이 두고 짧게 자주 쉬는 편이 좋아요.',
      cheer: '작은 휴식이 쌓이면 하루 전체가 조금 덜 힘들어질 수 있어요.',
    },
    {
      condition: '마음이 답답하면 집 안 공기와 소리를 먼저 낮추고, 필요한 일만 천천히 처리해보세요.',
      cheer: '오늘의 우선순위는 편안함이에요. 해야 할 일보다 내 몸의 여유를 먼저 챙겨요.',
    },
  ],
  'pregnant:husband': [
    {
      condition: '오늘은 말로 묻기보다 냄새 나는 음식과 집안일을 먼저 줄여주는 게 도움이 됩니다.',
      cheer: '작은 배려가 오늘의 피로를 크게 줄일 수 있어요. 공기와 조명을 먼저 편하게 맞춰주세요.',
    },
    {
      condition: '아침에는 환기와 공기청정기를 먼저 확인하고, 식사 냄새가 오래 남지 않게 정리해보세요.',
      cheer: '편한 공기를 만들어두는 것만으로도 하루 시작이 훨씬 부드러워질 수 있어요.',
    },
    {
      condition: '오늘은 무거운 집안일을 먼저 맡고, 필요한 물건을 손 닿는 곳에 두면 좋아요.',
      cheer: '대단한 말보다 먼저 덜어주는 행동이 더 크게 전해지는 날이에요.',
    },
    {
      condition: '저녁에는 조명 밝기와 TV 소리를 낮추고 쉬기 좋은 분위기를 만들어보세요.',
      cheer: '편히 기대어 쉴 수 있는 공간을 준비해두면 오늘의 긴장이 많이 줄어듭니다.',
    },
    {
      condition: '외출이나 이동이 있다면 동선을 짧게 잡고, 중간에 쉴 시간을 먼저 넣어두세요.',
      cheer: '계획을 조금 느슨하게 잡는 것이 오늘은 가장 실용적인 배려가 될 수 있어요.',
    },
    {
      condition: '음식 준비는 향이 강한 메뉴를 피하고, 정리까지 바로 끝낼 수 있는 방식이 좋아요.',
      cheer: '집 안 냄새와 소음을 줄여두면 아내가 덜 신경 쓰고 쉬기 쉬워집니다.',
    },
  ],
}

function getKoreaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function getHomeCareMessage(options: {
  pregnancyStatus: DemoPregnancyStatus
  role: DemoRole
  dateKey?: string | null
  rhythmLabel?: string | null
}) {
  const key: HomeCareMessageKey = `${options.pregnancyStatus}:${options.role}`
  const candidates = HOME_CARE_MESSAGES[key]
  const seed = [
    options.dateKey || getKoreaDateKey(),
    options.pregnancyStatus,
    options.role,
    options.rhythmLabel || '',
  ].join('|')
  return candidates[hashString(seed) % candidates.length]
}

