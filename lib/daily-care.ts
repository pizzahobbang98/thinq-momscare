import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

type DailyCareCards = {
  wife: { title: string; content: string }
  husband: { title: string; content: string }
}

const SYSTEM_PROMPT = `임산부 케어 AI입니다. 아래 데이터를 바탕으로 JSON만 반환하세요.
{
  wife: { title: string, content: string },
  husband: { title: string, content: string }
}

wife 카드 규칙:
- title: '🌸 N주차 오늘의 조언'
- content: 최근 증상 기반 오늘 하루 조언 (150자 내외, 따뜻한 말투)

husband 카드 규칙:
- title: '👨 오늘 아내 케어 미션'
- content: 아내 컨디션 기반 오늘 남편이 할 수 있는 이벤트 제안 (150자 내외)

데이터가 없으면 임신 주차 기반 일반적인 조언 생성`

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

function parseCards(content: string, weeksPregnant: number): DailyCareCards {
  try {
    const parsed = JSON.parse(content) as Partial<DailyCareCards>
    const defaultWifeTitle = `🌸 ${weeksPregnant}주차 오늘의 조언`
    const defaultHusbandTitle = '👨 오늘 아내 케어 미션'

    return {
      wife: {
        title: parsed.wife?.title ?? defaultWifeTitle,
        content: parsed.wife?.content ?? '오늘도 몸과 마음을 편히 쉬어가세요.',
      },
      husband: {
        title: parsed.husband?.title ?? defaultHusbandTitle,
        content:
          parsed.husband?.content ?? '오늘은 아내에게 따뜻한 말 한마디를 건네보세요.',
      },
    }
  } catch {
    return {
      wife: {
        title: `🌸 ${weeksPregnant}주차 오늘의 조언`,
        content: '오늘도 몸과 마음을 편히 쉬어가세요.',
      },
      husband: {
        title: '👨 오늘 아내 케어 미션',
        content: '오늘은 아내에게 따뜻한 말 한마디를 건네보세요.',
      },
    }
  }
}

export async function runDailyCare() {
  const apiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

  if (!apiKey || !supabaseUrl || !supabaseKey || !demoWifeId) {
    throw new Error('필수 환경 변수가 설정되지 않았습니다.')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const cardDate = getTodayDateString()
  const sevenDaysAgo = getSevenDaysAgoISO()

  const [userResult, symptomResult, deviceResult] = await Promise.all([
    supabase.from('users').select('due_date').eq('id', demoWifeId).maybeSingle(),
    supabase
      .from('symptom_logs')
      .select('symptom_text, parsed_category, severity, advice, created_at')
      .eq('user_id', demoWifeId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false }),
    supabase
      .from('device_events')
      .select('event_type, triggered_by, device_status, created_at')
      .eq('user_id', demoWifeId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false }),
  ])

  if (userResult.error) {
    throw new Error(`users 조회 실패: ${userResult.error.message}`)
  }

  if (symptomResult.error) {
    throw new Error(`symptom_logs 조회 실패: ${symptomResult.error.message}`)
  }

  if (deviceResult.error) {
    throw new Error(`device_events 조회 실패: ${deviceResult.error.message}`)
  }

  const dueDate = userResult.data?.due_date
  if (!dueDate) {
    throw new Error('wife 유저 due_date가 없습니다.')
  }

  const weeksPregnant = calculateWeeksPregnant(dueDate)
  const symptomLogs = symptomResult.data ?? []
  const deviceEvents = deviceResult.data ?? []

  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `임신 주차: ${weeksPregnant}주
due_date: ${dueDate}

최근 7일 증상 기록:
${JSON.stringify(symptomLogs, null, 2)}

최근 7일 기기 이벤트:
${JSON.stringify(deviceEvents, null, 2)}`,
      },
    ],
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('케어 카드 생성 실패')
  }

  const cards = parseCards(content, weeksPregnant)

  const { error: upsertError } = await supabase.from('daily_cards').upsert(
    [
      {
        target_role: 'wife',
        card_date: cardDate,
        title: cards.wife.title,
        content: cards.wife.content,
      },
      {
        target_role: 'husband',
        card_date: cardDate,
        title: cards.husband.title,
        content: cards.husband.content,
      },
    ],
    { onConflict: 'card_date,target_role' },
  )

  if (upsertError) {
    throw new Error(`daily_cards 저장 실패: ${upsertError.message}`)
  }

  return { success: true as const, cardDate, weeksPregnant }
}
