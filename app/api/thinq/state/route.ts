import { getDeviceState } from '@/lib/thinq'
import { summarizeThinQErrorText } from '@/lib/thinq-errors'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('[api/thinq/state] fetching device state…')
    const state = await getDeviceState()

    const response = {
      power: state.power,
      mode: state.mode,
      jobMode: state.jobMode,
      fanSpeed: state.fanSpeed,
      pm25: state.pm25,
      uiMode: state.uiMode,
      mock: state.mock,
      fallback: state.fallback ?? false,
      error: state.error,
    }

    console.log('[api/thinq/state] response:', {
      power: response.power,
      mode: response.mode,
      jobMode: response.jobMode,
      fanSpeed: response.fanSpeed,
      uiMode: response.uiMode,
      pm25: response.pm25,
      fallback: response.fallback,
    })

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : '기기 상태 조회에 실패했어요'
    console.warn('[api/thinq/state] failed, returning mock fallback:', summarizeThinQErrorText(message))

    try {
      const state = await getDeviceState()
      return NextResponse.json({
        power: state.power,
        mode: state.mode,
        jobMode: state.jobMode,
        fanSpeed: state.fanSpeed,
        pm25: state.pm25,
        uiMode: state.uiMode,
        mock: state.mock,
        fallback: true,
        error: state.error ?? message,
      })
    } catch {
      return NextResponse.json(
        {
          power: 'ON',
          mode: 'NORMAL',
          pm25: 12,
          uiMode: 'ON',
          mock: true,
          fallback: true,
          error: message,
        },
        { status: 200 },
      )
    }
  }
}
