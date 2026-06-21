import { NextResponse } from 'next/server'
import { markCommandOnce, logCommandEvent } from '@/lib/command-idempotency'
import {
  HUE_LOCAL_REPRESENTATIVE_BRIGHTNESS,
  getHueLocalFallbackPath,
  getHueLocalRepresentativeColor,
  normalizeHueLocalMode,
  type HueLocalMode,
} from '@/lib/hue-local-modes'

export type LocalLightAction = 'on' | 'off' | 'mode'

export type LocalLightRequestBody = {
  mode?: unknown
  effect?: unknown
  source?: unknown
  commandId?: unknown
  originalMode?: unknown
  hex?: unknown
  color?: unknown
  colorHex?: unknown
  brightness?: unknown
}

type FastApiCallResult = {
  ok: boolean
  status: number
  method: 'POST'
  url: string
  path: string
  data: unknown
}

const HUE_LOCAL_TIMEOUT_MS = 12_000

function isHueLocalEnabled() {
  const value = process.env.HUE_LOCAL_ENABLED
  if (value === 'false' || value === '0') return false
  if (value === 'true' || value === '1') return true
  return Boolean(
    process.env.NEXT_PUBLIC_HUE_API_BASE_URL?.trim() ||
    process.env.MOTHER_HUE_CONTROL_URL?.trim()
  )
}

function getHueLocalConfig() {
  const baseUrl = (
    process.env.NEXT_PUBLIC_HUE_API_BASE_URL ??
    process.env.MOTHER_HUE_CONTROL_URL
  )?.trim()
  const apiKey = (
    process.env.MOTHER_HUE_CONTROL_API_KEY ??
    process.env.MOTHER_TOGETHER_API_KEY
  )?.trim()
  if (!baseUrl || !apiKey) return null
  return { baseUrl, apiKey }
}

function buildHueUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString()
}

function jsonResponse(body: Record<string, unknown>) {
  return NextResponse.json(body, { status: 200 })
}

async function postToHueFastApi(
  config: { baseUrl: string; apiKey: string },
  path: string,
  body: Record<string, unknown>,
): Promise<FastApiCallResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HUE_LOCAL_TIMEOUT_MS)

  try {
    const url = buildHueUrl(config.baseUrl, path)
    console.info('[api/light] Hue FastAPI request:', {
      method: 'POST',
      url,
      path,
    })
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(body),
    })
    const text = await response.text()
    let data: unknown = {}
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text.slice(0, 500) }
      }
    }
    return { ok: response.ok, status: response.status, method: 'POST', url, path, data }
  } finally {
    clearTimeout(timer)
  }
}

function shouldFallbackToIndividualEndpoint(result: FastApiCallResult) {
  return result.status === 404 || result.status === 405
}

async function callHueMode(
  config: { baseUrl: string; apiKey: string },
  mode: HueLocalMode,
  requestBody: {
    effect: string
    source: string
    commandId?: string
  },
) {
  const hex = getHueLocalRepresentativeColor(mode)
  const modeBody = {
    mode,
    effect: requestBody.effect,
    source: requestBody.source,
    commandId: requestBody.commandId,
    hex,
    color: hex,
    colorHex: hex,
    brightness: HUE_LOCAL_REPRESENTATIVE_BRIGHTNESS,
    brightnessPercent: HUE_LOCAL_REPRESENTATIVE_BRIGHTNESS,
  }

  const modeResult = await postToHueFastApi(config, '/api/v1/light/mode', modeBody)
  if (!shouldFallbackToIndividualEndpoint(modeResult)) return modeResult

  const fallbackPath = getHueLocalFallbackPath(mode)
  return postToHueFastApi(config, fallbackPath, modeBody)
}

async function callHuePowerOn(
  config: { baseUrl: string; apiKey: string },
  body: LocalLightRequestBody,
  requestBody: {
    effect: string
    source: string
    commandId?: string
  },
) {
  const powerResult = await postToHueFastApi(config, '/api/v1/light/on', {
    source: requestBody.source,
    commandId: requestBody.commandId,
  })
  if (isFailureResult(powerResult)) return powerResult

  const requestedMode = normalizeHueLocalMode(body.mode) ?? 'default'
  return callHueMode(config, requestedMode, {
    effect: 'solid',
    source: requestBody.source,
    commandId: requestBody.commandId,
  })
}

function isFailureResult(result: FastApiCallResult) {
  return !result.ok || Boolean(
    result.data &&
    typeof result.data === 'object' &&
    'success' in result.data &&
    result.data.success === false
  )
}

function getFastApiPowerPath(action: LocalLightAction) {
  if (action === 'off') return '/api/v1/light/off'
  return null
}

export async function handleLocalLightRequest(action: LocalLightAction, request: Request) {
  if (!isHueLocalEnabled()) {
    return jsonResponse({ ok: true, skipped: true, action, reason: 'Hue local disabled' })
  }

  const config = getHueLocalConfig()
  if (!config) {
    return jsonResponse({ ok: true, skipped: true, action, reason: 'Hue local config missing' })
  }

  const body = (await request.json().catch(() => ({}))) as LocalLightRequestBody
  const source = typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'unknown'
  const commandId = typeof body.commandId === 'string' ? body.commandId : undefined
  const effect = typeof body.effect === 'string' && body.effect.trim() ? body.effect.trim() : 'solid'
  const mode = typeof body.mode === 'string' ? body.mode : null

  logCommandEvent('[command] received', {
    commandId,
    sourceScreen: source,
    commandType: 'device',
    mode,
    deviceAction: action,
    deviceApi: true,
  })

  if (!markCommandOnce('device:hue', commandId)) {
    logCommandEvent('[command] skipped duplicate', {
      commandId,
      sourceScreen: source,
      commandType: 'device',
      mode,
      deviceAction: action,
      duplicate: true,
    })
    return jsonResponse({
      ok: true,
      skipped: true,
      skippedDuplicate: true,
      action,
      mode: body.mode ?? null,
      source,
      commandId,
    })
  }

  try {
    logCommandEvent('[device] hue api called once', {
      commandId,
      sourceScreen: source,
      commandType: 'device',
      mode,
      deviceAction: action,
      deviceApi: true,
    })
    const powerPath = getFastApiPowerPath(action)
    const result = action === 'on'
      ? await callHuePowerOn(config, body, { effect: 'solid', source, commandId })
      : powerPath
        ? await postToHueFastApi(config, powerPath, { source, commandId })
        : await callLocalMode(config, body, { effect, source, commandId })

    if (isFailureResult(result)) {
      console.warn('[api/light] Hue local FastAPI returned failure:', {
        action,
        mode: body.mode ?? null,
        source,
        commandId,
        status: result.status,
        path: result.path,
        fastApi: result.data,
      })
    }

    return jsonResponse({
      ok: !isFailureResult(result),
      skipped: false,
      action,
      mode: body.mode ?? null,
      hex: result.data && typeof result.data === 'object' && 'hex_color' in result.data
        ? result.data.hex_color
        : null,
      effect,
      source,
      commandId,
      method: result.method,
      url: result.url,
      endpoint: result.path,
      status: result.status,
      fastApi: result.data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[api/light] Hue local request failed:', {
      action,
      mode: body.mode ?? null,
      source,
      commandId,
      error: message,
    })

    return jsonResponse({
      ok: false,
      skipped: false,
      action,
      mode: body.mode ?? null,
      effect,
      source,
      commandId,
      error: message,
    })
  }
}

async function callLocalMode(
  config: { baseUrl: string; apiKey: string },
  body: LocalLightRequestBody,
  requestBody: {
    effect: string
    source: string
    commandId?: string
  },
): Promise<FastApiCallResult> {
  const requestedMode = body.mode
  const hueMode = normalizeHueLocalMode(requestedMode)
  if (hueMode) return callHueMode(config, hueMode, requestBody)

  return {
    ok: true,
    status: 200,
    path: '/api/v1/light/mode',
    method: 'POST',
    url: buildHueUrl(config.baseUrl, '/api/v1/light/mode'),
    data: {
      success: true,
      skipped: true,
      reason: 'No Hue local mode for request',
      mode: requestedMode ?? null,
    },
  }
}
