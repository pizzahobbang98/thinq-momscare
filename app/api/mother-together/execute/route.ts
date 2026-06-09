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

function getTriggeredBy(source: string) {
  const normalizedSource = source.toLowerCase()
  if (normalizedSource.includes('voice')) return 'VOICE'
  if (normalizedSource.includes('text') || normalizedSource.includes('chip')) return 'APP'
  return source.toUpperCase()
}

function getDeviceEventType(mode: string, action: DeviceAction) {
  if (mode === 'AIR_OFF' || action.thinqCommand === 'POWER_OFF') return 'AIR_OFF'
  if (action.thinqCommand === 'POWER_ON') return 'AIR_ON'
  return mode
}

function buildDeviceEventRows(
  mode: string,
  source: string,
  demoWifeId: string | undefined,
  deviceResults: DeviceAction[],
) {
  return deviceResults
    .filter((action) => action.status === 'actual' && action.deviceStatus)
    .map((action) => ({
      ...(demoWifeId ? { user_id: demoWifeId } : {}),
      event_type: getDeviceEventType(mode, action),
      triggered_by: getTriggeredBy(source),
      device_status: {
        power: action.deviceStatus?.power ?? 'UNKNOWN',
        mode: action.deviceStatus?.uiMode ?? action.deviceStatus?.mode ?? 'UNKNOWN',
        pm25: action.deviceStatus?.pm25 ?? 0,
      },
    }))
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

    console.log('[mother-together/execute] request:', {
      text,
      source,
      pregnancyWeek: body.pregnancyWeek,
    })

    const modeResult = await routeMode(text, body.pregnancyWeek)

    console.log('[mother-together/execute] routed mode:', {
      mode: modeResult.mode,
      modeLabel: modeResult.modeLabel,
      signals: modeResult.signals,
      confidence: modeResult.confidence,
    })

    if (modeResult.mode === 'MORNING_BRIEFING') {
      return NextResponse.json({
        success: true,
        redirect: true,
        type: 'MORNING_BRIEFING',
      })
    }

    const deviceResults: DeviceAction[] = await executeModeActions(modeResult.mode)

    console.log('[mother-together/execute] device action results:', deviceResults.map((action) => ({
      device: action.device,
      action: action.action,
      thinqCommand: action.thinqCommand,
      status: action.status,
      success: action.success,
      executionStatus: action.executionStatus,
      fallback: action.fallback,
    })))

    try {
      const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID
      const supabase = createServerSupabaseClient()
      const deviceEventRows = buildDeviceEventRows(modeResult.mode, source, demoWifeId, deviceResults)

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
      } else {
        console.log('[mother-together/execute] mode_runs INSERT success:', {
          mode: modeResult.mode,
          source,
        })
      }

      if (deviceEventRows.length > 0) {
        console.log('[mother-together/execute] device_events INSERT start:', deviceEventRows)
        const { error: deviceEventError } = await supabase.from('device_events').insert(deviceEventRows)

        if (deviceEventError) {
          console.warn('[thinq-mom] device_events INSERT failed:', deviceEventError)
        } else {
          console.log('[mother-together/execute] device_events INSERT success:', {
            count: deviceEventRows.length,
            eventTypes: deviceEventRows.map((row) => row.event_type),
          })
        }
      } else {
        console.log('[mother-together/execute] device_events INSERT skipped: no actual device status')
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

    console.log('[mother-together/execute] response ready:', {
      mode: modeResult.mode,
      deviceResultCount: deviceResults.length,
      hasAudio: Boolean(audioBase64),
    })

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
