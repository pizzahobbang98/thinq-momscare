import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { OPENAI_MODELS } from '@/lib/openai-models'

type KickStatus = 'normal' | 'low' | 'high'

type KickAnalysis = {
  today_count: number
  daily_average: number
  most_active_time: string
  pattern_comment: string
  status: KickStatus
  advice: string
}

type TimeSlotCounts = {
  dawn: number
  morning: number
  afternoon: number
  evening: number
}

const SYSTEM_PROMPT = `임산부 태동 패턴 분석 AI입니다.
아래 JSON만 반환하세요.
{
  today_count: number,
  daily_average: number,
  most_active_time: string (가장 활발한 시간대),
  pattern_comment: string (패턴 분석 2문장),
  status: 'normal' | 'low' | 'high',
  advice: string (한줄 조언)
}`

const TIME_SLOT_LABELS: Record<keyof TimeSlotCounts, string> = {
  dawn: '새벽',
  morning: '아침',
  afternoon: '오후',
  evening: '저녁',
}

function getSevenDaysAgoISO() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function getTodayStartISO() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

function getKSTHour(iso: string) {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      hour: 'numeric',
      hour12: false,
    }).format(new Date(iso)),
  )
}

function getTimeSlot(hour: number): keyof TimeSlotCounts {
  if (hour >= 0 && hour < 6) return 'dawn'
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

function aggregateByTimeSlot(logs: { created_at: string }[]): TimeSlotCounts {
  const counts: TimeSlotCounts = { dawn: 0, morning: 0, afternoon: 0, evening: 0 }

  for (const log of logs) {
    const slot = getTimeSlot(getKSTHour(log.created_at))
    counts[slot] += 1
  }

  return counts
}

function getMostActiveTime(counts: TimeSlotCounts): string {
  const entries = Object.entries(counts) as [keyof TimeSlotCounts, number][]
  const max = Math.max(...entries.map(([, count]) => count))

  if (max === 0) return '기록 없음'

  const top = entries.filter(([, count]) => count === max)
  return top.map(([slot]) => TIME_SLOT_LABELS[slot]).join('·')
}

function parseAnalysis(
  content: string,
  computed: { today_count: number; daily_average: number; most_active_time: string },
): KickAnalysis {
  const validStatuses: KickStatus[] = ['normal', 'low', 'high']

  try {
    const parsed = JSON.parse(content) as Partial<KickAnalysis>
    const status = validStatuses.includes(parsed.status as KickStatus)
      ? (parsed.status as KickStatus)
      : 'normal'

    return {
      today_count: computed.today_count,
      daily_average: computed.daily_average,
      most_active_time: parsed.most_active_time ?? computed.most_active_time,
      pattern_comment:
        parsed.pattern_comment ?? '이번 주 태동 패턴을 꾸준히 기록하고 있어요.',
      status,
      advice: parsed.advice ?? '편안한 자세로 태동을 느껴보세요.',
    }
  } catch {
    return {
      today_count: computed.today_count,
      daily_average: computed.daily_average,
      most_active_time: computed.most_active_time,
      pattern_comment: '이번 주 태동 패턴을 꾸준히 기록하고 있어요.',
      status: 'normal',
      advice: '편안한 자세로 태동을 느껴보세요.',
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

    await request.json().catch(() => ({}))

    const sevenDaysAgo = getSevenDaysAgoISO()
    const todayStart = getTodayStartISO()
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('symptom_logs')
      .select('created_at')
      .eq('user_id', demoWifeId)
      .eq('parsed_category', 'KICK')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('태동 기록 조회 실패:', error)
      return NextResponse.json({ error: '태동 기록 조회 실패' }, { status: 500 })
    }

    const kickLogs = data ?? []

    if (kickLogs.length === 0) {
      return NextResponse.json({ error: '아직 태동 기록이 없어요' }, { status: 404 })
    }

    const todayCount = kickLogs.filter((log) => log.created_at >= todayStart).length
    const dailyAverage = Math.round((kickLogs.length / 7) * 10) / 10
    const timeSlots = aggregateByTimeSlot(kickLogs)
    const mostActiveTime = getMostActiveTime(timeSlots)

    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODELS.text,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `집계 데이터:
- 오늘 태동 횟수: ${todayCount}
- 7일 평균 (일당): ${dailyAverage}
- 7일 총 태동: ${kickLogs.length}
- 시간대별 횟수: 새벽(0~6시) ${timeSlots.dawn}회, 아침(6~12시) ${timeSlots.morning}회, 오후(12~18시) ${timeSlots.afternoon}회, 저녁(18~24시) ${timeSlots.evening}회
- 가장 활발한 시간대: ${mostActiveTime}

태동 기록 (created_at):
${JSON.stringify(kickLogs, null, 2)}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: '태동 패턴 분석 실패' }, { status: 500 })
    }

    const analysis = parseAnalysis(content, {
      today_count: todayCount,
      daily_average: dailyAverage,
      most_active_time: mostActiveTime,
    })

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('태동 패턴 분석 API 처리 실패:', error)
    return NextResponse.json({ error: '태동 패턴 분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
