// 매일 바뀌는 컨디션 카드 로직.
// `임산부 케어/packages/core/src/pregnancy-insight.ts`의 로직을 메인 앱에서
// 외부 의존성 없이 사용할 수 있도록 옮겨온 모듈입니다.

export interface MorningCareCard {
  title: string
  body: string
  objectiveNote: string
  careTip: string
}

export interface DailyRhythmSnapshot {
  date: string
  label: string
  dayLabel: string
  rhythmLabel: string
  hormoneSignal: string
  expectedMood: string
  energyForecast: string
}

export interface DailyMetric {
  label: string
  value: string
  note: string
}

export interface DailyInsight {
  id: string
  title: string
  subtitle: string
  pregnancyWeek: number | null
  generatedFor: string
  deliveryTime: string
  source: 'pregnancy_week' | 'preparing' | 'postpartum'
  dayLabel: string
  rhythmLabel: string
  phaseLabel: string
  cycleDay: number | null
  cycleLength: number | null
  fertilityWindow: string | null
  hormoneSignal: string
  expectedMood: string
  energyForecast: string
  calendarDays: DailyRhythmSnapshot[]
  trackingMetrics: DailyMetric[]
  evidenceBasis: string[]
  warningSigns: string[]
  wifeCard: MorningCareCard
  partnerCard: MorningCareCard
  conditionDetail: string
  moodBoosters: string[]
  avoidActions: string[]
  avoidFoods: string[]
  body: string
  careHint: string
  tags: string[]
  disclaimer: string
}

type InsightTemplate = Omit<
  DailyInsight,
  | 'id'
  | 'pregnancyWeek'
  | 'generatedFor'
  | 'source'
  | 'dayLabel'
  | 'rhythmLabel'
  | 'phaseLabel'
  | 'cycleDay'
  | 'cycleLength'
  | 'fertilityWindow'
  | 'calendarDays'
  | 'trackingMetrics'
  | 'evidenceBasis'
  | 'warningSigns'
>

export type DailyInsightOptions = {
  lastPeriodStartDate?: string | null
  cycleLength?: number | null
}

// 임신 준비중 컨디션 카드를 매일 다르게 보여주기 위한 고정 기준일(데모용).
const PREP_CYCLE_ANCHOR = '2025-01-06'

const foodSafetyNotes = [
  '날것이나 덜 익힌 해산물·육류는 피하고 충분히 익힌 메뉴를 선택하세요.',
  '비살균 유제품이나 오래 실온에 둔 음식은 피하고, 신선하게 보관된 음식을 선택하세요.',
  '고수은 생선과 카페인 과다는 주의하고, 궁금한 식품은 의료진 안내를 우선하세요.',
  '향이 강한 튀김, 비린 메뉴, 매운 조리는 컨디션이 민감한 날 부담이 될 수 있어요.',
]

const evidenceSources = {
  menstrual:
    'NIH/NCBI Endotext, Merck Manual, Office on Women’s Health, ACOG menstrual cycle 자료 기준',
  luteal:
    'ASRM: 황체기는 보통 12~14일, 배란 후 6~8일에 프로게스테론이 높아질 수 있음',
  pregnancy:
    'NHS/ACOG 임신 주차·삼분기 증상 자료 기준',
  warning:
    'CDC Hear Her 임신·산후 긴급 경고 증상 기준',
}

const pregnancyWarningSigns = [
  '심한 두통, 시야 변화, 실신·지속되는 어지러움',
  '가슴 통증, 숨참, 심장이 심하게 두근거림',
  '심한 복통, 질 출혈, 양수처럼 보이는 액체 누출',
  '물을 8시간 이상 못 마시거나 음식을 24시간 이상 못 먹는 심한 구토',
  '아기 움직임이 평소보다 뚜렷하게 줄어든 느낌',
]

const preparationWarningSigns = [
  '생리 간격이 21일보다 짧거나 35~40일 이상으로 길어지는 패턴이 반복됨',
  '한 시간에 패드가 젖을 정도의 과다 출혈, 큰 혈괴, 심한 통증',
  '임신 준비 중 12개월 이상 임신이 안 되거나, 35세 이상에서 6개월 이상 어려움',
]

const dailyFocus = [
  {
    rhythm: '수면 회복',
    mood: '작은 피로가 감정 반응으로 커질 수 있음',
    energy: '오전 루틴은 짧게, 오후에는 회복 시간을 먼저 두기 좋은 날',
    booster: ['아침 햇빛 5분', '따뜻한 물 한 잔', '낮은 조도에서 짧은 휴식'],
    avoidAction: ['긴 이동', '늦은 밤 화면 보기', '한 번에 많은 집안일'],
    avoidFood: ['카페인 과다', '늦은 시간 자극적인 간식'],
  },
  {
    rhythm: '냄새 민감도',
    mood: '냄새와 소리에 예민하게 반응할 수 있음',
    energy: '집 안 공기와 조리 냄새를 먼저 정리하면 편안해지기 쉬운 날',
    booster: ['환기 후 공기청정', '무향 세제 사용', '담백한 식사 준비'],
    avoidAction: ['향수나 디퓨저 추가', '환기 없이 조리', '사람 많은 공간 오래 머물기'],
    avoidFood: ['비린 메뉴', '향이 강한 튀김', '강한 양념 조리'],
  },
  {
    rhythm: '마음 안정',
    mood: '괜찮다가도 작은 말에 마음이 흔들릴 수 있음',
    energy: '감정을 설득하기보다 조용한 환경을 먼저 만드는 흐름이 맞는 날',
    booster: ['짧은 산책', '느린 음악', '해야 할 일 1개만 정하기'],
    avoidAction: ['중요한 결정 몰아하기', '빨리 답해야 하는 대화', '비교되는 콘텐츠 오래 보기'],
    avoidFood: ['너무 단 음식 연속 섭취', '속을 더부룩하게 하는 야식'],
  },
  {
    rhythm: '활력 조절',
    mood: '컨디션이 좋아 보여도 피로가 늦게 올라올 수 있음',
    energy: '에너지가 있을 때 가볍게 움직이고 쉬는 시간을 미리 넣기 좋은 날',
    booster: ['가벼운 스트레칭', '작은 정리', '편한 옷으로 갈아입기'],
    avoidAction: ['오래 서 있기', '쉬지 않고 일정 이어가기', '무거운 물건 들기'],
    avoidFood: ['과식', '소화 부담이 큰 기름진 메뉴'],
  },
  {
    rhythm: '집중력 분산',
    mood: '생각이 많아지고 집중이 짧아질 수 있음',
    energy: '메모와 알림에 맡기고 몸의 부담을 줄이는 방식이 잘 맞는 날',
    booster: ['일정 3개 이하로 줄이기', '체크리스트 사용', '조용한 배경음'],
    avoidAction: ['멀티태스킹', '급한 약속 잡기', '복잡한 장보기'],
    avoidFood: ['급하게 먹는 식사', '검증되지 않은 보충제'],
  },
  {
    rhythm: '가족 케어',
    mood: '도움을 받고 싶지만 설명하기 귀찮을 수 있음',
    energy: '가족에게 카드로 짧게 공유하면 부담이 줄어드는 날',
    booster: ['도움 요청 한 줄로 남기기', '저녁 메뉴 미리 정하기', '휴식 시간 캘린더에 표시'],
    avoidAction: ['괜찮은 척 참기', '상대가 알아서 해주길 기다리기', '서운함을 늦게 꺼내기'],
    avoidFood: ['가족이 좋아해도 향이 강한 메뉴', '실온에 오래 둔 반찬'],
  },
  {
    rhythm: '공간 정돈',
    mood: '어수선한 공간이 피로감으로 느껴질 수 있음',
    energy: '큰 청소보다 눈에 보이는 자극을 줄이면 기분이 좋아지기 쉬운 날',
    booster: ['테이블 위 5분 정리', '조명 밝기 낮추기', '침구와 쿠션 정돈'],
    avoidAction: ['대청소 시작', '물건을 한꺼번에 꺼내기', '강한 세정제 냄새 맡기'],
    avoidFood: ['냄새가 오래 남는 조리', '자극적인 배달 음식'],
  },
]

const earlyTemplate: InsightTemplate = {
  title: '오늘의 컨디션 카드',
  subtitle: '초기 적응 리듬',
  deliveryTime: '09:00',
  hormoneSignal: '호르몬 변화가 빠르게 자리 잡는 시기',
  expectedMood: '예민함과 피로감이 번갈아 느껴질 수 있음',
  energyForecast: '무리 없는 짧은 루틴이 잘 맞는 날',
  wifeCard: makeCard(
    '오늘 내 컨디션 카드',
    '오늘은 몸이 새로운 리듬에 적응하는 과정에서 냄새, 졸림, 감정 반응이 평소보다 크게 느껴질 수 있는 날로 안내됩니다.',
    '내가 예민해서가 아니라 몸의 리듬 변화가 크게 느껴질 수 있는 구간입니다.',
    '일정을 줄이고, 냄새나 소리처럼 부담이 되는 자극을 먼저 낮춰보세요.',
  ),
  partnerCard: makeCard(
    '오늘 아내 컨디션 카드',
    '오늘은 아내가 냄새와 피로, 감정 반응을 평소보다 크게 느낄 수 있는 구간으로 안내됩니다.',
    '반응을 기분 문제로 보기보다 몸의 적응 리듬으로 이해하는 편이 좋습니다.',
    '강한 냄새가 나는 조리나 갑작스러운 일정 제안은 줄이고, 짧게 쉴 수 있는 시간을 먼저 만들어주세요.',
  ),
  conditionDetail:
    '초기에는 수면 욕구, 냄새 민감도, 감정 반응이 갑자기 커질 수 있어요. 오늘은 몸의 신호를 빠르게 판단하기보다 자극을 줄이고 기록하는 쪽이 좋습니다.',
  moodBoosters: ['짧은 낮잠', '무향 공간 만들기', '찬찬히 먹을 수 있는 담백한 간식'],
  avoidActions: ['일정을 빽빽하게 잡기', '강한 냄새가 나는 공간 오래 머물기', '무리해서 괜찮은 척하기'],
  avoidFoods: foodSafetyNotes,
  body:
    '임신 초기에는 몸이 새로운 리듬에 적응하는 과정이라 평소보다 냄새, 졸림, 감정 반응을 크게 느끼는 사람이 많아요. 오늘의 상태를 단정하기보다 작은 자극을 줄이는 쪽으로 하루를 시작해보세요.',
  careHint: '일정을 촘촘히 잡기보다 휴식 구간을 먼저 확보해두면 부담이 덜할 수 있어요.',
  tags: ['민감도', '피로', '짧은 휴식'],
  disclaimer: '개인차가 있으며 의료적 판단이 아닌 일반적인 컨디션 안내입니다.',
}

const middleTemplate: InsightTemplate = {
  title: '오늘의 컨디션 카드',
  subtitle: '중기 안정 리듬',
  deliveryTime: '09:00',
  hormoneSignal: '태반 호르몬 리듬이 비교적 안정적으로 자리 잡는 구간',
  expectedMood: '차분함은 늘 수 있지만 작은 자극에는 민감할 수 있음',
  energyForecast: '오전은 비교적 안정, 오후에는 피로가 누적되기 쉬움',
  wifeCard: makeCard(
    '오늘 내 컨디션 카드',
    '오늘은 컨디션이 비교적 안정적으로 느껴질 수 있지만, 냄새와 소리 같은 작은 자극에는 민감하게 반응할 수 있는 날로 안내됩니다.',
    '오전의 안정감과 오후의 피로 누적이 함께 나타날 수 있는 리듬입니다.',
    '에너지가 있을 때 가볍게 움직이고, 피로가 쌓이기 전에 조명과 공기를 편안하게 맞춰두세요.',
  ),
  partnerCard: makeCard(
    '오늘 아내 컨디션 카드',
    '오늘 아내는 비교적 안정적인 컨디션을 느낄 수 있지만, 오후로 갈수록 피로와 냄새 민감도가 올라올 수 있습니다.',
    '괜찮아 보이는 시간에도 피로가 늦게 올라올 수 있는 날입니다.',
    '저녁에는 향이 강한 음식보다 담백하고 간단한 메뉴를 제안하고, 쉬는 분위기를 먼저 만들어주세요.',
  ),
  conditionDetail:
    '중기에는 안정감이 생기는 날도 있지만 피로가 늦게 올라오거나 작은 자극이 크게 느껴질 수 있어요. 오전의 컨디션만 보고 하루 전체를 꽉 채우지 않는 편이 좋습니다.',
  moodBoosters: ['가벼운 산책', '바람이 부드러운 환기', '저녁 메뉴 미리 정하기'],
  avoidActions: ['오래 서 있기', '향이 강한 조리 오래 맡기', '쉬는 시간 없이 일정 이어가기'],
  avoidFoods: foodSafetyNotes,
  body:
    '임신 중기에는 초반보다 컨디션이 한결 안정됐다고 느끼는 사람이 많지만, 냄새와 소리처럼 작은 자극에는 여전히 민감할 수 있어요. 오늘은 에너지가 있을 때 가볍게 움직이고, 피로가 쌓이기 전에 환경을 정돈하는 흐름이 잘 맞습니다.',
  careHint: '향이 강한 조리나 복잡한 일정은 뒤로 미루고, 조명과 공기를 부드럽게 맞춰두면 하루가 편해질 수 있어요.',
  tags: ['중기', '안정감', '자극 관리'],
  disclaimer: '개인차가 있으며 의료적 판단이 아닌 일반적인 컨디션 안내입니다.',
}

const lateTemplate: InsightTemplate = {
  title: '오늘의 컨디션 카드',
  subtitle: '후기 회복 중심 리듬',
  deliveryTime: '09:00',
  hormoneSignal: '몸의 부담과 수면 리듬 변화가 함께 커지는 구간',
  expectedMood: '집중력이 짧아지고 휴식 욕구가 커질 수 있음',
  energyForecast: '활동보다 회복을 먼저 배치하기 좋은 날',
  wifeCard: makeCard(
    '오늘 내 컨디션 카드',
    '오늘은 몸의 부담과 수면 리듬 변화 때문에 피로가 빠르게 느껴질 수 있는 날로 안내됩니다.',
    '집중력이 짧아지거나 쉬고 싶은 마음이 커지는 것은 자연스러운 회복 신호일 수 있습니다.',
    '긴 일정은 줄이고, 앉아서 쉴 수 있는 공간과 조용한 시간을 먼저 확보해보세요.',
  ),
  partnerCard: makeCard(
    '오늘 아내 컨디션 카드',
    '오늘 아내는 몸의 무게감과 수면 리듬 변화로 피로가 빨리 누적될 수 있는 구간으로 안내됩니다.',
    '활동 의지가 낮아 보이더라도 회복을 우선해야 하는 날일 수 있습니다.',
    '도움을 묻기보다 물, 간단한 식사, 조용한 환경처럼 바로 줄 수 있는 지원을 먼저 준비해주세요.',
  ),
  conditionDetail:
    '후기에는 몸의 무게감, 수면 변화, 집중력 저하가 함께 느껴질 수 있어요. 컨디션이 낮다고 실패한 날이 아니라 회복을 먼저 배치해야 하는 날로 이해하면 좋습니다.',
  moodBoosters: ['앉아서 쉬는 자리 확보', '부드러운 조명', '간단한 식사와 수분'],
  avoidActions: ['긴 동선', '무거운 물건 들기', '늦은 시간까지 버티기'],
  avoidFoods: foodSafetyNotes,
  body:
    '임신 후기에는 몸의 무게감과 수면 변화 때문에 평소보다 피로가 빨리 느껴질 수 있어요. 오늘은 많은 일을 해내는 것보다 집 안 자극을 줄이고 회복 시간을 확보하는 쪽이 더 자연스러운 리듬입니다.',
  careHint: '긴 동선이나 늦은 일정은 줄이고, 앉아서 쉴 수 있는 공간을 먼저 만들어두면 좋아요.',
  tags: ['회복', '수면 리듬', '부담 낮추기'],
  disclaimer: '개인차가 있으며 의료적 판단이 아닌 일반적인 컨디션 안내입니다.',
}

/**
 * 현재 상태(임신중/준비중)와 주차를 받아 매일 바뀌는 컨디션 카드를 만듭니다.
 * 엄마품(아내) = wifeCard, 아빠손길(남편) = partnerCard.
 */
export function getDailyConditionInsight(
  status: 'preparing' | 'pregnant',
  pregnancyWeek: number,
  date = new Date(),
  options: DailyInsightOptions = {},
): DailyInsight {
  if (status === 'pregnant') {
    const week = clamp(Math.round(pregnancyWeek) || 18, 1, 42)
    const dayInWeek = positiveModulo(daysSince(PREP_CYCLE_ANCHOR, date), 7) + 1
    return buildPregnancyInsight({
      week,
      pregnancyDay: ((week - 1) * 7) + dayInWeek,
      date,
      calendarDays: buildPregnancyWeekCalendarDays(week, date),
    })
  }

  const lastPeriodStartDate = parseDateOnly(options.lastPeriodStartDate ?? '')
    ? options.lastPeriodStartDate!
    : PREP_CYCLE_ANCHOR
  return createPreparationCycleInsight(lastPeriodStartDate, options.cycleLength ?? 28, date)
}

export function createPregnancyDateInsight(pregnancyStartDate: string, date = new Date()): DailyInsight {
  const pregnancyDay = clamp(daysSince(pregnancyStartDate, date) + 1, 1, 294)
  const week = clamp(Math.ceil(pregnancyDay / 7), 1, 42)
  return buildPregnancyInsight({
    week,
    pregnancyDay,
    date,
    calendarDays: buildPregnancyDateCalendarDays(pregnancyStartDate, date),
  })
}

export function createPreparationCycleInsight(
  lastPeriodStartDate: string,
  cycleLength = 28,
  date = new Date(),
): DailyInsight {
  const length = clamp(Math.round(cycleLength || 28), 21, 40)
  const elapsed = daysSince(lastPeriodStartDate, date)
  const cycleDay = positiveModulo(elapsed, length) + 1
  const generatedFor = todayKey(date)
  const snapshot = buildPreparationSnapshot(lastPeriodStartDate, length, date, '오늘')
  const phase = getPreparationPhase(cycleDay, length)

  return {
    id: `daily-insight-preparing-${generatedFor}-cycle-${cycleDay}`,
    title: '오늘의 컨디션 카드',
    subtitle: `준비 중 · ${snapshot.rhythmLabel}`,
    pregnancyWeek: null,
    generatedFor,
    deliveryTime: '09:00',
    source: 'preparing',
    dayLabel: snapshot.dayLabel,
    rhythmLabel: snapshot.rhythmLabel,
    phaseLabel: phase.phaseLabel,
    cycleDay,
    cycleLength: length,
    fertilityWindow: phase.fertilityWindow,
    hormoneSignal: snapshot.hormoneSignal,
    expectedMood: snapshot.expectedMood,
    energyForecast: snapshot.energyForecast,
    calendarDays: buildPreparationCalendarDays(lastPeriodStartDate, length, date),
    trackingMetrics: buildPreparationTrackingMetrics(lastPeriodStartDate, length, cycleDay),
    evidenceBasis: [evidenceSources.menstrual, evidenceSources.luteal],
    warningSigns: preparationWarningSigns,
    wifeCard: makeCard(
      '오늘 내 컨디션 카드',
      `오늘은 ${snapshot.rhythmLabel} 흐름으로 안내됩니다. ${snapshot.expectedMood}`,
      '몸의 리듬을 판단하기보다 오늘의 변화가 어느 구간에서 나타나는지 객관적으로 보는 카드입니다.',
      phase.booster[0],
    ),
    partnerCard: makeCard(
      '오늘 아내 컨디션 카드',
      `오늘 아내는 ${snapshot.rhythmLabel} 흐름에 있을 수 있습니다. ${snapshot.expectedMood}`,
      '기분 문제가 아니라 주기 리듬의 영향을 받을 수 있는 날로 이해하면 좋습니다.',
      `${phase.booster[0]}을 함께 챙겨주세요.`,
    ),
    conditionDetail: `최근 생리 시작일 ${lastPeriodStartDate}, 평균 ${length}일 주기 기준 ${cycleDay}일차입니다. ${snapshot.energyForecast}`,
    moodBoosters: phase.booster,
    avoidActions: phase.avoidAction,
    avoidFoods: phase.avoidFood,
    body: `오늘은 ${snapshot.rhythmLabel} 흐름으로 기록됩니다. ${snapshot.expectedMood} ${snapshot.energyForecast}`,
    careHint: phase.booster.join(', '),
    tags: ['준비 중', phase.phaseLabel, '매일 카드'],
    disclaimer: '주기 계산은 개인차가 있으며 의료적 판단이 아닌 일반적인 컨디션 안내입니다.',
  }
}

function buildPregnancyInsight({
  week,
  pregnancyDay,
  date,
  calendarDays,
}: {
  week: number
  pregnancyDay: number
  date: Date
  calendarDays?: DailyRhythmSnapshot[]
}): DailyInsight {
  const generatedFor = todayKey(date)
  const template = week <= 12 ? earlyTemplate : week <= 27 ? middleTemplate : lateTemplate
  const phaseLabel = week <= 12 ? '초기' : week <= 27 ? '중기' : '후기'
  // 주차가 7의 배수라 % 7에서 상쇄되면 모든 주차가 같은 리듬(수면 회복)으로
  // 고정되므로, 주차를 더해 주차별로 리듬이 달라지게 합니다.
  const focus = dailyFocus[positiveModulo(week + pregnancyDay - 1, dailyFocus.length)]
  const daySignal = pregnancyDaySignals[positiveModulo(week + pregnancyDay - 1, pregnancyDaySignals.length)]
  const dayInWeek = ((pregnancyDay - 1) % 7) + 1
  const dayLabel = `임신 ${week}주 ${dayInWeek}일`
  const hormoneSignal = `${template.hormoneSignal} · ${daySignal.hormone}`
  const expectedMood = `${focus.mood} ${daySignal.mood}`
  const energyForecast = `${focus.energy} ${daySignal.energy}`

  return {
    id: `daily-insight-${generatedFor}-day-${pregnancyDay}`,
    pregnancyWeek: week,
    generatedFor,
    source: 'pregnancy_week',
    ...template,
    subtitle: `${dayLabel} · ${focus.rhythm}`,
    dayLabel,
    rhythmLabel: focus.rhythm,
    phaseLabel,
    cycleDay: null,
    cycleLength: null,
    fertilityWindow: null,
    hormoneSignal,
    expectedMood,
    energyForecast,
    calendarDays: calendarDays ?? buildPregnancyWeekCalendarDays(week, date),
    trackingMetrics: buildPregnancyTrackingMetrics(week, dayInWeek, pregnancyDay, phaseLabel),
    evidenceBasis: [evidenceSources.pregnancy],
    warningSigns: pregnancyWarningSigns,
    wifeCard: {
      ...template.wifeCard,
      body: `${dayLabel} 오늘은 ${focus.rhythm}에 초점을 둔 카드입니다. ${expectedMood}`,
      objectiveNote: `${energyForecast} 현재 컨디션을 성격이나 의지 문제가 아니라 몸의 리듬으로 이해해보세요.`,
      careTip: focus.booster.join(', '),
    },
    partnerCard: {
      ...template.partnerCard,
      body: `${dayLabel} 오늘 아내는 ${focus.rhythm}에 민감할 수 있습니다. ${expectedMood}`,
      objectiveNote: `${energyForecast} 괜찮아 보여도 피로가 늦게 올라올 수 있습니다.`,
      careTip: `${focus.booster[0]}부터 함께 챙기고, ${focus.avoidAction[0]}은 줄여주세요.`,
    },
    conditionDetail: `${dayLabel} 기준 오늘의 호르몬 신호는 ${hormoneSignal}입니다. ${template.conditionDetail}`,
    moodBoosters: focus.booster,
    avoidActions: focus.avoidAction,
    avoidFoods: focus.avoidFood,
    body: `${dayLabel} 오늘은 ${focus.rhythm}에 초점을 둔 날입니다. ${energyForecast}`,
    careHint: focus.booster.join(', '),
    tags: [template.tags[0], focus.rhythm, '매일 카드'],
  }
}

type PreparationPhase = {
  phaseLabel: string
  rhythm: string
  hormone: string
  mood: string
  energy: string
  fertilityWindow: string
  booster: string[]
  avoidAction: string[]
  avoidFood: string[]
}

const pregnancyDaySignals = [
  {
    hormone: '프로게스테론 영향으로 몸이 느려질 수 있음',
    mood: '말보다 휴식 욕구가 먼저 올라올 수 있어요.',
    energy: '오전 일정을 짧게 끊으면 부담이 줄어듭니다.',
  },
  {
    hormone: '에스트로겐 변화로 냄새와 소리에 민감할 수 있음',
    mood: '작은 자극에도 감정 반응이 빨리 올라올 수 있어요.',
    energy: '환기와 조도 조절을 먼저 두기 좋은 날입니다.',
  },
  {
    hormone: '혈류량 변화로 피로와 집중력 저하가 섞일 수 있음',
    mood: '생각이 많아지고 결정 피로가 커질 수 있어요.',
    energy: '해야 할 일을 1~2개만 남기면 리듬이 편해집니다.',
  },
  {
    hormone: '수면 호르몬 리듬이 흔들려 졸림이 길어질 수 있음',
    mood: '차분하지만 반응 속도가 느려질 수 있어요.',
    energy: '짧은 낮잠이나 조용한 시간을 미리 확보해보세요.',
  },
  {
    hormone: '소화와 체온 리듬 변화가 더부룩함으로 느껴질 수 있음',
    mood: '몸이 무거우면 마음도 가라앉기 쉬워요.',
    energy: '가벼운 식사와 수분 보충이 잘 맞습니다.',
  },
  {
    hormone: '릴랙신과 근육 긴장 변화로 몸의 균형감이 달라질 수 있음',
    mood: '도움을 받고 싶은 마음과 혼자 있고 싶은 마음이 섞일 수 있어요.',
    energy: '무리한 동선보다 가까운 휴식을 우선하세요.',
  },
  {
    hormone: '주간 피로 누적에 따라 회복 신호가 강해질 수 있음',
    mood: '괜찮다가도 갑자기 쉬고 싶어질 수 있어요.',
    energy: '가족과 역할을 나누면 회복감이 빨라집니다.',
  },
] as const

const preparationDaySignals = [
  {
    hormone: '기초 체온과 수분 리듬을 같이 확인할 날',
    mood: '기분을 단정하기보다 몸의 신호를 기록하기 좋아요.',
    energy: '아침 기록과 저녁 휴식이 잘 맞습니다.',
  },
  {
    hormone: '에스트로겐 변화가 컨디션 체감에 영향을 줄 수 있음',
    mood: '의욕은 올라오지만 쉽게 과밀해질 수 있어요.',
    energy: '작게 시작하고 중간 휴식을 넣어보세요.',
  },
  {
    hormone: '프로게스테론 변화 가능성을 함께 살필 날',
    mood: '예민함이 올라와도 이상 신호로만 보지 않아도 돼요.',
    energy: '따뜻한 루틴과 수면 시간을 지키는 편이 좋습니다.',
  },
  {
    hormone: '배란 전후 신호는 점액·체온·감각 변화와 같이 보기',
    mood: '몸의 변화를 더 섬세하게 느낄 수 있어요.',
    energy: '수분과 편한 옷, 가벼운 움직임이 어울립니다.',
  },
  {
    hormone: '황체기에는 붓기와 피로 신호를 함께 체크',
    mood: '감정이 느리게 가라앉거나 서운함이 오래갈 수 있어요.',
    energy: '일정 밀도를 낮추면 컨디션이 덜 흔들립니다.',
  },
  {
    hormone: '호르몬 저점 전후에는 회복 자극을 먼저 배치',
    mood: '평소보다 조용한 환경이 필요할 수 있어요.',
    energy: '강한 냄새, 늦은 화면, 카페인을 줄여보세요.',
  },
  {
    hormone: '주기 패턴을 누적해 다음 변화를 예측하기 좋은 날',
    mood: '오늘 감정을 데이터처럼 남기면 다음 주기가 편해져요.',
    energy: '몸 상태 한 줄 기록과 가벼운 정돈이 잘 맞습니다.',
  },
] as const

function getPreparationPhase(cycleDay: number, cycleLength: number): PreparationPhase {
  if (cycleDay <= 5) {
    return {
      phaseLabel: '생리기',
      rhythm: '생리기 · 회복 리듬',
      hormone: '에스트로겐·프로게스테론이 낮아지는 구간',
      mood: '에너지가 낮고 예민함이 올라올 수 있음',
      energy: '몸을 따뜻하게 하고 휴식 중심으로 배치하기 좋은 날',
      fertilityWindow: '새 주기 시작, 회복 우선',
      booster: ['따뜻한 음료', '가벼운 스트레칭', '무리 없는 일정'],
      avoidAction: ['긴 약속', '무리한 운동', '수면 줄이기'],
      avoidFood: ['카페인 과다', '차가운 음식 위주 식사', '과도하게 짠 음식'],
    }
  }

  if (cycleDay <= Math.max(12, Math.round(cycleLength * 0.45))) {
    return {
      phaseLabel: '난포기',
      rhythm: '난포기 · 활력 상승',
      hormone: '에스트로겐이 서서히 오르며 활력이 붙는 구간',
      mood: '기분과 집중력이 비교적 가볍게 올라올 수 있음',
      energy: '새로운 일을 시작하거나 정리하기 좋은 날',
      fertilityWindow: '가임기 접근, 몸 변화 관찰',
      booster: ['가벼운 산책', '작은 계획 세우기', '단백질 있는 식사'],
      avoidAction: ['일정 과밀', '끼니 거르기', '컨디션 좋은 날 무리하기'],
      avoidFood: ['급하게 먹는 식사', '당이 높은 간식만으로 버티기'],
    }
  }

  if (cycleDay <= Math.max(16, Math.round(cycleLength * 0.6))) {
    return {
      phaseLabel: '배란기',
      rhythm: '배란 전후 · 감각 민감',
      hormone: 'LH 서지와 에스트로겐 고점 신호를 살피는 구간',
      mood: '활력은 있지만 감각과 감정 반응이 섬세해질 수 있음',
      energy: '몸의 변화를 기록하고 수분을 챙기기 좋은 날',
      fertilityWindow: '가임 가능성이 비교적 높은 구간',
      booster: ['물 자주 마시기', '편한 옷', '가벼운 외출'],
      avoidAction: ['무리한 야근', '몸의 신호 무시하기', '수면 부족'],
      avoidFood: ['알코올 과다', '소화 부담이 큰 야식'],
    }
  }

  return {
    phaseLabel: '황체기',
    rhythm: '황체기 · 감정 변동',
    hormone: '프로게스테론 영향으로 붓기와 피로가 올라올 수 있는 구간',
    mood: '붓기, 피로, 예민함이 조금씩 올라올 수 있음',
    energy: '기분을 다그치기보다 안정 루틴을 반복하기 좋은 날',
    fertilityWindow: '가임기 이후, 컨디션 안정 관찰',
    booster: ['짧은 산책', '일정 줄이기', '따뜻한 샤워'],
    avoidAction: ['중요한 결정 몰아하기', '잠 줄이기', '비교되는 콘텐츠 오래 보기'],
    avoidFood: ['짠 음식 과다', '단 음식 연속 섭취', '카페인 과다'],
  }
}

function buildPreparationSnapshot(
  lastPeriodStartDate: string,
  cycleLength: number,
  date: Date,
  label: string,
): DailyRhythmSnapshot {
  const cycleDay = positiveModulo(daysSince(lastPeriodStartDate, date), cycleLength) + 1
  const phase = getPreparationPhase(cycleDay, cycleLength)
  const signal = preparationDaySignals[(cycleDay - 1) % preparationDaySignals.length]

  return {
    date: todayKey(date),
    label,
    dayLabel: `주기 ${cycleDay}일차`,
    rhythmLabel: phase.rhythm,
    hormoneSignal: `${phase.hormone} · ${signal.hormone}`,
    expectedMood: `${phase.mood} ${signal.mood}`,
    energyForecast: `${phase.energy} ${signal.energy}`,
  }
}

function buildPregnancySnapshot(
  week: number,
  pregnancyDay: number,
  date: Date,
  label: string,
): DailyRhythmSnapshot {
  const template = week <= 12 ? earlyTemplate : week <= 27 ? middleTemplate : lateTemplate
  // 주차가 7의 배수라 % 7에서 상쇄되면 모든 주차가 같은 리듬(수면 회복)으로
  // 고정되므로, 주차를 더해 주차별로 리듬이 달라지게 합니다.
  const focus = dailyFocus[positiveModulo(week + pregnancyDay - 1, dailyFocus.length)]
  const daySignal = pregnancyDaySignals[positiveModulo(week + pregnancyDay - 1, pregnancyDaySignals.length)]
  const dayInWeek = ((pregnancyDay - 1) % 7) + 1

  return {
    date: todayKey(date),
    label,
    dayLabel: `임신 ${week}주 ${dayInWeek}일`,
    rhythmLabel: focus.rhythm,
    hormoneSignal: `${template.hormoneSignal} · ${daySignal.hormone}`,
    expectedMood: `${focus.mood} ${daySignal.mood}`,
    energyForecast: `${focus.energy} ${daySignal.energy}`,
  }
}

function buildPreparationCalendarDays(
  lastPeriodStartDate: string,
  cycleLength: number,
  date: Date,
): DailyRhythmSnapshot[] {
  return [-2, -1, 0, 1, 2].map((offset) => {
    const targetDate = addDays(date, offset)
    return buildPreparationSnapshot(
      lastPeriodStartDate,
      cycleLength,
      targetDate,
      relativeDayLabel(offset, targetDate),
    )
  })
}

function buildPregnancyWeekCalendarDays(week: number, date: Date): DailyRhythmSnapshot[] {
  const baseDayInWeek = positiveModulo(daysSince(PREP_CYCLE_ANCHOR, date), 7) + 1

  return [-2, -1, 0, 1, 2].map((offset) => {
    const targetDate = addDays(date, offset)
    const dayInWeek = positiveModulo((baseDayInWeek - 1) + offset, 7) + 1
    const pregnancyDay = ((week - 1) * 7) + dayInWeek
    return buildPregnancySnapshot(week, pregnancyDay, targetDate, relativeDayLabel(offset, targetDate))
  })
}

function buildPregnancyDateCalendarDays(pregnancyStartDate: string, date: Date): DailyRhythmSnapshot[] {
  return [-2, -1, 0, 1, 2].map((offset) => {
    const targetDate = addDays(date, offset)
    const pregnancyDay = clamp(daysSince(pregnancyStartDate, targetDate) + 1, 1, 294)
    const week = clamp(Math.ceil(pregnancyDay / 7), 1, 42)
    return buildPregnancySnapshot(week, pregnancyDay, targetDate, relativeDayLabel(offset, targetDate))
  })
}

function buildPreparationTrackingMetrics(
  lastPeriodStartDate: string,
  cycleLength: number,
  cycleDay: number,
): DailyMetric[] {
  const ovulationDay = clamp(cycleLength - 14, 8, cycleLength - 7)
  const fertileStart = Math.max(1, ovulationDay - 5)
  const fertileEnd = Math.min(cycleLength, ovulationDay + 1)
  const lutealPeakStart = Math.min(cycleLength, ovulationDay + 6)
  const lutealPeakEnd = Math.min(cycleLength, ovulationDay + 8)

  return [
    {
      label: '최근 생리 시작일',
      value: lastPeriodStartDate,
      note: '주기 1일차 기준 날짜입니다.',
    },
    {
      label: '오늘 주기',
      value: `${cycleDay}/${cycleLength}일`,
      note: '입력한 평균 주기를 기준으로 계산합니다.',
    },
    {
      label: '배란 추정',
      value: `약 ${ovulationDay}일차`,
      note: '황체기가 비교적 일정하다는 임상 기준으로 역산한 값입니다.',
    },
    {
      label: '가임 관찰',
      value: `${fertileStart}~${fertileEnd}일차`,
      note: 'LH 변화, 기초체온, 점액 변화와 함께 봐야 더 정확합니다.',
    },
    {
      label: '프로게스테론 관찰',
      value: `${lutealPeakStart}~${lutealPeakEnd}일차`,
      note: '배란 후 6~8일 무렵 높아질 수 있는 구간입니다.',
    },
  ]
}

function buildPregnancyTrackingMetrics(
  week: number,
  dayInWeek: number,
  pregnancyDay: number,
  phaseLabel: string,
): DailyMetric[] {
  const weekFact = getPregnancyWeekFact(week)

  return [
    {
      label: '임신 날짜',
      value: `${week}주 ${dayInWeek}일`,
      note: `임신 ${pregnancyDay}일차 기준으로 계산합니다.`,
    },
    {
      label: '구간',
      value: phaseLabel,
      note: weekFact.phaseNote,
    },
    {
      label: '자주 보이는 증상',
      value: weekFact.symptoms.join(', '),
      note: '개인차가 크며 증상 유무만으로 건강 상태를 판단하지 않습니다.',
    },
    {
      label: '오늘 관찰',
      value: weekFact.monitoring,
      note: weekFact.careNote,
    },
  ]
}

function getPregnancyWeekFact(week: number) {
  if (week <= 8) {
    return {
      phaseNote: '초기에는 호르몬 변화가 빠르고 피로·감정 변화가 크게 느껴질 수 있습니다.',
      symptoms: ['피로', '감정 기복', '메스꺼움', '냄새 민감'],
      monitoring: '수분·식사 가능 여부',
      careNote: '심한 구토나 탈수 신호가 있으면 의료진 상담이 필요합니다.',
    }
  }

  if (week <= 12) {
    return {
      phaseNote: '태반 기능이 자리 잡기 시작하면서 일부 증상은 점차 완화될 수 있습니다.',
      symptoms: ['나른함', '입맛 변화', '유방 통증', '후각 민감'],
      monitoring: '식사량과 냄새 자극',
      careNote: '출혈이나 심한 복통은 바로 확인이 필요합니다.',
    }
  }

  if (week <= 20) {
    return {
      phaseNote: '중기에는 컨디션이 안정되는 사람이 많지만 소화·혈압·피부 변화가 이어질 수 있습니다.',
      symptoms: ['변비', '속쓰림', '두통', '다리 쥐'],
      monitoring: '복부 당김과 피로 누적',
      careNote: '수분, 섬유질, 가벼운 움직임을 함께 챙기는 구간입니다.',
    }
  }

  if (week <= 27) {
    return {
      phaseNote: '아기 움직임을 점점 더 느끼고, 몸의 균형과 수면 리듬이 달라질 수 있습니다.',
      symptoms: ['속쓰림', '부종', '허리 부담', '수면 변화'],
      monitoring: '태동 패턴과 휴식 필요도',
      careNote: '평소와 다른 통증이나 태동 변화는 의료진과 확인하세요.',
    }
  }

  if (week <= 34) {
    return {
      phaseNote: '후기에는 몸의 부담, 숨참, 수면 질 저하가 더 두드러질 수 있습니다.',
      symptoms: ['숨참', '부종', '골반 압박', '잦은 소변'],
      monitoring: '부종·호흡·수면',
      careNote: '심한 부종, 두통, 시야 변화는 경고 신호일 수 있습니다.',
    }
  }

  return {
    phaseNote: '출산이 가까워지며 피로와 불편감이 커질 수 있어 회복 중심 관리가 중요합니다.',
    symptoms: ['강한 피로', '골반 압박', '수면 어려움', '가진통'],
    monitoring: '태동 변화와 진통 양상',
    careNote: '규칙적인 진통, 양수 누출, 출혈은 즉시 확인이 필요합니다.',
  }
}

function makeCard(title: string, body: string, objectiveNote: string, careTip: string): MorningCareCard {
  return { title, body, objectiveNote, careTip }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000)
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

function relativeDayLabel(offset: number, date: Date) {
  if (offset === -1) return '어제'
  if (offset === 0) return '오늘'
  if (offset === 1) return '내일'
  const [month, day] = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date).reduce<[string, string]>((acc, part) => {
    if (part.type === 'month') acc[0] = part.value
    if (part.type === 'day') acc[1] = part.value
    return acc
  }, ['', ''])

  return `${month}/${day}`
}

function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function daysSince(dateText: string, date = new Date()) {
  const start = parseDateOnly(dateText)
  const end = parseDateOnly(todayKey(date))
  if (!start || !end) return 0
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000)
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}
