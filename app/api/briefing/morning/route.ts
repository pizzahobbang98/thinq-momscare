import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getModeLabel, type Mode } from '@/lib/ai-mode-router'
import { textToSpeech } from '@/lib/elevenlabs'

type MorningBriefingRequestBody = {
  pregnancyWeek?: number
  weeks?: number
}

type MorningBriefingResult = {
  wifeBriefing: string
  husbandBriefing: string
  recommendedModes: RecommendedMode[]
}

type RecommendedMode = Exclude<Mode, 'UNKNOWN'>

const SYSTEM_PROMPT = `당신은 임산부 케어 서비스의 아침 브리핑 AI입니다.
아래 데이터를 바탕으로 JSON만 반환하세요.

반드시 포함할 내용:
- 임신 주차별 맞춤 인사
- 최근 1주일 컨디션 요약
- 오늘 조심할 것 1가지
- 오늘 추천 모드
- 아빠손길 조언 1문장

반환 형식:
{
  "wifeBriefing": "아내에게 들려줄 한국어 브리핑. 자연스러운 말투, 250자 이내, 이모지 금지",
  "husbandBriefing": "남편이 오늘 할 행동 1~2문장. 160자 이내, 이모지 금지",
  "recommendedModes": ["NAUSEA_MODE" | "SLEEP_MODE" | "HOUSEWORK_MODE" | "TRAVEL_MODE" | "MORNING_BRIEFING"]
}`

const VALID_RECOMMENDED_MODES: RecommendedMode[] = [
  'NAUSEA_MODE',
  'SLEEP_MODE',
  'HOUSEWORK_MODE',
  'TRAVEL_MODE',
  'MORNING_BRIEFING',
]

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

function isRecommendedMode(value: unknown): value is RecommendedMode {
  return (
    typeof value === 'string' &&
    VALID_RECOMMENDED_MODES.includes(value as RecommendedMode)
  )
}

function safeArrayLength(value: unknown[] | null | undefined) {
  return Array.isArray(value) ? value.length : 0
}

function buildFallbackBriefing(input: {
  pregnancyWeek: number
  symptomCount: number
  moodCount: number
  modeRunCount: number
}): MorningBriefingResult {
  const recommendedModes: RecommendedMode[] =
    input.symptomCount > 0 ? ['NAUSEA_MODE', 'SLEEP_MODE'] : ['MORNING_BRIEFING']

  return {
    wifeBriefing: `좋은 아침이에요. 임신 ${input.pregnancyWeek}주차인 오늘은 몸의 신호를 먼저 살피고 천천히 시작해보세요. 최근 기록을 바탕으로 무리하지 않는 케어 루틴을 준비했어요.`,
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

function parseBriefingResult(content: string, pregnancyWeek: number): MorningBriefingResult {
  try {
    const parsed = JSON.parse(content) as Partial<MorningBriefingResult>
    const recommendedModes = Array.isArray(parsed.recommendedModes)
      ? parsed.recommendedModes.filter(isRecommendedMode)
      : []

    return {
      wifeBriefing:
        parsed.wifeBriefing?.trim() ||
        `좋은 아침이에요. 임신 ${pregnancyWeek}주차인 오늘은 무리하지 말고 몸의 신호를 천천히 살펴보세요.`,
      husbandBriefing:
        parsed.husbandBriefing?.trim() ||
        '오늘은 아내 컨디션을 먼저 물어보고, 냄새와 소음이 부담되지 않게 도와주세요.',
      recommendedModes: recommendedModes.length > 0 ? recommendedModes : ['MORNING_BRIEFING'],
    }
  } catch {
    return {
      wifeBriefing: `좋은 아침이에요. 임신 ${pregnancyWeek}주차인 오늘은 충분히 쉬고 수분을 챙기며 천천히 시작해보세요.`,
      husbandBriefing: '오늘은 아내에게 필요한 배려를 먼저 물어보고 집안일과 식사를 가볍게 도와주세요.',
      recommendedModes: ['MORNING_BRIEFING'],
    }
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

    if (!demoWifeId) {
      return NextResponse.json({ error: '서버 환경 변수가 설정되지 않았습니다.' }, { status: 500 })
    }

    const body = (await request.json().catch(() => ({}))) as MorningBriefingRequestBody
    const requestedPregnancyWeek = body.pregnancyWeek ?? body.weeks

    if (requestedPregnancyWeek !== undefined && !isValidPregnancyWeek(requestedPregnancyWeek)) {
      return NextResponse.json({ error: 'pregnancyWeek는 1~42 사이의 정수여야 합니다.' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const sevenDaysAgo = getSevenDaysAgoISO()

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
        : supabase.from('users').select('due_date').eq('id', demoWifeId).maybeSingle(),
    ])

    if (symptomsResult.error) {
      console.error('[morning briefing] symptom_logs 조회 실패:', symptomsResult.error)
      return NextResponse.json({ error: '증상 기록 조회 실패' }, { status: 500 })
    }

    if (modeRunsResult.error) {
      console.warn('[morning briefing] mode_runs 조회 실패:', modeRunsResult.error)
    }

    if (moodsResult.error) {
      console.error('[morning briefing] moods 조회 실패:', moodsResult.error)
      return NextResponse.json({ error: '기분 기록 조회 실패' }, { status: 500 })
    }

    if (userResult.error) {
      console.error('[morning briefing] users 조회 실패:', userResult.error)
      return NextResponse.json({ error: '사용자 정보 조회 실패' }, { status: 500 })
    }

    const dueDate = (userResult.data as { due_date?: string } | null)?.due_date
    const pregnancyWeek =
      requestedPregnancyWeek ?? (dueDate ? calculateWeeksPregnant(dueDate) : undefined)

    if (!pregnancyWeek || !isValidPregnancyWeek(pregnancyWeek)) {
      return NextResponse.json({ error: '임신 주차를 확인할 수 없습니다.' }, { status: 400 })
    }

    let briefing = buildFallbackBriefing({
      pregnancyWeek,
      symptomCount: safeArrayLength(symptomsResult.data),
      moodCount: safeArrayLength(moodsResult.data),
      modeRunCount: modeRunsResult.error ? 0 : safeArrayLength(modeRunsResult.data),
    })

    if (apiKey) {
      try {
        const { default: OpenAI } = await import('openai')
        const openai = new OpenAI({ apiKey })
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: JSON.stringify({
                pregnancyWeek,
                dueDate: dueDate ?? null,
                symptoms: symptomsResult.data ?? [],
                modeRuns: modeRunsResult.error ? [] : (modeRunsResult.data ?? []),
                moods: moodsResult.data ?? [],
              }),
            },
          ],
          response_format: { type: 'json_object' },
        })

        const content = completion.choices[0]?.message?.content
        if (content) {
          briefing = parseBriefingResult(content, pregnancyWeek)
        }
      } catch (error) {
        console.warn('[morning briefing] OpenAI generation failed, fallback used:', error)
      }
    } else {
      console.warn('[morning briefing] OPENAI_API_KEY missing, fallback used')
    }

    const audioBase64 = await safeTextToSpeech(briefing.wifeBriefing)
    const cardDate = getTodayDateString()

    const { error: dailyCardsError } = await supabase.from('daily_cards').insert([
      {
        card_date: cardDate,
        target_role: 'wife',
        card_type: 'MORNING_BRIEFING',
        title: '오늘의 굿모닝 브리핑',
        content: briefing.wifeBriefing,
        pregnancy_week: pregnancyWeek,
      },
      {
        card_date: cardDate,
        target_role: 'husband',
        card_type: 'MORNING_BRIEFING',
        title: '오늘의 아빠손길 브리핑',
        content: briefing.husbandBriefing,
        pregnancy_week: pregnancyWeek,
      },
    ])

    if (dailyCardsError) {
      console.warn('[morning briefing] daily_cards 저장 실패:', dailyCardsError)
    }

    const { error: modeRunsInsertError } = await supabase.from('mode_runs').insert({
      user_id: demoWifeId,
      mode: 'MORNING_BRIEFING',
      mode_label: getModeLabel('MORNING_BRIEFING'),
      source: 'thinq_mom_morning',
      input_text: '굿모닝 브리핑',
      signals: ['기상', '아침 브리핑'],
      reply: briefing.wifeBriefing,
      wife_card: briefing.wifeBriefing,
      husband_card: briefing.husbandBriefing,
      device_results: [],
    })

    if (modeRunsInsertError) {
      console.warn('[morning briefing] mode_runs 저장 실패:', modeRunsInsertError)
    }

    return NextResponse.json({
      success: true,
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
