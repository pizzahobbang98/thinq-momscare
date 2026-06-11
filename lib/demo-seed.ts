import type { SupabaseClient } from '@supabase/supabase-js'

type ModeKey =
  | 'NAUSEA_MODE'
  | 'SLEEP_MODE'
  | 'HOUSEWORK_MODE'
  | 'TRAVEL_MODE'
  | 'MORNING_BRIEFING'

type SymptomPreset = {
  symptom_text: string
  parsed_category: string
  severity: number
}

type ModeRunTemplate = {
  mode: ModeKey
  mode_label: string
  source: string
  input_text: string
  signals: string[]
  reply: string
  wife_card: string
  husband_card: string
  device_results: { device: string; action: string; status: string; success: boolean }[]
}

type WeekPreset = {
  modeSchedule: { mode: ModeKey; daysAgo: number }[]
  symptoms: SymptomPreset[]
}

const MODE_TEMPLATES: Record<ModeKey, ModeRunTemplate> = {
  NAUSEA_MODE: {
    mode: 'NAUSEA_MODE',
    mode_label: '입덧모드',
    source: 'hub_voice',
    input_text: '나 지금 입덧이 심해',
    signals: ['냄새 민감', '구역감'],
    reply: '입덧이 심하시군요. 냄새 부담을 줄이는 환경으로 바꿔볼게요.',
    wife_card: '냄새 부담을 줄이기 위해 공기청정기를 강력 모드로 전환했어요.',
    husband_card: '오늘은 강한 냄새가 나는 조리를 피하고, 가벼운 메뉴를 함께 골라보세요.',
    device_results: [
      { device: 'AIR_PURIFIER', action: 'MODE_TURBO', status: 'actual', success: true },
    ],
  },
  SLEEP_MODE: {
    mode: 'SLEEP_MODE',
    mode_label: '수면모드',
    source: 'hub_voice',
    input_text: '나 이제 잘 거야',
    signals: ['피로감', '수면 준비'],
    reply: '편안한 밤 되세요. 침실 환경을 수면에 맞게 바꿔볼게요.',
    wife_card: '잠들기 좋은 환경으로 맞춰드렸어요. 편안하게 주무세요 🌙',
    husband_card: '오늘은 조용한 밤 환경을 만들어주세요. TV 소리를 낮춰주면 좋아요.',
    device_results: [
      { device: 'AIR_PURIFIER', action: 'MODE_SLEEP', status: 'actual', success: true },
    ],
  },
  HOUSEWORK_MODE: {
    mode: 'HOUSEWORK_MODE',
    mode_label: '가사케어 모드',
    source: 'hub_voice',
    input_text: '오늘 몸이 너무 무거워',
    signals: ['피로감', '가사 부담'],
    reply: '지금 바로 움직이지 않아도 돼요. 집안일 타이밍을 조정해드릴게요.',
    wife_card: '무리하지 않아도 되도록 집안일 타이밍을 조정했어요 💙',
    husband_card: '오늘은 빨래와 식기를 먼저 확인해주세요. 무거운 건 대신 해주면 좋아요.',
    device_results: [
      { device: 'AIR_PURIFIER', action: 'MODE_AUTO', status: 'actual', success: true },
    ],
  },
  TRAVEL_MODE: {
    mode: 'TRAVEL_MODE',
    mode_label: '여행 모드',
    source: 'hub_voice',
    input_text: '오늘 너무 답답해',
    signals: ['답답함', '기분 전환'],
    reply: '집 안을 잠시 다른 곳처럼 바꿔볼게요. 잠깐이나마 환기가 됐으면 해요.',
    wife_card: '오늘 집 안 분위기를 환기시켜드렸어요. 잠깐 쉬어가요 🌊',
    husband_card: '오늘은 기분 전환이 필요한 날이에요. 간단한 음료를 준비해주면 어떨까요?',
    device_results: [
      { device: 'AIR_PURIFIER', action: 'MODE_AUTO', status: 'actual', success: true },
    ],
  },
  MORNING_BRIEFING: {
    mode: 'MORNING_BRIEFING',
    mode_label: '굿모닝 브리핑',
    source: 'hub_voice',
    input_text: '굿모닝',
    signals: ['기상', '아침 인사'],
    reply: '좋은 아침이에요. 오늘 컨디션에 맞춰 하루 케어를 정리해드릴게요.',
    wife_card: '오늘의 컨디션과 케어 루틴을 아침 브리핑으로 준비했어요.',
    husband_card: '오늘 필요한 배려 포인트를 함께 확인해 주세요.',
    device_results: [
      { device: 'AI_HUB', action: 'MORNING_BRIEFING', status: 'mock', success: true },
    ],
  },
}

const PRESET_4_8: WeekPreset = {
  modeSchedule: [
    { mode: 'NAUSEA_MODE', daysAgo: 3 },
    { mode: 'NAUSEA_MODE', daysAgo: 5 },
    { mode: 'NAUSEA_MODE', daysAgo: 6 },
    { mode: 'SLEEP_MODE', daysAgo: 2 },
    { mode: 'SLEEP_MODE', daysAgo: 4 },
    { mode: 'MORNING_BRIEFING', daysAgo: 1 },
  ],
  symptoms: [
    { symptom_text: '속이 너무 울렁거려서 밥을 못 먹겠어', parsed_category: 'NAUSEA', severity: 4 },
    { symptom_text: '냄새만 맡아도 토할 것 같아', parsed_category: 'NAUSEA', severity: 4 },
    { symptom_text: '온종일 누워있었는데도 피곤해', parsed_category: 'FATIGUE', severity: 3 },
    { symptom_text: '어제 잠을 제대로 못 잤어', parsed_category: 'SLEEP', severity: 3 },
    { symptom_text: '두통이 심하게 왔어', parsed_category: 'HEADACHE', severity: 3 },
  ],
}

const PRESET_9_16: WeekPreset = {
  modeSchedule: buildModeSchedule([
    ['NAUSEA_MODE', 2],
    ['SLEEP_MODE', 2],
    ['TRAVEL_MODE', 1],
    ['MORNING_BRIEFING', 1],
  ]),
  symptoms: [
    { symptom_text: '오늘은 입덧이 조금 나아진 것 같아', parsed_category: 'NAUSEA', severity: 2 },
    { symptom_text: '기분이 갑자기 울컥하고 눈물이 나', parsed_category: 'EMOTIONAL', severity: 3 },
    { symptom_text: '허리가 살짝 뻐근해', parsed_category: 'BACK_PAIN', severity: 2 },
    { symptom_text: '오늘 너무 답답하고 어디 나가고 싶어', parsed_category: 'EMOTIONAL', severity: 2 },
    { symptom_text: '피곤한데 잠이 잘 안 와', parsed_category: 'SLEEP', severity: 3 },
  ],
}

const PRESET_17_24: WeekPreset = {
  modeSchedule: buildModeSchedule([
    ['SLEEP_MODE', 2],
    ['HOUSEWORK_MODE', 2],
    ['TRAVEL_MODE', 1],
    ['MORNING_BRIEFING', 1],
  ]),
  symptoms: [
    { symptom_text: '허리가 많이 아파서 집안일하기 힘들어', parsed_category: 'BACK_PAIN', severity: 3 },
    { symptom_text: '아기가 움직이는 것 같아!', parsed_category: 'KICK', severity: 1 },
    { symptom_text: '다리가 자꾸 붓는 것 같아', parsed_category: 'OTHER', severity: 2 },
    { symptom_text: '오늘 몸이 너무 무거워서 빨래 못 꺼냈어', parsed_category: 'FATIGUE', severity: 3 },
    { symptom_text: '밤에 자다가 자꾸 깨', parsed_category: 'SLEEP', severity: 3 },
  ],
}

const PRESET_25_32: WeekPreset = {
  modeSchedule: buildModeSchedule([
    ['SLEEP_MODE', 3],
    ['HOUSEWORK_MODE', 2],
    ['NAUSEA_MODE', 1],
    ['MORNING_BRIEFING', 1],
  ]),
  symptoms: [
    { symptom_text: '발이 너무 부어서 신발이 안 들어가', parsed_category: 'OTHER', severity: 3 },
    { symptom_text: '밤에 옆으로 누워도 불편해서 잠을 못 자', parsed_category: 'SLEEP', severity: 4 },
    { symptom_text: '허리랑 골반이 같이 아파', parsed_category: 'BACK_PAIN', severity: 4 },
    { symptom_text: '아기가 많이 움직이는 날이었어', parsed_category: 'KICK', severity: 1 },
    { symptom_text: '오늘 몸이 천근만근이야', parsed_category: 'FATIGUE', severity: 4 },
  ],
}

const PRESET_33_40: WeekPreset = {
  modeSchedule: buildModeSchedule([
    ['SLEEP_MODE', 3],
    ['HOUSEWORK_MODE', 3],
    ['MORNING_BRIEFING', 1],
  ]),
  symptoms: [
    { symptom_text: '배가 너무 무거워서 걷기도 힘들어', parsed_category: 'FATIGUE', severity: 4 },
    { symptom_text: '밤에 배가 뭉치는 느낌이 자꾸 와', parsed_category: 'OTHER', severity: 3 },
    { symptom_text: '요즘 잠을 거의 못 자고 있어', parsed_category: 'SLEEP', severity: 4 },
    { symptom_text: '손발이 많이 붓고 저려', parsed_category: 'OTHER', severity: 3 },
    { symptom_text: '아기 태동이 강해져서 놀랐어', parsed_category: 'KICK', severity: 1 },
  ],
}

function buildModeSchedule(
  entries: [ModeKey, number][],
): { mode: ModeKey; daysAgo: number }[] {
  const days = pickRandomDays(entries.reduce((sum, [, count]) => sum + count, 0))
  let index = 0
  return entries.flatMap(([mode, count]) =>
    Array.from({ length: count }, () => ({
      mode,
      daysAgo: days[index++]!,
    })),
  )
}

function pickRandomDays(count: number): number[] {
  const pool = [1, 2, 3, 4, 5, 6]
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  if (count <= pool.length) {
    return shuffled.slice(0, count)
  }
  return Array.from({ length: count }, (_, i) => shuffled[i % pool.length]!)
}

function getPresetByWeek(weeks: number): WeekPreset {
  if (weeks <= 8) return PRESET_4_8
  if (weeks <= 16) return PRESET_9_16
  if (weeks <= 24) return PRESET_17_24
  if (weeks <= 32) return PRESET_25_32
  return PRESET_33_40
}

function toCreatedAt(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0)
  return date.toISOString()
}

export async function seedDemoData(
  supabase: SupabaseClient,
  weeks: number,
  userId: string,
): Promise<void> {
  try {
    const preset = getPresetByWeek(weeks)
    const symptomDays = pickRandomDays(preset.symptoms.length)

    const modeRuns = preset.modeSchedule.map(({ mode, daysAgo }) => {
      const template = MODE_TEMPLATES[mode]
      return {
        mode: template.mode,
        mode_label: template.mode_label,
        source: template.source,
        input_text: template.input_text,
        signals: template.signals,
        reply: template.reply,
        wife_card: template.wife_card,
        husband_card: template.husband_card,
        device_results: template.device_results,
        created_at: toCreatedAt(daysAgo),
      }
    })

    const symptomLogs = preset.symptoms.map((symptom, index) => ({
      user_id: userId,
      symptom_text: symptom.symptom_text,
      parsed_category: symptom.parsed_category,
      severity: symptom.severity,
      created_at: toCreatedAt(symptomDays[index]!),
    }))

    const { error: modeRunsError } = await supabase.from('mode_runs').insert(modeRuns)
    if (modeRunsError) {
      console.error('[setup] mode_runs 시딩 실패:', modeRunsError)
    }

    const { error: symptomLogsError } = await supabase.from('symptom_logs').insert(symptomLogs)
    if (symptomLogsError) {
      console.error('[setup] symptom_logs 시딩 실패:', symptomLogsError)
    }

    if (!modeRunsError && !symptomLogsError) {
      console.log(
        `[setup] 시연 데모 데이터 시딩 완료 (${weeks}주차): mode_runs ${modeRuns.length}건, symptom_logs ${symptomLogs.length}건`,
      )
    }
  } catch (error) {
    console.error('[setup] 시연 데모 데이터 시딩 처리 실패:', error)
  }
}
