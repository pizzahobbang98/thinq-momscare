import { NextResponse } from 'next/server'
import { markCommandOnce, logCommandEvent } from '@/lib/command-idempotency'
import { applyHueScene, buildHuePalettePreview } from '@/lib/hue'
import { getHuePreset, isHueMode, type HueMode } from '@/lib/hue-presets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type HueSceneRequest = {
  mode?: unknown
  source?: unknown
  commandId?: unknown
}

function buildInvalidModeResponse(mode: unknown) {
  return NextResponse.json(
    {
      success: false,
      enabled: process.env.HUE_ENABLED === 'true' || process.env.HUE_ENABLED === '1',
      mock: true,
      error: `Unsupported Hue mode: ${String(mode ?? '')}`,
    },
    { status: 400 },
  )
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as HueSceneRequest
  const mode = body.mode

  if (!isHueMode(mode)) {
    return buildInvalidModeResponse(mode)
  }

  const source = typeof body.source === 'string' ? body.source : 'unknown'
  const commandId = typeof body.commandId === 'string' ? body.commandId : undefined

  logCommandEvent('[command] received', {
    commandId,
    sourceScreen: source,
    commandType: 'device',
    mode,
    deviceAction: 'hue_scene',
    deviceApi: true,
  })

  if (!markCommandOnce('device:hue', commandId)) {
    logCommandEvent('[command] skipped duplicate', {
      commandId,
      sourceScreen: source,
      commandType: 'device',
      mode,
      deviceAction: 'hue_scene',
      duplicate: true,
    })
    return NextResponse.json({
      success: true,
      skippedDuplicate: true,
      source,
      commandId,
      appliedMode: mode,
    })
  }

  try {
    logCommandEvent('[device] hue api called once', {
      commandId,
      sourceScreen: source,
      commandType: 'device',
      mode,
      deviceAction: 'hue_scene',
      deviceApi: true,
    })
    const result = await applyHueScene(mode)
    return NextResponse.json({
      ...result,
      source,
      commandId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const preset = getHuePreset(mode as HueMode)
    const palettePreview = buildHuePalettePreview(mode)

    console.warn('[api/hue/scene] failed:', { mode, source, commandId, error: message })

    return NextResponse.json({
      success: false,
      enabled: process.env.HUE_ENABLED === 'true' || process.env.HUE_ENABLED === '1',
      mock: true,
      fallback: true,
      appliedMode: mode,
      brightness: preset.brightness,
      effectSteps: palettePreview.length,
      effectStepMs: preset.effectStepMs,
      palettePreview,
      appliedLights: [],
      errors: [message],
      source,
      commandId,
    })
  }
}
