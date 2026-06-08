import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { textToSpeech } from '@/lib/elevenlabs'

type MorningBriefingRequestBody = {
  pregnancyWeek?: number
}

type MorningBriefingResult = {
  wifeBriefing: string
  husbandBriefing: string
  recommendedModes: string[]
}

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

const VALID_RECOMMENDED_MODES = [
  'NAUSEA_MODE',
  'SLEEP_MODE',
  'HOUSEWORK_MODE',
  'TRAVEL_MODE',
  'MORNING_BRIEFING',
] as const

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

function parseBriefingResult(content: string, pregnancyWeek: number): MorningBriefingResult {
  try {
    const parsed = JSON.parse(content) as Partial<MorningBriefingResult>
    const recommendedModes = Array.isArray(parsed.recommendedModes)
      ? parsed.recommendedModes.filter((mode): mode is (typeof VALID_RECOMMENDED_MODES)[number] =>
          VALID_RECOMMENDED_MODES.includes(mode as (typeof VALID_RECOMMENDED_MODES)[number]),
        )
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

    if (!apiKey || !demoWifeId) {
      return NextResponse.json({ error: '서버 환경 변수가 설정되지 않았습니다.' }, { status: 500 })
    }

    const body = (await request.json().catch(() => ({}))) as MorningBriefingRequestBody
    if (body.pregnancyWeek !== undefined && !isValidPregnancyWeek(body.pregnancyWeek)) {
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
      body.pregnancyWeek
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
      body.pregnancyWeek ?? (dueDate ? calculateWeeksPregnant(dueDate) : undefined)

    if (!pregnancyWeek || !isValidPregnancyWeek(pregnancyWeek)) {
      return NextResponse.json({ error: '임신 주차를 확인할 수 없습니다.' }, { status: 400 })
    }

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
    if (!content) {
      return NextResponse.json({ error: '아침 브리핑 생성 실패' }, { status: 500 })
    }

    const briefing = parseBriefingResult(content, pregnancyWeek)
    const audioBase64 = await textToSpeech(briefing.wifeBriefing)
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
