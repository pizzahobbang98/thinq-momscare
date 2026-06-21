import { getKoreaTodayKey } from '@/lib/preparation-cycle-profile'

export type PregnancyCalendarEventKind = 'checkup' | 'application' | 'preparation'

export type PregnancyCalendarEvent = {
  id: string
  date: string
  week: number
  scheduleLabel?: string
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

type PreparingMilestone = {
  daysFromNow: number
  kind: PregnancyCalendarEventKind
  title: string
  description: string
  action: string
}

const PREPARING_MILESTONES: PreparingMilestone[] = [
  {
    daysFromNow: 0,
    kind: 'preparation',
    title: '엽산과 복용 중인 영양제 점검',
    description: '임신 준비에 필요한 영양제와 현재 복용 중인 약을 의료진 또는 약사와 확인해요.',
    action: '복용 목록 정리',
  },
  {
    daysFromNow: 3,
    kind: 'application',
    title: '지역 임신 사전건강관리 지원 확인',
    description: '거주 지역 보건소와 공공 서비스에서 받을 수 있는 임신 준비 지원을 확인해요.',
    action: '보건소 지원 항목 확인',
  },
  {
    daysFromNow: 7,
    kind: 'checkup',
    title: '임신 전 건강 상담과 기초검사',
    description: '건강 상태와 가족력, 필요한 기초 혈액검사 범위를 의료진과 상의해요.',
    action: '산전 상담 예약',
  },
  {
    daysFromNow: 14,
    kind: 'checkup',
    title: '자궁경부암 검사 일정 확인',
    description: '최근 검사 시기를 확인하고 필요한 경우 의료기관에 예약해요.',
    action: '최근 검사일 확인',
  },
  {
    daysFromNow: 21,
    kind: 'checkup',
    title: '갑상선 기능 검사 상담',
    description: '개인 건강 상태에 따라 검사 필요 여부를 의료진과 상의해요.',
    action: '검사 필요 여부 상담',
  },
  {
    daysFromNow: 28,
    kind: 'checkup',
    title: '풍진 항체와 예방접종 이력 확인',
    description: '항체 검사와 예방접종 필요 여부, 임신 시도 시기를 의료진과 상의해요.',
    action: '접종 기록 준비',
  },
  {
    daysFromNow: 35,
    kind: 'preparation',
    title: '부부 생활 리듬 함께 점검',
    description: '수면, 식사, 운동과 음주·흡연 습관을 함께 살펴보고 실천할 한 가지를 정해요.',
    action: '이번 달 공동 루틴 정하기',
  },
]

function toDateKey(date: Date) {
  return getKoreaTodayKey(date)
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

export function buildPreparingCalendarEvents(
  today = new Date(),
): PregnancyCalendarEvent[] {
  return PREPARING_MILESTONES.map((milestone) => {
    const date = new Date(today)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() + milestone.daysFromNow)

    const weeksFromNow = Math.floor(milestone.daysFromNow / 7)
    const scheduleLabel =
      milestone.daysFromNow === 0
        ? '오늘'
        : milestone.daysFromNow < 7
          ? '이번 주'
          : `${weeksFromNow}주 후`

    return {
      ...milestone,
      id: `preparing-${milestone.kind}-${milestone.daysFromNow}-${milestone.title}`,
      date: toDateKey(date),
      week: weeksFromNow,
      scheduleLabel,
    }
  })
}
