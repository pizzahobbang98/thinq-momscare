import { controlAirPurifier, parseControlCommand } from '@/lib/thinq'
import { getThinQEnvDiagnostics, logThinQEnvDiagnostics } from '@/lib/thinq-debug'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { command?: unknown; hubMode?: string; routineId?: string }

    if (body.command === undefined) {
      return NextResponse.json({ error: 'command가 필요합니다.' }, { status: 400 })
    }

    logThinQEnvDiagnostics('api/thinq/control')

    console.log('[api/thinq/control] request:', {
      command: body.command,
      hubMode: body.hubMode,
      routineId: body.routineId,
      env: getThinQEnvDiagnostics(),
    })

    const command = parseControlCommand(body.command)
    const result = await controlAirPurifier(command)

    console.log('[api/thinq/control] response:', {
      success: result.success,
      mock: result.mock,
      fallback: result.fallback ?? false,
      uiMode: result.deviceStatus.uiMode,
      power: result.deviceStatus.power,
      mode: result.deviceStatus.mode,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '기기 제어에 실패했어요'
    console.error('[api/thinq/control] failed:', {
      message,
      env: getThinQEnvDiagnostics(),
    })
    return NextResponse.json({ error: message, success: false }, { status: 500 })
  }
}
