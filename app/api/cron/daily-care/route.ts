import { NextResponse } from 'next/server'
import { runDailyCare } from '@/lib/daily-care'

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('CRON_SECRET이 설정되지 않았습니다.')
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    if (request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await runDailyCare()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('daily-care cron 실패:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'daily-care 실행 실패' },
      { status: 500 },
    )
  }
}
