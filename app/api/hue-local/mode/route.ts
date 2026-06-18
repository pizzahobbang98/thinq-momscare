import { NextResponse } from 'next/server'
import {
  getHueLocalFallbackPath,
  normalizeHueLocalMode,
  type HueLocalMode,
} from '@/lib/hue-local-modes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type HueLocalModeRequest = {
  mode?: unknown
  effect?: unknown
  source?: unknown
  commandId?: unknown
  originalMode?: unknown
}

type FastApiCallResult = {
  ok: boolean
  status: number
  path: string
  data: unknown
}

const HUE_LOCAL_TIMEOUT_MS = 12_000

function isHueLocalEnabled() {
  const value = process.env.HUE_LOCAL_ENABLED
  return value === 'true' || value === '1'
}

function getHueLocalConfig() {
  const baseUrl = process.env.MOTHER_HUE_CONTROL_URL?.trim()
  const apiKey = process.env.MOTHER_HUE_CONTROL_API_KEY?.trim()
  if (!baseUrl || !apiKey) return null
  return { baseUrl, apiKey }
}

function jsonResponse(body: Record<string, unknown>) {
  return NextResponse.json(body, { status: 200 })
}

function buildHueUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString()
}

async function postToHueFastApi(
  config: { baseUrl: string; apiKey: string },
  path: string,
  body: Record<string, unknown>,
): Promise<FastApiCallResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HUE_LOCAL_TIMEOUT_MS)

  try {
    const response = await fetch(buildHueUrl(config.baseUrl, path), {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
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
    return { ok: response.ok, status: response.status, path, data }
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
  const modeBody = {
    mode,
    effect: requestBody.effect,
    source: requestBody.source,
    commandId: requestBody.commandId,
  }

  const modeResult = await postToHueFastApi(config, '/api/v1/light/mode', modeBody)
  if (!shouldFallbackToIndividualEndpoint(modeResult)) return modeResult

  const fallbackPath = getHueLocalFallbackPath(mode)
  return postToHueFastApi(config, fallbackPath, modeBody)
}

export async function POST(request: Request) {
  if (!isHueLocalEnabled()) {
    return jsonResponse({ ok: true, skipped: true, reason: 'Hue local disabled' })
  }

  const config = getHueLocalConfig()
  if (!config) {
    return jsonResponse({ ok: true, skipped: true, reason: 'Hue local config missing' })
  }

  const body = (await request.json().catch(() => ({}))) as HueLocalModeRequest
  const requestedMode = body.mode
  const hueMode = normalizeHueLocalMode(requestedMode)
  const source = typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'unknown'
  const commandId = typeof body.commandId === 'string' ? body.commandId : undefined
  const effect = typeof body.effect === 'string' && body.effect.trim() ? body.effect.trim() : 'gradient'

  if (!hueMode) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: 'No Hue local mode for request',
      mode: requestedMode ?? null,
      source,
      commandId,
    })
  }

  try {
    const result = await callHueMode(config, hueMode, { effect, source, commandId })
    const ok = result.ok && !(
      result.data &&
      typeof result.data === 'object' &&
      'success' in result.data &&
      result.data.success === false
    )

    if (!ok) {
      console.warn('[api/hue-local/mode] Hue local FastAPI returned failure:', {
        mode: hueMode,
        source,
        commandId,
        status: result.status,
        path: result.path,
      })
    }

    return jsonResponse({
      ok,
      skipped: false,
      mode: requestedMode ?? null,
      hueMode,
      effect,
      source,
      commandId,
      endpoint: result.path,
      status: result.status,
      fastApi: result.data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[api/hue-local/mode] Hue local request failed:', {
      mode: hueMode,
      source,
      commandId,
      error: message,
    })

    return jsonResponse({
      ok: false,
      skipped: false,
      mode: requestedMode ?? null,
      hueMode,
      effect,
      source,
      commandId,
      error: message,
    })
  }
}
