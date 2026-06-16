import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { type Mode } from '@/lib/ai-mode-router'
import { textToSpeech } from '@/lib/elevenlabs'

type MorningBriefingRequestBody = {
  source?: string
  triggerText?: string
  pregnancyWeek?: number
  weeks?: number
  pregnancyStatus?: 'preparing' | 'pregnant'
  role?: 'wife' | 'husband'
  briefingVariant?: number
}

type MorningBriefingResult = {
  wifeBriefing: string
  husbandBriefing: string
  recommendedModes: RecommendedMode[]
}

type RecommendedMode = Exclude<Mode, 'UNKNOWN'>

const DEFAULT_PREGNANCY_WEEK = 12

function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  }

  return createClient(supabaseUrl, supabaseKey)
}

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

function getSevenDaysAgoISO() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function getDaysUntilDue(dueDate: string) {
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function calculateWeeksPregnant(dueDate: string) {
  const daysUntilDue = getDaysUntilDue(dueDate)
  return Math.floor((daysUntilDue - 280) / -7)
}

function isValidPregnancyWeek(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 42
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function safeArrayLength(value: unknown[] | null | undefined) {
  return Array.isArray(value) ? value.length : 0
}

function buildFallbackBriefing(input: {
  pregnancyStatus: 'preparing' | 'pregnant'
  pregnancyWeek?: number
  symptomCount: number
  moodCount: number
  modeRunCount: number
}): MorningBriefingResult {
  if (input.pregnancyStatus === 'preparing') {
    return {
      wifeBriefing:
        input.moodCount > 0 || input.modeRunCount > 0
          ? '좋은 아침이에요. 최근 생활 기록을 바탕으로 오늘은 수면과 식사 시간을 무리 없이 맞추고, 짧은 휴식으로 마음의 여유를 챙겨보세요.'
          : '좋은 아침이에요. 임신 준비는 완벽함보다 꾸준한 생활 리듬이 중요해요. 오늘은 식사 시간, 가벼운 움직임, 충분한 휴식 중 한 가지만 편안하게 실천해보세요.',
      husbandBriefing:
        '좋은 아침이에요. 오늘은 둘의 일정이 무리하지 않도록 저녁 시간을 여유롭게 잡고, 함께 할 수 있는 식사나 가벼운 산책을 먼저 제안해보세요.',
      recommendedModes: ['MORNING_BRIEFING', 'SLEEP_MODE'],
    }
  }

  const pregnancyWeek = input.pregnancyWeek ?? DEFAULT_PREGNANCY_WEEK
  const recommendedModes: RecommendedMode[] =
    input.symptomCount > 0 ? ['NAUSEA_MODE', 'SLEEP_MODE'] : ['MORNING_BRIEFING']

  return {
    wifeBriefing: `좋은 아침이에요. 임신 ${pregnancyWeek}주차인 오늘은 몸의 신호를 먼저 살피고 천천히 시작해보세요. 최근 기록을 바탕으로 무리하지 않는 케어 루틴을 준비했어요.`,
    husbandBriefing:
      input.moodCount > 0 || input.modeRunCount > 0
        ? '오늘은 아내의 최근 컨디션을 먼저 물어보고, 냄새와 소음이 부담되지 않게 집안일을 가볍게 나눠주세요.'
        : '오늘은 아내가 하루를 천천히 시작할 수 있게 아침 컨디션과 필요한 도움을 먼저 물어봐 주세요.',
    recommendedModes,
  }
}

async function safeTextToSpeech(text: string) {
  try {
    return await textToSpeech(text)
  } catch (error) {
    console.warn('[morning briefing] TTS skipped:', error)
    return ''
  }
}

function enforceStatusSpecificBriefing(
  briefing: MorningBriefingResult,
  pregnancyStatus: 'preparing' | 'pregnant',
  pregnancyWeek?: number,
  variant = 0,
): MorningBriefingResult {
  const pick = <T,>(items: T[]) => items[Math.abs(variant) % items.length]

  if (pregnancyStatus === 'preparing') {
    const selected = pick([
      {
        wife:
          '좋은 아침이에요. 오늘은 조급해하지 말고, 물 한 잔을 마신 뒤 가볍게 몸을 움직여보세요.',
        husband:
          '좋은 아침이에요. 오늘은 서로의 컨디션을 묻고, 함께 식사하거나 잠깐 걸어보세요.',
      },
      {
        wife:
          '좋은 아침이에요. 임신 준비중인 오늘은 완벽한 계획보다 편안한 리듬이 더 중요해요. 아침 식사와 짧은 산책 중 하나만 먼저 챙겨보세요.',
        husband:
          '좋은 아침이에요. 오늘은 배우자가 부담 없이 하루를 시작할 수 있게 일정 하나를 줄이고, 함께 먹을 따뜻한 식사를 먼저 제안해보세요.',
      },
      {
        wife:
          '좋은 아침이에요. 몸과 마음을 천천히 깨우는 날로 잡아볼게요. 카페인보다 물을 먼저 마시고, 컨디션이 올라오는 시간에 맞춰 움직여보세요.',
        husband:
          '좋은 아침이에요. 오늘은 둘의 생활 리듬을 맞추는 데 집중해보세요. 무리한 약속보다 함께 쉬는 시간을 먼저 확보하면 좋아요.',
      },
    ])

    return {
      ...briefing,
      wifeBriefing: selected.wife,
      husbandBriefing: selected.husband,
    }
  }

  const week = pregnancyWeek ?? DEFAULT_PREGNANCY_WEEK
  const pregnantBriefing = week <= 13
    ? pick([
        {
          wife:
            `좋은 아침이에요. 임신 ${week}주차에는 몸의 변화가 클 수 있어요. 오늘은 서두르지 말고 물과 가벼운 식사로 천천히 시작하세요.`,
          husband:
            `좋은 아침이에요. 임신 ${week}주차인 아내가 천천히 시작할 수 있도록 컨디션을 먼저 묻고 아침 준비를 도와주세요.`,
        },
        {
          wife:
            `좋은 아침이에요. 임신 ${week}주차인 오늘은 냄새와 피로에 예민할 수 있어요. 부담되는 음식은 피하고, 속이 편한 메뉴부터 천천히 챙겨보세요.`,
          husband:
            `좋은 아침이에요. 임신 ${week}주차에는 냄새와 피로가 크게 느껴질 수 있어요. 아침 메뉴를 먼저 물어보고 환기를 가볍게 도와주세요.`,
        },
        {
          wife:
            `좋은 아침이에요. 임신 ${week}주차의 아침은 몸의 신호를 확인하는 시간으로 시작해보세요. 어지럽거나 속이 불편하면 바로 쉬어도 괜찮아요.`,
          husband:
            `좋은 아침이에요. 오늘은 아내가 무리하지 않도록 이동과 식사 시간을 여유 있게 잡고, 필요한 도움을 먼저 물어봐 주세요.`,
        },
      ])
    : week <= 27
      ? pick([
          {
            wife:
              `좋은 아침이에요. 임신 ${week}주차인 오늘은 몸이 편한 범위에서 가볍게 움직이고, 중간중간 쉬어가세요.`,
            husband:
              `좋은 아침이에요. 임신 ${week}주차인 아내와 오늘 일정을 확인하고, 무리하지 않도록 함께 짧게 걸어보세요.`,
          },
          {
            wife:
              `좋은 아침이에요. 임신 ${week}주차에는 컨디션이 괜찮아 보여도 쉽게 지칠 수 있어요. 할 일을 작게 나누고 휴식 시간을 먼저 넣어보세요.`,
            husband:
              `좋은 아침이에요. 오늘은 아내가 오래 서 있지 않도록 집안일을 나눠 맡고, 외출 전 쉬는 시간을 챙겨주세요.`,
          },
          {
            wife:
              `좋은 아침이에요. 임신 ${week}주차인 오늘은 가벼운 움직임과 수분 보충을 같이 챙겨보세요. 몸이 무거우면 바로 속도를 낮추면 돼요.`,
            husband:
              `좋은 아침이에요. 아내가 편하게 움직일 수 있도록 동선을 줄이고, 필요한 물건을 미리 가까이 두면 좋아요.`,
          },
        ])
      : pick([
          {
            wife:
              `좋은 아침이에요. 임신 ${week}주차인 오늘은 움직임을 천천히 하고, 자주 쉬면서 몸이 보내는 신호를 우선하세요.`,
            husband:
              `좋은 아침이에요. 임신 ${week}주차인 아내가 자주 쉴 수 있도록 필요한 일 한 가지를 먼저 맡아주세요.`,
          },
          {
            wife:
              `좋은 아침이에요. 임신 ${week}주차에는 작은 움직임도 부담될 수 있어요. 오늘은 가까운 일부터 천천히 하고, 호흡이 편한 자세를 먼저 찾아보세요.`,
            husband:
              `좋은 아침이에요. 오늘은 아내가 이동을 최소화할 수 있게 주변 정리와 식사 준비를 먼저 챙겨주세요.`,
          },
          {
            wife:
              `좋은 아침이에요. 임신 ${week}주차인 오늘은 컨디션 변화가 있으면 바로 쉬는 걸 우선해도 괜찮아요. 중요한 일은 가장 편한 시간대로 미뤄보세요.`,
            husband:
              `좋은 아침이에요. 아내가 안심하고 쉴 수 있도록 병원 연락처와 필요한 물건을 확인하고, 오늘 일정은 여유 있게 잡아주세요.`,
          },
        ])

  return {
    ...briefing,
    wifeBriefing: pregnantBriefing.wife,
    husbandBriefing: pregnantBriefing.husband,
  }
}

export async function POST(request: Request) {
  try {
    const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

    const body = (await request.json().catch(() => ({}))) as MorningBriefingRequestBody
    const requestedPregnancyWeek = body.pregnancyWeek ?? body.weeks
    const pregnancyStatus = body.pregnancyStatus === 'preparing' ? 'preparing' : 'pregnant'
    const role = body.role === 'husband' ? 'husband' : 'wife'
    const briefingVariant = Number.isInteger(body.briefingVariant) ? body.briefingVariant : 0

    if (
      pregnancyStatus === 'pregnant' &&
      requestedPregnancyWeek !== undefined &&
      !isValidPregnancyWeek(requestedPregnancyWeek)
    ) {
      return NextResponse.json({ error: 'pregnancyWeek는 1~42 사이의 정수여야 합니다.' }, { status: 400 })
    }

    let supabase: ReturnType<typeof createServerSupabaseClient> | null = null
    try {
      supabase = createServerSupabaseClient()
    } catch (error) {
      console.warn('[morning briefing] Supabase client unavailable:', getErrorMessage(error))
    }

    const sevenDaysAgo = getSevenDaysAgoISO()
    let symptoms: unknown[] = []
    let modeRuns: unknown[] = []
    let moods: unknown[] = []
    let dueDate: string | undefined

    if (supabase && demoWifeId) {
      const [symptomsResult, modeRunsResult, moodsResult, userResult] = await Promise.all([
        supabase
          .from('symptom_logs')
          .select('symptom_text, parsed_category, severity, created_at')
          .eq('user_id', demoWifeId)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: true }),
        supabase
          .from('mode_runs')
          .select('mode, mode_label, source, signals, reply, wife_card, husband_card, created_at')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: true }),
        supabase
          .from('moods')
          .select('mood, emoji, created_at')
          .eq('user_id', demoWifeId)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: true }),
        requestedPregnancyWeek
          ? Promise.resolve({ data: null, error: null })
          : supabase.from('users').select('due_date').eq('role', 'wife').maybeSingle(),
      ])

      if (symptomsResult.error) {
        console.warn('[morning briefing] symptom_logs 조회 실패:', symptomsResult.error)
      } else {
        symptoms = symptomsResult.data ?? []
      }

      if (modeRunsResult.error) {
        console.warn('[morning briefing] mode_runs 조회 실패:', modeRunsResult.error)
      } else {
        modeRuns = modeRunsResult.data ?? []
      }

      if (moodsResult.error) {
        console.warn('[morning briefing] moods 조회 실패:', moodsResult.error)
      } else {
        moods = moodsResult.data ?? []
      }

      if (userResult.error) {
        console.warn('[morning briefing] users 조회 실패:', userResult.error)
      } else {
        dueDate = (userResult.data as { due_date?: string } | null)?.due_date
      }
    }

    const pregnancyWeek = pregnancyStatus === 'pregnant'
      ? requestedPregnancyWeek ?? (dueDate ? calculateWeeksPregnant(dueDate) : DEFAULT_PREGNANCY_WEEK)
      : undefined

    if (pregnancyStatus === 'pregnant' && !isValidPregnancyWeek(pregnancyWeek)) {
      return NextResponse.json({ error: 'pregnancyWeek를 계산할 수 없습니다.' }, { status: 400 })
    }

    let briefing = buildFallbackBriefing({
      pregnancyStatus,
      pregnancyWeek,
      symptomCount: safeArrayLength(symptoms),
      moodCount: safeArrayLength(moods),
      modeRunCount: safeArrayLength(modeRuns),
    })

    briefing = enforceStatusSpecificBriefing(briefing, pregnancyStatus, pregnancyWeek, briefingVariant)

    const spokenBriefing = role === 'husband' ? briefing.husbandBriefing : briefing.wifeBriefing
    const audioBase64 = await safeTextToSpeech(spokenBriefing)
    const cardDate = getTodayDateString()

    if (supabase) {
      const { error: dailyCardsError } = await supabase.from('daily_cards').insert({
        card_date: cardDate,
        target_role: 'wife',
        card_type: 'MORNING_BRIEFING',
        title: '오늘의 굿모닝 브리핑',
        content: briefing.wifeBriefing,
        pregnancy_week: pregnancyWeek ?? null,
      })

      if (dailyCardsError) {
        console.warn('[morning briefing] daily_cards 저장 실패:', dailyCardsError)
      }

      const { error: messageError } = await supabase.from('messages').insert({
        from_role: 'system',
        content: briefing.husbandBriefing,
      })

      if (messageError) {
        console.warn('[morning briefing] messages 저장 실패:', messageError)
      }
    }

    return NextResponse.json({
      success: true,
      type: 'MORNING_BRIEFING',
      wifeBriefing: briefing.wifeBriefing,
      husbandBriefing: briefing.husbandBriefing,
      audioBase64,
      recommendedModes: briefing.recommendedModes,
    })
  } catch (error) {
    console.error('[morning briefing] API failed:', error)
    return NextResponse.json(
      { error: '아침 브리핑 생성 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
