import { NextResponse } from 'next/server'
import { controlAirPurifier, parseControlCommand } from '@/lib/thinq'
import { handleLocalLightRequest, type LocalLightAction } from '@/lib/light-local-proxy'
import { markCommandOnce, logCommandEvent } from '@/lib/command-idempotency'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type DemoCommandRequest = {
  commandId?: unknown
  sourceDeviceId?: unknown
  sourceScreen?: unknown
  commandType?: unknown
  mode?: unknown
  deviceAction?: unknown
  userStatus?: unknown
  userRole?: unknown
  responseText?: unknown
  createdAt?: unknown
  airCommand?: unknown
  lightAction?: unknown
  hueMode?: unknown
  restoreHueMode?: unknown
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function buildLightRequest(action: LocalLightAction, body: Record<string, unknown>) {
  return new Request('http://thinq-mom.local/api/light/' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function executeLightCommand(input: {
  commandId?: string
  sourceScreen?: string
  sourceDeviceId?: string
  lightAction?: string
  hueMode?: string
  restoreHueMode?: string
}) {
  const action = input.lightAction === 'off'
    ? 'off'
    : input.lightAction === 'on'
      ? 'on'
      : input.hueMode
        ? 'mode'
        : null

  if (!action) return null

  logCommandEvent('[device] hue api called once', {
    commandId: input.commandId,
    sourceScreen: input.sourceScreen,
    commandType: 'device',
    mode: input.hueMode ?? input.restoreHueMode ?? null,
    deviceAction: action,
    deviceApi: true,
  })

  const request = buildLightRequest(action, {
    mode: action === 'off' ? undefined : input.hueMode ?? input.restoreHueMode,
    effect: 'solid',
    source: input.sourceScreen ?? input.sourceDeviceId ?? 'demo-command',
    commandId: input.commandId,
  })
  const response = await handleLocalLightRequest(action, request)
  return response.json().catch(() => ({ ok: response.ok }))
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as DemoCommandRequest
  const commandId = stringValue(body.commandId)
  const sourceDeviceId = stringValue(body.sourceDeviceId)
  const sourceScreen = stringValue(body.sourceScreen)
  const commandType = stringValue(body.commandType)
  const mode = stringValue(body.mode)
  const deviceAction = stringValue(body.deviceAction)
  const airCommand = stringValue(body.airCommand)
  const lightAction = stringValue(body.lightAction)
  const hueMode = stringValue(body.hueMode)
  const restoreHueMode = stringValue(body.restoreHueMode)

  logCommandEvent('[command] received', {
    commandId,
    sourceScreen,
    commandType,
    mode,
    deviceAction,
    tts: false,
    deviceApi: Boolean(airCommand || lightAction || hueMode || restoreHueMode),
  })

  if (!markCommandOnce('command:pipeline', commandId)) {
    logCommandEvent('[command] skipped duplicate', {
      commandId,
      sourceScreen,
      commandType,
      mode,
      deviceAction,
      duplicate: true,
    })
    return NextResponse.json({ success: true, skippedDuplicate: true, commandId })
  }

  const deviceResults: Record<string, unknown> = {}

  if (airCommand) {
    if (!markCommandOnce('device:air-purifier', commandId)) {
      logCommandEvent('[command] skipped duplicate', {
        commandId,
        sourceScreen,
        commandType: 'device',
        mode,
        deviceAction: airCommand,
        duplicate: true,
      })
    } else {
      logCommandEvent('[device] air purifier api called once', {
        commandId,
        sourceScreen,
        commandType: 'device',
        mode,
        deviceAction: airCommand,
        deviceApi: true,
      })
      const result = await controlAirPurifier(parseControlCommand(airCommand))
      deviceResults.airPurifier = result
    }
  }

  if (lightAction || hueMode || restoreHueMode) {
    deviceResults.light = await executeLightCommand({
      commandId,
      sourceScreen,
      sourceDeviceId,
      lightAction,
      hueMode,
      restoreHueMode,
    })
  }

  return NextResponse.json({
    success: true,
    skippedDuplicate: false,
    commandId,
    sourceDeviceId,
    sourceScreen,
    commandType,
    mode,
    userStatus: stringValue(body.userStatus),
    userRole: stringValue(body.userRole),
    responseText: stringValue(body.responseText),
    createdAt: stringValue(body.createdAt),
    deviceResults,
  })
}
