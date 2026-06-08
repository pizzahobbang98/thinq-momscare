import { controlAirPurifier, parseControlCommand } from '@/lib/thinq'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { command?: unknown }

    if (body.command === undefined) {
      return NextResponse.json({ error: 'command가 필요합니다.' }, { status: 400 })
    }

    const command = parseControlCommand(body.command)
    const result = await controlAirPurifier(command)

    return NextResponse.json(result)
  } catch (error) {
    console.error('ThinQ control API 실패:', error)
    return NextResponse.json({ error: '기기 제어에 실패했어요' }, { status: 500 })
  }
}
