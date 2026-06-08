import { getDeviceState } from '@/lib/thinq'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const state = await getDeviceState()

    return NextResponse.json({
      power: state.power,
      mode: state.mode,
      fanSpeed: state.fanSpeed,
      pm25: state.pm25,
      mock: state.mock,
      fallback: state.fallback ?? false,
    })
  } catch (error) {
    console.error('ThinQ state API 실패:', error)
    return NextResponse.json({ error: '기기 상태 조회에 실패했어요' }, { status: 500 })
  }
}
