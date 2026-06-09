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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function safeTextToSpeech(text: string) {
  try {
    return await textToSpeech(text)
  } catch (error) {
    console.warn('[thinq-mom] TTS skipped:', error)
    return ''
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ExecuteRequestBody
    const text = body.text?.trim()
    const source = body.source?.trim() || 'hub'

    if (!text) {
      return NextResponse.json({ error: 'text가 필요합니다.' }, { status: 400 })
    }

    if (body.pregnancyWeek !== undefined && !isValidPregnancyWeek(body.pregnancyWeek)) {
      return NextResponse.json({ error: 'pregnancyWeek는 1~42 사이의 정수여야 합니다.' }, { status: 400 })
    }

    const modeResult = await routeMode(text, body.pregnancyWeek)

    if (modeResult.mode === 'MORNING_BRIEFING') {
      return NextResponse.json({
        success: true,
        redirect: true,
        type: 'MORNING_BRIEFING',
      })
    }

    const deviceResults: DeviceAction[] = await executeModeActions(modeResult.mode)

    try {
      const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID
      const supabase = createServerSupabaseClient()
      const { error: modeRunError } = await supabase.from('mode_runs').insert({
        ...(demoWifeId ? { user_id: demoWifeId } : {}),
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
        console.warn('[thinq-mom] mode_runs INSERT failed:', modeRunError)
      }

      const { error: messageError } = await supabase.from('messages').insert({
        from_role: 'system',
        content: modeResult.husbandCard,
      })

      if (messageError) {
        console.warn('[thinq-mom] messages INSERT failed:', messageError)
      }
    } catch (error) {
      console.warn('[thinq-mom] Supabase write skipped:', getErrorMessage(error))
    }

    const audioBase64 = await safeTextToSpeech(modeResult.reply)

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
    console.error('[thinq-mom] execute failed:', error)
    return NextResponse.json(
      { error: 'ThinQ Mom 모드 실행 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
