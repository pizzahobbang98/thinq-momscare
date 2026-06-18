import { request as httpRequest } from 'http'
import { request as httpsRequest } from 'https'
import {
  getHuePreset,
  type HueMode,
} from '@/lib/hue-presets'

export type HueXyColor = {
  x: number
  y: number
}

export type HuePaletteStep = {
  step: number
  hex: string
  xy: HueXyColor
  brightness: 100
}

export type HueSceneResult = {
  success: boolean
  enabled: boolean
  mock: boolean
  appliedMode: HueMode
  brightness: 100
  effectSteps: 10
  effectStepMs: number
  palettePreview: HuePaletteStep[]
  appliedLights: string[]
  errors: string[]
}

type RgbColor = {
  r: number
  g: number
  b: number
}

type HslColor = {
  h: number
  s: number
  l: number
}

type HueRuntimeConfig = {
  bridgeHost: string
  applicationKey: string
  lightIds: string[]
  timeoutMs: number
  rejectUnauthorized: boolean
}

const HUE_TRANSITION_DURATION_MS = 500

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeHex(hex: string) {
  const trimmed = hex.trim().replace(/^#/, '')
  const expanded = trimmed.length === 3
    ? trimmed.split('').map((char) => `${char}${char}`).join('')
    : trimmed

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  return `#${expanded.toUpperCase()}`
}

function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex).slice(1)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(color: RgbColor) {
  const toHex = (value: number) =>
    Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')
  return normalizeHex(`#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`)
}

function rgbToHsl(color: RgbColor): HslColor {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2

  if (max === min) {
    return { h: 0, s: 0, l: lightness }
  }

  const delta = max - min
  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min)

  let hue = 0
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0)
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4

  return { h: hue * 60, s: saturation, l: lightness }
}

function hueToRgbChannel(p: number, q: number, tValue: number) {
  let t = tValue
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function hslToRgb(color: HslColor): RgbColor {
  const h = ((color.h % 360) + 360) % 360 / 360
  const s = clamp(color.s, 0, 1)
  const l = clamp(color.l, 0, 1)

  if (s === 0) {
    const value = l * 255
    return { r: value, g: value, b: value }
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return {
    r: hueToRgbChannel(p, q, h + 1 / 3) * 255,
    g: hueToRgbChannel(p, q, h) * 255,
    b: hueToRgbChannel(p, q, h - 1 / 3) * 255,
  }
}

export function createSimilarPalette(baseHex: string, steps = 10): string[] {
  const normalizedBase = normalizeHex(baseHex)
  const safeSteps = Math.max(1, Math.round(steps))
  if (safeSteps === 1) return [normalizedBase]

  const baseHsl = rgbToHsl(hexToRgb(normalizedBase))
  const colors: string[] = []
  const variationCount = safeSteps - 1

  for (let index = 0; index < variationCount; index += 1) {
    const progress = variationCount === 1 ? 0.5 : index / (variationCount - 1)
    const hueOffset = -8 + progress * 16
    const saturationOffset = Math.sin(progress * Math.PI * 2) * 0.045
    const lightnessOffset = Math.cos(progress * Math.PI * 2) * 0.035

    colors.push(rgbToHex(hslToRgb({
      h: baseHsl.h + hueOffset,
      s: clamp(baseHsl.s + saturationOffset, 0.08, 1),
      l: clamp(baseHsl.l + lightnessOffset, 0.12, 0.92),
    })))
  }

  colors.push(normalizedBase)
  return colors
}

export function hexToHueXy(hex: string): HueXyColor {
  const { r, g, b } = hexToRgb(hex)
  const normalize = (value: number) => {
    const channel = value / 255
    return channel > 0.04045
      ? ((channel + 0.055) / 1.055) ** 2.4
      : channel / 12.92
  }

  const red = normalize(r)
  const green = normalize(g)
  const blue = normalize(b)

  const xValue = red * 0.664511 + green * 0.154324 + blue * 0.162028
  const yValue = red * 0.283881 + green * 0.668433 + blue * 0.047685
  const zValue = red * 0.000088 + green * 0.07231 + blue * 0.986039
  const total = xValue + yValue + zValue

  if (total === 0) return { x: 0.3127, y: 0.329 }

  return {
    x: Number((xValue / total).toFixed(4)),
    y: Number((yValue / total).toFixed(4)),
  }
}

export function buildHuePalettePreview(mode: HueMode): HuePaletteStep[] {
  const preset = getHuePreset(mode)
  return createSimilarPalette(preset.baseHex, preset.effectSteps).map((hex, index) => ({
    step: index + 1,
    hex,
    xy: hexToHueXy(hex),
    brightness: preset.brightness,
  }))
}

function isHueEnabled() {
  const value = process.env.HUE_ENABLED
  return value === 'true' || value === '1'
}

function getHueConfig(): HueRuntimeConfig {
  const bridgeHost = process.env.HUE_BRIDGE_HOST?.trim()
  const applicationKey = process.env.HUE_APPLICATION_KEY?.trim()
  const lightIds = (process.env.HUE_LIGHT_IDS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const timeoutMs = Number(process.env.HUE_TIMEOUT_MS ?? 1500)
  const rejectUnauthorized = process.env.HUE_TLS_REJECT_UNAUTHORIZED !== 'false'

  if (!bridgeHost) throw new Error('HUE_BRIDGE_HOST is not configured.')
  if (!applicationKey) throw new Error('HUE_APPLICATION_KEY is not configured.')
  if (lightIds.length === 0) throw new Error('HUE_LIGHT_IDS is not configured.')

  return {
    bridgeHost,
    applicationKey,
    lightIds,
    timeoutMs: Number.isFinite(timeoutMs) ? clamp(timeoutMs, 500, 10_000) : 1500,
    rejectUnauthorized,
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function buildHueUrl(config: HueRuntimeConfig, lightId: string) {
  const host = config.bridgeHost.replace(/^https?:\/\//, '')
  return new URL(`https://${host}/clip/v2/resource/light/${encodeURIComponent(lightId)}`)
}

function putHueLight(
  config: HueRuntimeConfig,
  lightId: string,
  step: HuePaletteStep,
  effectStepMs: number,
) {
  const url = buildHueUrl(config, lightId)
  const body = JSON.stringify({
    on: { on: true },
    dimming: { brightness: step.brightness },
    color: { xy: step.xy },
    dynamics: { duration: HUE_TRANSITION_DURATION_MS },
  })
  const requestImpl = url.protocol === 'http:' ? httpRequest : httpsRequest

  return new Promise<void>((resolve, reject) => {
    const request = requestImpl({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: 'PUT',
      timeout: config.timeoutMs,
      rejectUnauthorized: config.rejectUnauthorized,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'hue-application-key': config.applicationKey,
      },
    }, (response) => {
      let responseText = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        responseText += chunk
      })
      response.on('end', () => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
          resolve()
          return
        }
        reject(new Error(`Hue ${response.statusCode}: ${responseText.slice(0, 240)}`))
      })
    })

    request.on('timeout', () => {
      request.destroy(new Error(`Hue request timed out after ${effectStepMs}ms transition / ${config.timeoutMs}ms timeout.`))
    })
    request.on('error', reject)
    request.write(body)
    request.end()
  })
}

export async function applyHueScene(mode: HueMode): Promise<HueSceneResult> {
  const preset = getHuePreset(mode)
  const palettePreview = buildHuePalettePreview(mode)
  const baseResult = {
    appliedMode: mode,
    brightness: preset.brightness,
    effectSteps: preset.effectSteps,
    effectStepMs: preset.effectStepMs,
    palettePreview,
  } satisfies Pick<
    HueSceneResult,
    'appliedMode' | 'brightness' | 'effectSteps' | 'effectStepMs' | 'palettePreview'
  >

  if (!isHueEnabled()) {
    console.log('[hue] mock scene:', { mode, palette: palettePreview.map((step) => step.hex) })
    return {
      ...baseResult,
      success: true,
      enabled: false,
      mock: true,
      appliedLights: [],
      errors: [],
    }
  }

  let config: HueRuntimeConfig
  try {
    config = getHueConfig()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[hue] config unavailable:', message)
    return {
      ...baseResult,
      success: false,
      enabled: true,
      mock: true,
      appliedLights: [],
      errors: [message],
    }
  }

  const appliedLights = new Set<string>()
  const errors: string[] = []

  for (const [index, step] of palettePreview.entries()) {
    const stepResults = await Promise.allSettled(
      config.lightIds.map(async (lightId) => {
        await putHueLight(config, lightId, step, preset.effectStepMs)
        appliedLights.add(lightId)
      }),
    )

    const stepErrors = stepResults
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason))
    errors.push(...stepErrors)

    if (stepResults.every((result) => result.status === 'rejected')) {
      console.warn('[hue] stopping effect after failed step:', { mode, step: step.step, errors: stepErrors })
      break
    }

    if (index < palettePreview.length - 1) {
      await wait(preset.effectStepMs)
    }
  }

  return {
    ...baseResult,
    success: appliedLights.size > 0,
    enabled: true,
    mock: false,
    appliedLights: Array.from(appliedLights),
    errors,
  }
}
