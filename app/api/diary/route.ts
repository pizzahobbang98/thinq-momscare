import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `당신은 임산부 본인입니다.
오늘 하루 동안 있었던 증상과 기기 사용 기록을 바탕으로
내가 직접 쓴 것처럼 일기를 작성해주세요.

규칙:
- 반드시 1인칭 (나는, 오늘 나는, 오늘은)으로 시작
- 200자 내외
- 친구한테 카톡하는 것처럼 자연스럽고 솔직한 말투
- AI 느낌, 조언, 격려 문장 절대 금지
- 오늘 증상, 태동, 기기 사용을 자연스럽게 녹여내기
- 데이터 없으면 '오늘은 별일 없이 조용하게 보냈다. 그냥 쉬었어.' 반환

나쁜 예: '오늘도 건강하게 지내셨나요? 입덧이 심하셨군요!'
좋은 예: '오늘 입덧이 너무 심해서 공기청정기 켰는데 좀 나아진 것 같기도 하고..'`

const EMPTY_DIARY = '오늘은 별일 없이 조용하게 보냈다. 그냥 쉬었어.'

function getDayRange(dateIso: string) {
  const start = new Date(dateIso)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
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

    const body = (await request.json()) as { date?: string }
    const date = body.date?.trim()

    if (!date) {
      return NextResponse.json({ error: '날짜가 없습니다.' }, { status: 400 })
    }

    const { start, end } = getDayRange(date)
    const supabase = createClient(supabaseUrl, supabaseKey)

    const [symptomResult, deviceResult] = await Promise.all([
      supabase
        .from('symptom_logs')
        .select('symptom_text, parsed_category, severity, advice, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', { ascending: true }),
      supabase
        .from('device_events')
        .select('event_type, triggered_by, device_status, created_at')
        .eq('user_id', demoWifeId)
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', { ascending: true }),
    ])

    if (symptomResult.error) {
      console.error('symptom_logs 조회 실패:', symptomResult.error)
      return NextResponse.json({ error: '증상 기록 조회 실패' }, { status: 500 })
    }

    if (deviceResult.error) {
      console.error('device_events 조회 실패:', deviceResult.error)
      return NextResponse.json({ error: '기기 이벤트 조회 실패' }, { status: 500 })
    }

    const symptomLogs = symptomResult.data ?? []
    const deviceEvents = deviceResult.data ?? []

    let diary: string

    if (symptomLogs.length === 0 && deviceEvents.length === 0) {
      diary = EMPTY_DIARY
    } else {
      const openai = new OpenAI({ apiKey })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `오늘 날짜: ${start}

증상 기록:
${JSON.stringify(symptomLogs, null, 2)}

기기 이벤트:
${JSON.stringify(deviceEvents, null, 2)}`,
          },
        ],
      })

      const generated = completion.choices[0]?.message?.content?.trim()
      if (!generated) {
        return NextResponse.json({ error: '일기 생성 실패' }, { status: 500 })
      }

      diary = generated
    }

    const { error: insertError } = await supabase.from('symptom_logs').insert({
      user_id: demoWifeId,
      symptom_text: diary,
      parsed_category: 'AUTO_DIARY',
    })

    if (insertError) {
      console.error('AUTO_DIARY 저장 실패:', insertError)
      return NextResponse.json({ error: '일기 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ diary })
  } catch (error) {
    console.error('일기 생성 API 처리 실패:', error)
    return NextResponse.json({ error: '일기 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
