import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { routeMode } from '@/lib/ai-mode-router'
import { executeModeActions, type DeviceAction } from '@/lib/mode-actions'
import { textToSpeech } from '@/lib/elevenlabs'

type ExecuteRequestBody = {
  text?: string
  source?: string
  pregnancyWeek?: number
}

function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  }

  return createClient(supabaseUrl, supabaseKey)
}

function isValidPregnancyWeek(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 42
}

export async function POST(request: Request) {
  try {
    const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID
    if (!demoWifeId) {
      return NextResponse.json({ error: 'DEMO_WIFE_ID가 설정되지 않았습니다.' }, { status: 500 })
    }

    const body = (await request.json().catch(() => ({}))) as ExecuteRequestBody
    const text = body.text?.trim()
    const source = body.source?.trim() || 'mother_together'

    if (!text) {
      return NextResponse.json({ error: 'text가 필요합니다.' }, { status: 400 })
    }

    if (body.pregnancyWeek !== undefined && !isValidPregnancyWeek(body.pregnancyWeek)) {
      return NextResponse.json({ error: 'pregnancyWeek는 1~42 사이의 정수여야 합니다.' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const modeResult = await routeMode({
      text,
      pregnancyWeek: body.pregnancyWeek,
    })
    const deviceResults: DeviceAction[] = await executeModeActions(modeResult.mode)

    const { error: modeRunError } = await supabase.from('mode_runs').insert({
      user_id: demoWifeId,
      mode: modeResult.mode,
      mode_label: modeResult.modeLabel,
      source,
      input_text: text,
      signals: modeResult.signals,
      reply: modeResult.reply,
      wife_card: modeResult.wifeCard,
      husband_card: modeResult.husbandCard,
      device_results: deviceResults,
    })

    if (modeRunError) {
      console.warn('[mother-together] mode_runs INSERT failed:', modeRunError)
    }

    const { error: messageError } = await supabase.from('messages').insert({
      from_role: 'system',
      content: modeResult.husbandCard,
    })

    if (messageError) {
      console.warn('[mother-together] messages INSERT failed:', messageError)
    }

    const audioBase64 = await textToSpeech(modeResult.reply)

    return NextResponse.json({
      success: true,
      mode: modeResult.mode,
      modeLabel: modeResult.modeLabel,
      signals: modeResult.signals,
      reply: modeResult.reply,
      audioBase64,
      wifeCard: modeResult.wifeCard,
      husbandCard: modeResult.husbandCard,
      deviceResults,
    })
  } catch (error) {
    console.error('[mother-together] execute failed:', error)
    return NextResponse.json(
      { error: '모드 실행 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
