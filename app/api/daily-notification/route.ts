import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateCurrentWeeksFromDueDate } from '@/lib/pregnancy'

type NotificationRole = 'wife' | 'husband'

type DailyNotificationRequestBody = {
  role?: NotificationRole
  pregnancyWeek?: number
}

type DailyNotificationResult = {
  title: string
  message: string
  emoji: string
  week: number
}

const SYSTEM_PROMPT = `임산부 케어 AI입니다.
아래 데이터를 바탕으로 오늘의 알림을 생성하세요.

role이 wife이면:
- 오늘 임신 주차에 맞는 꿀팁 1가지
- 최근 ThinQ ON 대화에서 감지된 증상 기반 조언
- 따뜻하고 공감하는 말투
- 2~3문장 이내

role이 husband이면:
- 오늘 아내 상황 기반으로 남편이 해주면 좋을 행동 1~2가지
- 구체적인 행동 중심 (감시가 아닌 배려)
- 2~3문장 이내

JSON만 반환:
{
  "title": string (짧은 제목 10자 이내),
  "message": string (본문 2~3문장),
  "emoji": string (대표 이모지 1개),
  "week": number
}`

const DEFAULT_PREGNANCY_WEEK = 12

function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  }

  return createClient(supabaseUrl, supabaseKey)
}

function getSevenDaysAgoISO() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function isValidPregnancyWeek(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 42
}

function isValidRole(value: unknown): value is NotificationRole {
  return value === 'wife' || value === 'husband'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function extractJsonObject(content: string) {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const match = trimmed.match(/\{[\s\S]*\}/)
  return match?.[0] ?? trimmed
}

function buildFallbackNotification(role: NotificationRole, week: number): DailyNotificationResult {
  if (role === 'wife') {
    return {
      title: '오늘의 꿀팁',
      message: `임신 ${week}주차예요. 오늘은 무리하지 말고 몸의 신호를 먼저 살펴보세요. 필요하면 ThinQ ON에 편하게 말해주세요.`,
      emoji: '🌸',
      week,
    }
  }

  return {
    title: '오늘의 배려',
    message: `임신 ${week}주차인 오늘, 아내 컨디션을 먼저 물어보고 집안일을 가볍게 나눠주면 좋아요.`,
    emoji: '💙',
    week,
  }
}

function parseNotificationResult(
  content: string,
  role: NotificationRole,
  pregnancyWeek: number,
): DailyNotificationResult {
  const fallback = buildFallbackNotification(role, pregnancyWeek)

  try {
    const parsed = JSON.parse(extractJsonObject(content)) as Partial<DailyNotificationResult>
    const week = isValidPregnancyWeek(parsed.week) ? parsed.week : pregnancyWeek

    return {
      title: parsed.title?.trim().slice(0, 10) || fallback.title,
      message: parsed.message?.trim() || fallback.message,
      emoji: parsed.emoji?.trim() || fallback.emoji,
      week,
    }
  } catch {
    return fallback
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as DailyNotificationRequestBody
    const role = body.role
    const requestedWeek = body.pregnancyWeek

    if (!isValidRole(role)) {
      return NextResponse.json({ error: 'role은 wife 또는 husband여야 합니다.' }, { status: 400 })
    }

    if (requestedWeek !== undefined && !isValidPregnancyWeek(requestedWeek)) {
      return NextResponse.json({ error: 'pregnancyWeek는 1~42 사이의 정수여야 합니다.' }, { status: 400 })
    }

    const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID
    if (!demoWifeId) {
      return NextResponse.json({ error: '서버 환경 변수가 설정되지 않았습니다.' }, { status: 500 })
    }

    let supabase: ReturnType<typeof createServerSupabaseClient> | null = null
    try {
      supabase = createServerSupabaseClient()
    } catch (error) {
      console.warn('[daily-notification] Supabase client unavailable:', getErrorMessage(error))
    }

    const sevenDaysAgo = getSevenDaysAgoISO()
    let modeRuns: unknown[] = []
    let symptomLogs: unknown[] = []
    let dueDate: string | undefined

    if (supabase) {
      const [modeRunsResult, symptomLogsResult, userResult] = await Promise.all([
        supabase
          .from('mode_runs')
          .select('mode, mode_label, signals, reply, created_at')
          .eq('user_id', demoWifeId)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false }),
        supabase
          .from('symptom_logs')
          .select('symptom_text, parsed_category, created_at')
          .eq('user_id', demoWifeId)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false }),
        requestedWeek
          ? Promise.resolve({ data: null, error: null })
          : supabase.from('users').select('due_date').eq('role', 'wife').maybeSingle(),
      ])

      if (modeRunsResult.error) {
        console.warn('[daily-notification] mode_runs 조회 실패:', modeRunsResult.error)
      } else {
        modeRuns = modeRunsResult.data ?? []
      }

      if (symptomLogsResult.error) {
        console.warn('[daily-notification] symptom_logs 조회 실패:', symptomLogsResult.error)
      } else {
        symptomLogs = symptomLogsResult.data ?? []
      }

      if (userResult.error) {
        console.warn('[daily-notification] users 조회 실패:', userResult.error)
      } else {
        dueDate = (userResult.data as { due_date?: string } | null)?.due_date
      }
    }

    const pregnancyWeek =
      requestedWeek ??
      (dueDate ? calculateCurrentWeeksFromDueDate(dueDate) : DEFAULT_PREGNANCY_WEEK)

    if (!isValidPregnancyWeek(pregnancyWeek)) {
      return NextResponse.json({ error: 'pregnancyWeek를 계산할 수 없습니다.' }, { status: 400 })
    }

    let notification = buildFallbackNotification(role, pregnancyWeek)
    const apiKey = process.env.OPENAI_API_KEY

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
                role,
                pregnancyWeek,
                dueDate: dueDate ?? null,
                modeRuns,
                symptomLogs,
              }),
            },
          ],
          response_format: { type: 'json_object' },
        })

        const content = completion.choices[0]?.message?.content
        if (content) {
          notification = parseNotificationResult(content, role, pregnancyWeek)
        }
      } catch (error) {
        console.warn('[daily-notification] OpenAI generation failed, fallback used:', error)
      }
    } else {
      console.warn('[daily-notification] OPENAI_API_KEY missing, fallback used')
    }

    return NextResponse.json({
      success: true,
      title: notification.title,
      message: notification.message,
      emoji: notification.emoji,
      week: notification.week,
      role,
    })
  } catch (error) {
    console.error('[daily-notification] API failed:', error)
    return NextResponse.json(
      { error: '오늘의 알림 생성 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
