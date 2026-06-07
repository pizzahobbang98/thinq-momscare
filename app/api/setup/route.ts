import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

function calculateDueDate(weeks: number) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (40 - weeks) * 7)
  return dueDate.toISOString().split('T')[0]
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('온보딩 설정 API 처리 실패:', error)
    return NextResponse.json({ error: '설정 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
