import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { resolveServerPregnancyWeek } from '@/lib/server-pregnancy-week'

type DailyCareCards = {
  wife: { title: string; content: string }
  husband: { title: string; content: string }
}

// Local retry sync normalizes hub_voice/hub_text to voice/text.
const HUB_CONVERSATION_SOURCES = ['hub_voice', 'hub_text', 'voice', 'text', 'hub']
const MAX_HUB_CONVERSATIONS = 20

const SYSTEM_PROMPT = `임산부 케어 AI입니다. 임신 주차와 허브에서 실제로 나눈 대화 기록만 바탕으로 JSON만 반환하세요.
{
  wife: { title: string, content: string },
  husband: { title: string, content: string }
}

공통 규칙:
- 사용자가 허브에서 직접 말하거나 입력한 내용(input_text)을 가장 중요한 근거로 사용
- 이전 대화에서 반복된 증상, 불편함, 원하는 케어 모드를 우선 반영
- 허브 응답(reply), 감지 모드(mode), 신호(signals)는 사용자 발화의 문맥을 확인하는 보조 정보로만 사용
- 제공되지 않은 증상이나 상황을 추측하지 않기
- 진단이나 치료 지시 대신 생활 케어와 휴식 중심으로 안내

wife 카드 규칙:
- title: '🌸 N주차 오늘의 조언'
- content: 임신 주차 정보와 최근 허브 대화를 연결한 오늘 하루 조언 (150자 내외, 따뜻한 말투)

husband 카드 규칙:
- title: '👨 오늘 아내 케어 미션'
- content: 최근 허브 대화에서 드러난 불편함을 직접 노출하지 않으면서 남편이 할 수 있는 구체적인 행동 제안 (150자 내외)

허브 대화 기록이 없으면 임신 주차 기반의 일반적인 생활 케어 조언을 생성하세요.`

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

function getThirtyDaysAgoISO() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function normalizeWifeCardTitle(title: string, weeksPregnant: number) {
  if (/\d+주차/.test(title)) {
    return title.replace(/\d+주차/, `${weeksPregnant}주차`)
  }
  return title
}

function parseCards(content: string, weeksPregnant: number): DailyCareCards {
  try {
    const parsed = JSON.parse(content) as Partial<DailyCareCards>
    const defaultWifeTitle = `🌸 ${weeksPregnant}주차 오늘의 조언`
    const defaultHusbandTitle = '👨 오늘 아내 케어 미션'

    return {
      wife: {
        title: normalizeWifeCardTitle(parsed.wife?.title ?? defaultWifeTitle, weeksPregnant),
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

export async function runDailyCare(options?: { weeks?: number }) {
  const apiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

  if (!apiKey || !supabaseUrl || !supabaseKey || !demoWifeId) {
    throw new Error('필수 환경 변수가 설정되지 않았습니다.')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const cardDate = getTodayDateString()
  const thirtyDaysAgo = getThirtyDaysAgoISO()

  const weeksFromOptions = options?.weeks

  const [weekResult, conversationResult] = await Promise.all([
    resolveServerPregnancyWeek(supabase, { weeks: weeksFromOptions }),
    supabase
      .from('mode_runs')
      .select('input_text, mode, mode_label, signals, reply, source, created_at')
      .eq('user_id', demoWifeId)
      .in('source', HUB_CONVERSATION_SOURCES)
      .not('input_text', 'is', null)
      .neq('input_text', '')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(MAX_HUB_CONVERSATIONS),
  ])

  if (conversationResult.error) {
    throw new Error(`mode_runs 허브 대화 조회 실패: ${conversationResult.error.message}`)
  }

  const weeksPregnant = weekResult.weeksPregnant
  const dueDate = weekResult.dueDate

  const hubConversations = conversationResult.data ?? []

  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `임신 주차: ${weeksPregnant}주${dueDate ? `\ndue_date: ${dueDate}` : ''}

최근 30일 허브 대화 기록 (최신순, 최대 ${MAX_HUB_CONVERSATIONS}개):
${JSON.stringify(hubConversations, null, 2)}`,
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
