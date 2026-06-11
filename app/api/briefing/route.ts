import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { textToSpeech } from '@/lib/elevenlabs'

const SYSTEM_PROMPT = `당신은 임산부 케어 AI입니다.
아래 데이터를 바탕으로 자연스러운 음성 브리핑을
한국어로 작성해주세요.

규칙:
- 150자 이내
- 자연스러운 말투 (읽어주는 용도)
- 인사로 시작
- 어제 상태 + 최근 1주일 패턴 + 임신 주차 종합
- 오늘 하루 조언 1가지로 마무리
- 숫자보다 자연스러운 표현 사용
  (3회 → 세 번, 7일 → 일주일)
- 이모지 사용 금지 (TTS로 읽기 때문)

예시:
'안녕하세요. 오늘 아내 상태를 알려드릴게요.
어제는 입덧이 있었고 아기가 두 번 움직였어요.
이번 주는 전반적으로 피로감이 많았네요.
임신 12주차인 만큼 오늘은 충분한 수분 섭취를
꼭 챙겨주세요.'`

function getTodayStartISO() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

function getYesterdayStartISO() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
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

    const yesterdayStart = getYesterdayStartISO()
    const todayStart = getTodayStartISO()
    const sevenDaysAgo = getSevenDaysAgoISO()
    const supabase = createClient(supabaseUrl, supabaseKey)

    const [
      userResult,
      yesterdaySymptomResult,
      yesterdayDeviceResult,
      weekSymptomResult,
      weekDeviceResult,
      todayMoodResult,
    ] = await Promise.all([
      hasValidWeeks
        ? Promise.resolve({ data: null, error: null })
        : supabase.from('users').select('due_date').eq('role', 'wife').maybeSingle(),
      supabase
        .from('symptom_logs')
        .select('symptom_text, parsed_category, severity, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', yesterdayStart)
        .lt('created_at', todayStart)
        .order('created_at', { ascending: true }),
      supabase
        .from('device_events')
        .select('event_type, triggered_by, device_status, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', yesterdayStart)
        .lt('created_at', todayStart)
        .order('created_at', { ascending: true }),
      supabase
        .from('symptom_logs')
        .select('symptom_text, parsed_category, severity, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true }),
      supabase
        .from('device_events')
        .select('event_type, triggered_by, device_status, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true }),
      supabase
        .from('moods')
        .select('mood, emoji, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (userResult.error) {
      console.error('users 조회 실패:', userResult.error)
      return NextResponse.json({ error: '사용자 정보 조회 실패' }, { status: 500 })
    }

    if (yesterdaySymptomResult.error) {
      console.error('어제 symptom_logs 조회 실패:', yesterdaySymptomResult.error)
      return NextResponse.json({ error: '증상 기록 조회 실패' }, { status: 500 })
    }

    if (yesterdayDeviceResult.error) {
      console.error('어제 device_events 조회 실패:', yesterdayDeviceResult.error)
      return NextResponse.json({ error: '기기 이벤트 조회 실패' }, { status: 500 })
    }

    if (weekSymptomResult.error) {
      console.error('주간 symptom_logs 조회 실패:', weekSymptomResult.error)
      return NextResponse.json({ error: '증상 기록 조회 실패' }, { status: 500 })
    }

    if (weekDeviceResult.error) {
      console.error('주간 device_events 조회 실패:', weekDeviceResult.error)
      return NextResponse.json({ error: '기기 이벤트 조회 실패' }, { status: 500 })
    }

    if (todayMoodResult.error) {
      console.error('오늘 moods 조회 실패:', todayMoodResult.error)
      return NextResponse.json({ error: '기분 기록 조회 실패' }, { status: 500 })
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

    const briefingData = {
      weeksPregnant,
      yesterdaySymptoms: yesterdaySymptomResult.data ?? [],
      yesterdayDeviceEvents: yesterdayDeviceResult.data ?? [],
      weekSymptoms: weekSymptomResult.data ?? [],
      weekDeviceEvents: weekDeviceResult.data ?? [],
      todayMood: todayMoodResult.data ?? null,
    }

    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `임신 주차: ${weeksPregnant}주차

어제 증상 기록:
${JSON.stringify(briefingData.yesterdaySymptoms, null, 2)}

어제 기기 이벤트:
${JSON.stringify(briefingData.yesterdayDeviceEvents, null, 2)}

최근 7일 증상 기록:
${JSON.stringify(briefingData.weekSymptoms, null, 2)}

최근 7일 기기 이벤트:
${JSON.stringify(briefingData.weekDeviceEvents, null, 2)}

오늘 기분:
${JSON.stringify(briefingData.todayMood, null, 2)}`,
        },
      ],
    })

    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) {
      return NextResponse.json({ error: '브리핑 텍스트 생성 실패' }, { status: 500 })
    }

    const audioBase64 = await textToSpeech(text)

    return NextResponse.json({ text, audioBase64 })
  } catch (error) {
    console.error('브리핑 API 처리 실패:', error)
    return NextResponse.json({ error: '브리핑 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
