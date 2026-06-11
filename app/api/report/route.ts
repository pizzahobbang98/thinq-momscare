import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

type WeeklyReport = {
  summary: string
  symptoms: string
  device_usage: string
  recommendation: string
  encouragement: string
}

const SYSTEM_PROMPT = `임산부 케어 AI입니다. 이번 주 데이터를 분석해서
아래 JSON만 반환하세요.
{
  summary: string (이번 주 한줄 요약),
  symptoms: string (주요 증상 패턴 분석 2~3문장),
  device_usage: string (기기 사용 패턴 1~2문장),
  recommendation: string (다음 주 추천 행동 2~3가지 bullet),
  encouragement: string (임산부에게 따뜻한 응원 메시지 1문장)
}`

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

function parseReport(content: string, weeksPregnant: number): WeeklyReport {
  try {
    const parsed = JSON.parse(content) as Partial<WeeklyReport>
    return {
      summary: parsed.summary ?? `${weeksPregnant}주차, 이번 주도 잘 버텨주셨어요.`,
      symptoms: parsed.symptoms ?? '이번 주 기록된 증상이 많지 않아요.',
      device_usage: parsed.device_usage ?? '기기 사용 기록이 적어요.',
      recommendation:
        parsed.recommendation ??
        '• 충분한 휴식 취하기\n• 가벼운 산책\n• 규칙적인 수면',
      encouragement: parsed.encouragement ?? '오늘도 정말 수고 많으셨어요.',
    }
  } catch {
    return {
      summary: `${weeksPregnant}주차, 이번 주도 잘 버텨주셨어요.`,
      symptoms: '이번 주 기록된 증상이 많지 않아요.',
      device_usage: '기기 사용 기록이 적어요.',
      recommendation: '• 충분한 휴식 취하기\n• 가벼운 산책\n• 규칙적인 수면',
      encouragement: '오늘도 정말 수고 많으셨어요.',
    }
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

    if (!apiKey || !supabaseUrl || !supabaseKey || !demoWifeId) {
      console.error('필수 환경 변수가 설정되지 않았습니다.')
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    const body = (await request.json().catch(() => ({}))) as { weeks?: number }
    const weeksFromBody = body.weeks
    const hasValidWeeks =
      weeksFromBody !== undefined &&
      Number.isInteger(weeksFromBody) &&
      weeksFromBody >= 1 &&
      weeksFromBody <= 42

    const sevenDaysAgo = getSevenDaysAgoISO()
    const supabase = createClient(supabaseUrl, supabaseKey)

    const [symptomResult, deviceResult, userResult] = await Promise.all([
      supabase
        .from('symptom_logs')
        .select('symptom_text, parsed_category, severity, advice, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true }),
      supabase
        .from('device_events')
        .select('event_type, triggered_by, device_status, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true }),
      hasValidWeeks
        ? Promise.resolve({ data: null, error: null })
        : supabase.from('users').select('due_date').eq('role', 'wife').maybeSingle(),
    ])

    if (symptomResult.error) {
      console.error('symptom_logs 조회 실패:', symptomResult.error)
      return NextResponse.json({ error: '증상 기록 조회 실패' }, { status: 500 })
    }

    if (deviceResult.error) {
      console.error('device_events 조회 실패:', deviceResult.error)
      return NextResponse.json({ error: '기기 이벤트 조회 실패' }, { status: 500 })
    }

    if (userResult.error) {
      console.error('users 조회 실패:', userResult.error)
      return NextResponse.json({ error: '사용자 정보 조회 실패' }, { status: 500 })
    }

    let weeksPregnant: number

    if (hasValidWeeks) {
      weeksPregnant = weeksFromBody!
    } else {
      const dueDate = userResult.data?.due_date
      if (!dueDate) {
        return NextResponse.json({ error: '임신 예정일(due_date)이 없습니다.' }, { status: 400 })
      }
      weeksPregnant = calculateWeeksPregnant(dueDate)
    }
    const symptomLogs = symptomResult.data ?? []
    const deviceEvents = deviceResult.data ?? []

    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `임신 주차: ${weeksPregnant}주차
분석 기간: 최근 7일

증상 기록:
${JSON.stringify(symptomLogs, null, 2)}

기기 이벤트:
${JSON.stringify(deviceEvents, null, 2)}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: '리포트 생성 실패' }, { status: 500 })
    }

    const report = parseReport(content, weeksPregnant)

    return NextResponse.json({ report })
  } catch (error) {
    console.error('주간 리포트 API 처리 실패:', error)
    return NextResponse.json({ error: '주간 리포트 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
