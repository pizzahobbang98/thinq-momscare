export type PregnancyCalendarEventKind = 'checkup' | 'application' | 'preparation'

export type PregnancyCalendarEvent = {
  id: string
  date: string
  week: number
  kind: PregnancyCalendarEventKind
  title: string
  description: string
  action: string
}

type PregnancyMilestone = Omit<PregnancyCalendarEvent, 'id' | 'date'>

const PREGNANCY_MILESTONES: PregnancyMilestone[] = [
  {
    week: 6,
    kind: 'checkup',
    title: '첫 초음파 확인',
    description: '임신 초기 상태와 심박 확인 시기를 병원과 상의해요.',
    action: '진료 일정 확인',
  },
  {
    week: 8,
    kind: 'application',
    title: '맘편한 임신 서비스 확인',
    description: '정부 임신 지원 서비스를 한 번에 신청할 수 있는지 확인해요.',
    action: '정부24 신청 항목 확인',
  },
  {
    week: 9,
    kind: 'application',
    title: '국민행복카드 신청 확인',
    description: '임신·출산 진료비 지원 등록과 카드 발급 여부를 확인해요.',
    action: '지원 등록 상태 확인',
  },
  {
    week: 11,
    kind: 'checkup',
    title: '1차 선별검사 상담',
    description: '목덜미 투명대 검사 등 초기 선별검사 시기를 의료진과 상의해요.',
    action: '병원 예약 확인',
  },
  {
    week: 16,
    kind: 'checkup',
    title: '2차 선별검사 상담',
    description: '쿼드 검사 등 중기 선별검사 필요 여부를 의료진과 확인해요.',
    action: '검사 안내 확인',
  },
  {
    week: 20,
    kind: 'checkup',
    title: '정밀 초음파',
    description: '아기의 성장과 주요 구조를 자세히 확인하는 일정을 준비해요.',
    action: '정밀 초음파 예약',
  },
  {
    week: 22,
    kind: 'preparation',
    title: '산후조리 계획 세우기',
    description: '산후조리원, 가족 도움, 산후도우미 등 필요한 돌봄 방식을 비교해요.',
    action: '이용 조건과 일정 확인',
  },
  {
    week: 24,
    kind: 'checkup',
    title: '임신성 당뇨 검사',
    description: '병원 안내에 따라 당부하 검사 일정과 준비사항을 확인해요.',
    action: '금식 여부 등 병원 안내 확인',
  },
  {
    week: 28,
    kind: 'checkup',
    title: '빈혈·철분 상태 확인',
    description: '혈액검사와 철분 보충 필요 여부를 의료진과 상의해요.',
    action: '복용 중인 영양제 함께 확인',
  },
  {
    week: 29,
    kind: 'preparation',
    title: '백일해 예방접종 상담',
    description: '임신 중 접종 시기와 가족 접종 필요 여부를 의료진에게 물어봐요.',
    action: '접종 가능 시기 상담',
  },
  {
    week: 30,
    kind: 'application',
    title: '출산휴가·육아휴직 일정 확인',
    description: '직장 제출 서류와 신청 시기를 미리 확인해요.',
    action: '회사 담당자와 일정 확인',
  },
  {
    week: 32,
    kind: 'checkup',
    title: '태아 성장 초음파',
    description: '아기의 성장, 위치와 양수 상태 등을 확인하는 시기예요.',
    action: '검진 일정 확인',
  },
  {
    week: 34,
    kind: 'preparation',
    title: '출산 가방과 이동 동선 점검',
    description: '병원 서류, 보호자 연락망과 이동 방법을 한 번에 정리해요.',
    action: '출산 준비 체크리스트 확인',
  },
  {
    week: 36,
    kind: 'checkup',
    title: '분만 전 검사 상담',
    description: 'GBS 검사 등 분만 전 필요한 검사를 병원 일정에 맞춰 확인해요.',
    action: '분만 병원 안내 확인',
  },
  {
    week: 37,
    kind: 'application',
    title: '출생 후 지원 신청 미리보기',
    description: '출생신고, 첫만남이용권과 부모급여 신청에 필요한 항목을 미리 살펴봐요.',
    action: '필요 서류와 신청 경로 확인',
  },
]

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildPregnancyCalendarEvents(
  currentWeek: number,
  today = new Date(),
): PregnancyCalendarEvent[] {
  const normalizedWeek = Math.min(42, Math.max(1, Math.round(currentWeek)))

  return PREGNANCY_MILESTONES.filter((milestone) => milestone.week >= normalizedWeek).map(
    (milestone) => {
      const date = new Date(today)
      date.setHours(12, 0, 0, 0)
      date.setDate(date.getDate() + (milestone.week - normalizedWeek) * 7)

      return {
        ...milestone,
        id: `${milestone.kind}-${milestone.week}-${milestone.title}`,
        date: toDateKey(date),
      }
    },
  )
}
