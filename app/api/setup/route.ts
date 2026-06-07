import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const CHECKUP_SCHEDULE = [
  { week: 6, title: '첫 초음파', memo: '심박 확인' },
  { week: 11, title: '1차 기형아 검사', memo: 'NT 검사 (목덜미 투명대)' },
  { week: 16, title: '2차 기형아 검사', memo: '쿼드 검사 (AFP)' },
  { week: 20, title: '정밀 초음파', memo: '태아 기형 정밀 검사' },
  { week: 24, title: '임신성 당뇨 검사', memo: '50g 당부하 검사' },
  { week: 28, title: '빈혈·철분 검사', memo: '철분제 처방' },
  { week: 32, title: '태아 성장 초음파', memo: '태아 위치·체중 확인' },
  { week: 36, title: 'GBS 검사', memo: '분만 준비 시작' },
  { week: 38, title: '정기검진 (38주)', memo: '매주 정기검진 시작' },
  { week: 39, title: '정기검진 (39주)', memo: '' },
  { week: 40, title: '정기검진 (40주)', memo: '예정일' },
] as const

const AI_HOSPITAL_LABEL = 'AI 자동 생성'

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

function toLocalDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function calculateDueDate(weeks: number) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (40 - weeks) * 7)
  return dueDate.toISOString().split('T')[0]
}

async function generateCheckupAppointments(
  supabase: SupabaseClient,
  weeks: number,
  wifeId: string,
): Promise<number> {
  try {
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('user_id', wifeId)
      .eq('hospital', AI_HOSPITAL_LABEL)

    if (deleteError) {
      console.error('AI 검진 일정 삭제 실패:', deleteError)
      return 0
    }

    const today = new Date()
    const appointmentsToInsert = CHECKUP_SCHEDULE.filter((checkup) => checkup.week > weeks).map(
      (checkup) => {
        const daysUntil = (checkup.week - weeks) * 7
        const checkupDate = new Date(today)
        checkupDate.setDate(today.getDate() + daysUntil)

        return {
          user_id: wifeId,
          title: checkup.title,
          hospital: AI_HOSPITAL_LABEL,
          memo: checkup.memo || null,
          appointment_date: toLocalDateString(checkupDate),
        }
      },
    )

    if (appointmentsToInsert.length === 0) {
      return 0
    }

    const { error: insertError } = await supabase
      .from('appointments')
      .insert(appointmentsToInsert)

    if (insertError) {
      console.error('AI 검진 일정 생성 실패:', insertError)
      return 0
    }

    return appointmentsToInsert.length
  } catch (error) {
    console.error('AI 검진 일정 생성 처리 실패:', error)
    return 0
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('필수 환경 변수가 설정되지 않았습니다.')
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    const body = (await request.json()) as { weeks?: number }
    const weeks = body.weeks

    if (
      weeks === undefined ||
      !Number.isInteger(weeks) ||
      weeks < 1 ||
      weeks > 42
    ) {
      return NextResponse.json({ error: '유효한 임신 주차가 필요합니다.' }, { status: 400 })
    }

    const dueDate = calculateDueDate(weeks)
    const cardDate = getTodayDateString()
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error: updateError } = await supabase
      .from('users')
      .update({ due_date: dueDate })
      .eq('role', 'wife')

    if (updateError) {
      console.error('due_date 업데이트 실패:', updateError)
      return NextResponse.json({ error: '임신 예정일 저장 실패' }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from('daily_cards')
      .delete()
      .eq('card_date', cardDate)

    if (deleteError) {
      console.error('daily_cards 삭제 실패:', deleteError)
      return NextResponse.json({ error: '케어 카드 초기화 실패' }, { status: 500 })
    }

    let checkupsCreated = 0
    const wifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

    if (!wifeId) {
      console.error('NEXT_PUBLIC_DEMO_WIFE_ID가 설정되지 않았습니다.')
    } else {
      checkupsCreated = await generateCheckupAppointments(supabase, weeks, wifeId)
    }

    return NextResponse.json({ success: true, checkupsCreated })
  } catch (error) {
    console.error('온보딩 설정 API 처리 실패:', error)
    return NextResponse.json({ error: '설정 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
