import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { routeMode, type Mode, type ModeRouterResult } from '@/lib/ai-mode-router'
import { executeModeActions, type DeviceAction } from '@/lib/mode-actions'
import {
  appendDemoSimulationDeviceResult,
  getSimulationScene,
  normalizeExecuteModeLabel,
} from '@/lib/demo-simulation'
import { textToSpeech } from '@/lib/elevenlabs'
import {
  buildSimulationTestModeSnapshot,
  type SimulationTestModeSlug,
} from '@/lib/simulation-test-mode-sync'
import {
  isSimulationRoutineId,
  isTravelDestination,
  type SimulationRoutineId,
  type TravelDestination,
} from '@/lib/simulation-routine-bridge'

type ExecuteRequestBody = {
  text?: string
  source?: string
  pregnancyWeek?: number
  careLogId?: string
  demoOverride?: {
    hubMode: 'NAUSEA_MODE' | 'SLEEP_MODE' | 'TRAVEL_MODE' | 'HOUSEWORK_MODE'
    routineId: SimulationRoutineId
    travelDestination?: TravelDestination | null
    simulationMode?: SimulationTestModeSlug
  }
}

type ExecuteResponseBody = {
  success: boolean
  partialSuccess?: boolean
  storageDelayed?: boolean
  redirect?: boolean
  type?: 'MORNING_BRIEFING'
  mode: string
  modeLabel: string
  confidence: number
  signals: string[]
  reason: string
  reply: string
  audioBase64?: string
  wifeCard: string
  husbandCard: string
  deviceResults: DeviceAction[]
  simulationScene: string | null
  simulationText: string | null
  demoUpdatedAt: string
  error?: string
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
  if (mode === 'AIR_ON' || action.thinqCommand === 'POWER_ON') return 'AIR_ON'
  return mode
}

function buildDeviceEventRows(
  mode: string,
  source: string,
  demoWifeId: string | undefined,
  deviceResults: DeviceAction[],
) {
  return deviceResults
    .filter((action) => action.status === 'actual' && action.deviceStatus && action.success !== false)
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

function hasActualDeviceFailure(deviceResults: DeviceAction[]) {
  return deviceResults.some((action) => action.status === 'actual' && action.success === false)
}

function buildExecuteResponse(
  modeResult: ModeRouterResult,
  deviceResultsForStorage: DeviceAction[],
  options: {
    audioBase64?: string
    partialSuccess?: boolean
    storageDelayed?: boolean
    error?: string
    redirect?: boolean
    type?: 'MORNING_BRIEFING'
  } = {},
): ExecuteResponseBody {
  const { simulationScene, simulationText } = getSimulationScene(modeResult.mode)
  const modeLabel = normalizeExecuteModeLabel(modeResult.mode, modeResult.modeLabel)
  const actualFailure = hasActualDeviceFailure(deviceResultsForStorage)

  return {
    success: options.error ? false : true,
    partialSuccess: options.partialSuccess ?? actualFailure,
    storageDelayed: options.storageDelayed,
    redirect: options.redirect,
    type: options.type,
    mode: modeResult.mode,
    modeLabel,
    confidence: modeResult.confidence,
    signals: modeResult.signals,
    reason: modeResult.reason,
    reply: modeResult.reply,
    audioBase64: options.audioBase64 ?? '',
    wifeCard: modeResult.wifeCard,
    husbandCard: modeResult.husbandCard,
    deviceResults: deviceResultsForStorage,
    simulationScene,
    simulationText,
    demoUpdatedAt: new Date().toISOString(),
    error: options.error,
  }
}

async function safeTextToSpeech(text: string) {
  try {
    return await textToSpeech(text)
  } catch (error) {
    console.warn('[thinq-mom] TTS skipped:', error)
    return ''
  }
}

async function safeRouteMode(text: string, pregnancyWeek?: number): Promise<ModeRouterResult> {
  try {
    return await routeMode(text, pregnancyWeek)
  } catch (error) {
    console.warn('[thinq-mom] mode routing failed, using UNKNOWN fallback:', error)
    return {
      mode: 'UNKNOWN',
      modeLabel: '다시 말해주세요',
      confidence: 0,
      signals: [],
      reason: '모드 분류 중 오류가 발생했어요.',
      reply: '조금 더 구체적으로 말해주시면 케어 모드를 찾아볼게요.',
      wifeCard: '아직 실행할 케어 모드를 찾지 못했어요.',
      husbandCard: '오늘 필요한 배려가 생기면 여기에서 알려드릴게요.',
    }
  }
}

function isExampleChipSource(source: string) {
  return source.toLowerCase().includes('example_chip') || source.toLowerCase().includes('chip')
}

function buildDemoOverrideModeResult(
  override: NonNullable<ExecuteRequestBody['demoOverride']>,
): ModeRouterResult {
  const snapshot = buildSimulationTestModeSnapshot(override.routineId, 'hub-execute')
  if (override.simulationMode) {
    snapshot.slug = override.simulationMode
  }

  return {
    mode: override.hubMode as Mode,
    modeLabel: snapshot.modeLabel,
    confidence: 1,
    signals: snapshot.signals,
    reason: snapshot.reason,
    reply: snapshot.reply,
    wifeCard: snapshot.wifeCard,
    husbandCard: snapshot.husbandCard,
  }
}

function resolveDemoOverride(
  source: string,
  override: ExecuteRequestBody['demoOverride'],
): ExecuteRequestBody['demoOverride'] | null {
  if (!override || !isExampleChipSource(source)) return null
  if (!isSimulationRoutineId(override.routineId)) return null
  if (
    override.travelDestination !== undefined &&
    override.travelDestination !== null &&
    !isTravelDestination(override.travelDestination)
  ) {
    return null
  }
  return override
}

export async function POST(request: Request) {
  let text = ''
  let source = 'hub'

  try {
    const body = (await request.json().catch(() => ({}))) as ExecuteRequestBody
    text = body.text?.trim() ?? ''
    source = body.source?.trim() || 'hub'

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          mode: 'UNKNOWN',
          modeLabel: '다시 말해주세요',
          confidence: 0,
          signals: [],
          reason: '실행할 문장이 없어요.',
          reply: '실행할 문장을 입력하거나 예시 문장을 선택해주세요.',
          wifeCard: '',
          husbandCard: '',
          deviceResults: [],
          simulationScene: null,
          simulationText: null,
          demoUpdatedAt: new Date().toISOString(),
          error: 'text가 필요합니다.',
        } satisfies ExecuteResponseBody,
        { status: 400 },
      )
    }

    if (body.pregnancyWeek !== undefined && !isValidPregnancyWeek(body.pregnancyWeek)) {
      return NextResponse.json(
        {
          success: false,
          mode: 'UNKNOWN',
          modeLabel: '다시 말해주세요',
          confidence: 0,
          signals: [],
          reason: '임신 주차 정보가 올바르지 않아요.',
          reply: '임신 주차 정보를 확인한 뒤 다시 시도해주세요.',
          wifeCard: '',
          husbandCard: '',
          deviceResults: [],
          simulationScene: null,
          simulationText: null,
          demoUpdatedAt: new Date().toISOString(),
          error: 'pregnancyWeek는 1~42 사이의 정수여야 합니다.',
        } satisfies ExecuteResponseBody,
        { status: 400 },
      )
    }

    console.log('[mother-together/execute] request:', {
      text,
      source,
      pregnancyWeek: body.pregnancyWeek,
      demoOverride: body.demoOverride ?? null,
    })

    const demoOverride = resolveDemoOverride(source, body.demoOverride)
    const modeResult = demoOverride
      ? buildDemoOverrideModeResult(demoOverride)
      : await safeRouteMode(text, body.pregnancyWeek)

    console.log('[mother-together/execute] routed mode:', {
      mode: modeResult.mode,
      modeLabel: modeResult.modeLabel,
      signals: modeResult.signals,
      confidence: modeResult.confidence,
    })

    if (modeResult.mode === 'MORNING_BRIEFING') {
      return NextResponse.json(
        buildExecuteResponse(modeResult, [], {
          redirect: true,
          type: 'MORNING_BRIEFING',
        }),
      )
    }

    let deviceResults: DeviceAction[] = []
    try {
      deviceResults = await executeModeActions(modeResult.mode)
    } catch (error) {
      console.warn('[thinq-mom] device action execution failed:', error)
    }

    const deviceResultsForStorage = appendDemoSimulationDeviceResult(deviceResults, modeResult.mode)
    let storageDelayed = false

    try {
      const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID
      const supabase = createServerSupabaseClient()
      const deviceEventRows = buildDeviceEventRows(modeResult.mode, source, demoWifeId, deviceResults)
      const modeLabel = normalizeExecuteModeLabel(modeResult.mode, modeResult.modeLabel)

      const { error: modeRunError } = await supabase.from('mode_runs').upsert(
        {
          ...(body.careLogId ? { id: body.careLogId } : {}),
          ...(demoWifeId ? { user_id: demoWifeId } : {}),
          mode: modeResult.mode,
          mode_label: modeLabel,
          source,
          input_text: text,
          signals: modeResult.signals,
          reply: modeResult.reply,
          wife_card: modeResult.wifeCard,
          husband_card: modeResult.husbandCard,
          device_results: deviceResultsForStorage,
        },
        { onConflict: 'id' },
      )

      if (modeRunError) {
        storageDelayed = true
        console.warn('[thinq-mom] mode_runs INSERT failed:', modeRunError)
      } else {
        console.log('[mother-together/execute] mode_runs INSERT success:', {
          mode: modeResult.mode,
          source,
        })
      }

      if (deviceEventRows.length > 0) {
        const { error: deviceEventError } = await supabase.from('device_events').insert(deviceEventRows)

        if (deviceEventError) {
          storageDelayed = true
          console.warn('[thinq-mom] device_events INSERT failed:', deviceEventError)
        }
      }

      const { error: messageError } = await supabase.from('messages').insert({
        from_role: 'system',
        content: modeResult.husbandCard,
      })

      if (messageError) {
        storageDelayed = true
        console.warn('[thinq-mom] messages INSERT failed:', messageError)
      }
    } catch (error) {
      storageDelayed = true
      console.warn('[thinq-mom] Supabase write skipped:', getErrorMessage(error))
    }

    const audioBase64 = await safeTextToSpeech(modeResult.reply)
    const partialSuccess = hasActualDeviceFailure(deviceResultsForStorage)

    console.log('[mother-together/execute] response ready:', {
      mode: modeResult.mode,
      deviceResultCount: deviceResultsForStorage.length,
      hasAudio: Boolean(audioBase64),
      partialSuccess,
      storageDelayed,
    })

    return NextResponse.json(
      buildExecuteResponse(modeResult, deviceResultsForStorage, {
        audioBase64,
        partialSuccess,
        storageDelayed,
      }),
    )
  } catch (error) {
    console.warn('[thinq-mom] execute failed:', error)

    return NextResponse.json(
      buildExecuteResponse(
        {
          mode: 'UNKNOWN',
          modeLabel: '다시 말해주세요',
          confidence: 0,
          signals: [],
          reason: 'ThinQ Mom 실행 중 오류가 발생했어요.',
          reply: '지금은 실행이 어려워요. 잠시 후 다시 시도해주세요.',
          wifeCard: '아직 실행할 케어 모드를 찾지 못했어요.',
          husbandCard: '오늘 필요한 배려가 생기면 여기에서 알려드릴게요.',
        },
        [],
        {
          error: getErrorMessage(error),
        },
      ),
      { status: 200 },
    )
  }
}
