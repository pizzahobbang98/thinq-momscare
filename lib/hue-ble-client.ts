'use client'

import { HUE_DEFAULT_STANDBY_COLOR, getHuePlaybackPalette, getHuePreset, type HueMode } from '@/lib/hue-presets'

const HUE_BLE_LIGHT_SERVICE = '932c32bd-0000-47a2-835a-a8d455b859dd'
const HUE_BLE_ON_OFF_CHARACTERISTIC = '932c32bd-0002-47a2-835a-a8d455b859dd'
const HUE_BLE_BRIGHTNESS_CHARACTERISTIC = '932c32bd-0003-47a2-835a-a8d455b859dd'
const HUE_BLE_COLOR_CHARACTERISTIC = '932c32bd-0005-47a2-835a-a8d455b859dd'
const HUE_BLE_MAX_BRIGHTNESS = 254
const HUE_BLE_GATT_DISCONNECTED_ERROR = 'GATT Server is disconnected. Cannot retrieve services. (Re)connect first with device.gatt.connect.'
const HUE_BLE_SERVICE_LOOKUP_DISCONNECTED_MESSAGE =
  'Hue Bluetooth 연결이 서비스 조회 전에 끊겼습니다. 전구가 Web Bluetooth 직접 제어를 제한하거나, Windows Bluetooth 연결이 불안정할 수 있습니다.'

type HueBleCharacteristic = {
  writeValue(value: BufferSource): Promise<void>
}

type HueBleService = {
  getCharacteristic(characteristic: string): Promise<HueBleCharacteristic>
}

type HueBleServer = {
  connected: boolean
  getPrimaryService(service: string): Promise<HueBleService>
}

type HueBleDevice = {
  name?: string
  gatt?: {
    connected: boolean
    connect(): Promise<HueBleServer>
  }
  addEventListener?(type: string, listener: () => void): void
}

type HueBleNavigator = {
  requestDevice(options: {
    acceptAllDevices: boolean
    optionalServices: string[]
  }): Promise<HueBleDevice>
}

type HueBleSession = {
  device: HueBleDevice
  server: HueBleServer
  onOff: HueBleCharacteristic
  brightness: HueBleCharacteristic
  color: HueBleCharacteristic | null
  colorWriteFailed: boolean
}

export type HueBleConnectionStatus = {
  supported: boolean
  connected: boolean
  connecting: boolean
  deviceName: string | null
  message: string
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

let hueBleSession: HueBleSession | null = null
let hueBleConnecting = false
let hueBleMessage = 'Hue Bluetooth 전구를 연결할 수 있습니다.'
const hueBleListeners = new Set<(status: HueBleConnectionStatus) => void>()
const hueBleDisconnectedListenerDevices = new WeakSet<HueBleDevice>()

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getBluetooth() {
  if (typeof navigator === 'undefined') return null
  return (navigator as Navigator & { bluetooth?: HueBleNavigator }).bluetooth ?? null
}

export function isHueBleSupported() {
  return Boolean(getBluetooth())
}

export function getHueBleStatus(): HueBleConnectionStatus {
  const connected = Boolean(hueBleSession?.server.connected && hueBleSession.device.gatt?.connected)
  return {
    supported: isHueBleSupported(),
    connected,
    connecting: hueBleConnecting,
    deviceName: connected ? hueBleSession?.device.name ?? 'Hue Bluetooth 전구' : null,
    message: isHueBleSupported()
      ? hueBleMessage
      : '이 브라우저는 Hue Bluetooth 실험 기능을 지원하지 않습니다.',
  }
}

export function subscribeHueBleStatus(listener: (status: HueBleConnectionStatus) => void) {
  hueBleListeners.add(listener)
  listener(getHueBleStatus())
  return () => {
    hueBleListeners.delete(listener)
  }
}

function emitHueBleStatus() {
  const status = getHueBleStatus()
  hueBleListeners.forEach((listener) => listener(status))
}

function markHueBleDisconnected(message = 'Hue Bluetooth 연결이 해제되었습니다.') {
  hueBleSession = null
  hueBleConnecting = false
  hueBleMessage = message
  emitHueBleStatus()
}

function registerHueBleDisconnectedListener(device: HueBleDevice) {
  if (!device.addEventListener || hueBleDisconnectedListenerDevices.has(device)) return

  hueBleDisconnectedListenerDevices.add(device)
  device.addEventListener('gattserverdisconnected', () => {
    markHueBleDisconnected('Hue Bluetooth 연결이 해제되었습니다. 다시 연결해 주세요.')
  })
}

function clearHueBleCache() {
  hueBleSession = null
}

function isGattDisconnectedError(error: unknown) {
  return error instanceof Error && error.message.includes('GATT Server is disconnected')
}

function getHueBleConnectionFailureMessage(error: unknown) {
  if (isGattDisconnectedError(error)) {
    return HUE_BLE_SERVICE_LOOKUP_DISCONNECTED_MESSAGE
  }

  return error instanceof Error
    ? `Hue Bluetooth 연결 실패: ${error.message}`
    : 'Hue Bluetooth 연결에 실패했습니다.'
}

async function connectHueBleGatt(device: HueBleDevice) {
  const server = await device.gatt?.connect()

  if (!server) {
    throw new Error('Hue Bluetooth GATT server를 열 수 없습니다.')
  }

  if (!server.connected) {
    throw new Error(HUE_BLE_GATT_DISCONNECTED_ERROR)
  }

  return server
}

async function getHueBleLightService(device: HueBleDevice, server: HueBleServer) {
  let activeServer = server

  if (!device.gatt?.connected) {
    activeServer = await connectHueBleGatt(device)
  }

  if (!device.gatt?.connected) {
    throw new Error(HUE_BLE_GATT_DISCONNECTED_ERROR)
  }

  return {
    server: activeServer,
    service: await activeServer.getPrimaryService(HUE_BLE_LIGHT_SERVICE),
  }
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

function createSimilarPalette(baseHex: string, steps = 10): string[] {
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

function hexToHueXy(hex: string) {
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
    x: xValue / total,
    y: yValue / total,
  }
}

function xyToHueBlePayload(hex: string) {
  const xy = hexToHueXy(hex)
  const payload = new DataView(new ArrayBuffer(4))
  payload.setUint16(0, Math.round(clamp(xy.x, 0, 1) * 65535), true)
  payload.setUint16(2, Math.round(clamp(xy.y, 0, 1) * 65535), true)
  return payload
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

async function writeHueBleOn(onOff: HueBleCharacteristic, enabled: boolean) {
  await onOff.writeValue(new Uint8Array([enabled ? 1 : 0]))
}

async function writeHueBleBrightness(brightness: HueBleCharacteristic) {
  await brightness.writeValue(new Uint8Array([HUE_BLE_MAX_BRIGHTNESS]))
}

async function writeHueBleColor(color: HueBleCharacteristic, hex: string) {
  await color.writeValue(xyToHueBlePayload(hex))
}

export async function connectHueBle(): Promise<HueBleConnectionStatus> {
  const bluetooth = getBluetooth()
  if (!bluetooth) {
    hueBleMessage = '이 브라우저는 Hue Bluetooth 실험 기능을 지원하지 않습니다.'
    emitHueBleStatus()
    return getHueBleStatus()
  }

  if (hueBleConnecting) {
    hueBleMessage = 'Hue Bluetooth 연결을 진행 중입니다.'
    emitHueBleStatus()
    return getHueBleStatus()
  }

  if (hueBleSession?.server.connected && hueBleSession.device.gatt?.connected) {
    hueBleMessage = 'Hue Bluetooth 전구가 이미 연결되어 있습니다.'
    emitHueBleStatus()
    return getHueBleStatus()
  }

  hueBleConnecting = true
  hueBleMessage = 'Hue Bluetooth 전구를 선택해 주세요.'
  emitHueBleStatus()

  try {
    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [HUE_BLE_LIGHT_SERVICE],
    })
    registerHueBleDisconnectedListener(device)

    const initialServer = await connectHueBleGatt(device)
    const { server, service } = await getHueBleLightService(device, initialServer)
    const [onOff, brightness, colorResult] = await Promise.all([
      service.getCharacteristic(HUE_BLE_ON_OFF_CHARACTERISTIC),
      service.getCharacteristic(HUE_BLE_BRIGHTNESS_CHARACTERISTIC),
      service.getCharacteristic(HUE_BLE_COLOR_CHARACTERISTIC).catch((error) => {
        console.warn('[hue-ble] color characteristic unavailable; brightness fallback only:', error)
        return null
      }),
    ])

    hueBleSession = {
      device,
      server,
      onOff,
      brightness,
      color: colorResult,
      colorWriteFailed: false,
    }

    await writeHueBleOn(onOff, true)
    await writeHueBleBrightness(brightness)

    if (!device.gatt?.connected) {
      throw new Error(HUE_BLE_GATT_DISCONNECTED_ERROR)
    }

    hueBleMessage = colorResult
      ? 'Hue Bluetooth 전구가 연결되었습니다.'
      : 'Hue Bluetooth 전구가 연결되었습니다. 색상은 전구 지원 여부에 따라 적용됩니다.'
  } catch (error) {
    clearHueBleCache()
    hueBleMessage = getHueBleConnectionFailureMessage(error)
    console.warn('[hue-ble] connection failed:', error)
  } finally {
    hueBleConnecting = false
    emitHueBleStatus()
  }

  return getHueBleStatus()
}

export async function applyHueBleMode(modeKey: HueMode) {
  const session = hueBleSession
  if (!session?.server.connected || !session.device.gatt?.connected) return { applied: false, reason: 'not_connected' as const }

  const preset = getHuePreset(modeKey)
  await writeHueBleOn(session.onOff, true)
  await writeHueBleBrightness(session.brightness)

  if (!session.color || session.colorWriteFailed) {
    hueBleMessage = 'Hue Bluetooth 전구 밝기를 최대로 유지했습니다. 색상 쓰기는 건너뜁니다.'
    emitHueBleStatus()
    return { applied: true, colorApplied: false, reason: 'color_unavailable' as const }
  }

    const palette = getHuePlaybackPalette(modeKey)

  try {
    for (const [index, hex] of palette.entries()) {
      await writeHueBleColor(session.color, hex)
      if (index < palette.length - 1) {
        await wait(preset.effectStepMs)
      }
    }

    hueBleMessage = `${preset.label} 색상을 Hue Bluetooth 전구에 적용했습니다.`
    emitHueBleStatus()
    return { applied: true, colorApplied: true, palette }
  } catch (error) {
    session.colorWriteFailed = true
    hueBleMessage = 'Hue Bluetooth 밝기는 유지했지만 색상 쓰기는 실패했습니다.'
    console.warn('[hue-ble] color write failed; keeping brightness fallback:', error)
    emitHueBleStatus()
    return { applied: true, colorApplied: false, reason: 'color_write_failed' as const }
  }
}

export async function applyHueBlePower(enabled: boolean, hex = HUE_DEFAULT_STANDBY_COLOR) {
  const session = hueBleSession
  if (!session?.server.connected || !session.device.gatt?.connected) return { applied: false, reason: 'not_connected' as const }

  await writeHueBleOn(session.onOff, enabled)

  if (!enabled) {
    hueBleMessage = 'Hue Bluetooth 전구를 껐습니다.'
    emitHueBleStatus()
    return { applied: true, power: 'off' as const }
  }

  await writeHueBleBrightness(session.brightness)

  if (!session.color || session.colorWriteFailed) {
    hueBleMessage = 'Hue Bluetooth 전구를 켜고 밝기를 최대로 유지했습니다.'
    emitHueBleStatus()
    return { applied: true, power: 'on' as const, colorApplied: false, reason: 'color_unavailable' as const }
  }

  try {
    await writeHueBleColor(session.color, hex)
    hueBleMessage = `Hue Bluetooth 전구를 ${hex} 색상으로 켰습니다.`
    emitHueBleStatus()
    return { applied: true, power: 'on' as const, colorApplied: true, hex }
  } catch (error) {
    session.colorWriteFailed = true
    hueBleMessage = 'Hue Bluetooth 전구는 켰지만 색상 쓰기는 실패했습니다.'
    console.warn('[hue-ble] power color write failed; keeping brightness fallback:', error)
    emitHueBleStatus()
    return { applied: true, power: 'on' as const, colorApplied: false, reason: 'color_write_failed' as const }
  }
}
