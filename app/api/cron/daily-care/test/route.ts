import { NextResponse } from 'next/server'
import { runDailyCare } from '@/lib/daily-care'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '개발 환경에서만 사용 가능합니다.' }, { status: 403 })
  }

  try {
    const result = await runDailyCare()

    return NextResponse.json(result)
  } catch (error) {
    console.error('daily-care test 실패:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'daily-care 테스트 실행 실패' },
      { status: 500 },
    )
  }
}
