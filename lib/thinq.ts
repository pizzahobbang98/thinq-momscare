import {
  controlAirPurifier as controlAirPurifierMock,
  type ThinQCommand as LegacyThinQCommand,
} from '@/lib/thinq-mock'

export type ThinQCommand =
  | { type: 'POWER_ON' }
  | { type: 'POWER_OFF' }
  | { type: 'MODE_AUTO' }
  | { type: 'MODE_TURBO' }
  | { type: 'MODE_SLEEP' }
  | { type: 'MODE_SAVING' }
  | { type: 'NAUSEA_MODE' }

export type ThinQDeviceState = {
  power: 'ON' | 'OFF'
  mode: string
  fanSpeed?: string
  pm25: number
}

export type ThinQControlResult = {
  success: boolean
  mock: boolean
  fallback?: boolean
  command?: LegacyThinQCommand
  deviceStatus: {
    power: string
    mode: string
    pm25: number
  }
}

const BASE_URL = 'https://api-kic.lgthinq.com'
const REQUEST_TIMEOUT_MS = 10_000

function generateMessageId(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '')
  return Buffer.from(uuid, 'hex').toString('base64url').slice(0, 22)
}

function getDeviceId() {
  const deviceId = process.env.THINQ_DEVICE_ID
  if (!deviceId) {
    throw new Error('THINQ_DEVICE_ID가 설정되지 않았습니다.')
  }
  return deviceId
}

function buildHeaders() {
  const token = process.env.THINQ_PAT_TOKEN
  if (!token) {
    throw new Error('THINQ_PAT_TOKEN이 설정되지 않았습니다.')
  }

  return {
    Authorization: `Bearer ${token}`,
    'x-api-key': 'v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3',
    'x-country': 'KR',
    'x-client-id': process.env.THINQ_CLIENT_ID || 'thinq-momscare-client-001',
    'x-message-id': generateMessageId(),
    'Content-Type': 'application/json',
  }
}

function commandToPayloads(command: ThinQCommand): Record<string, unknown>[] {
  switch (command.type) {
    case 'POWER_ON':
      return [{ operation: { airPurifierOperationMode: 'POWER_ON' } }]
    case 'POWER_OFF':
      return [{ operation: { airPurifierOperationMode: 'POWER_OFF' } }]
    case 'MODE_AUTO':
      return [{ airFlow: { windStrength: 'AUTO' } }]
    case 'MODE_TURBO':
      return [{ airFlow: { windStrength: 'POWER' } }]
    case 'MODE_SLEEP':
      return [{ airPurifierJobMode: { currentJobMode: 'SLEEP' } }]
    case 'MODE_SAVING':
      return [{ airFlow: { windStrength: 'LOW' } }]
    case 'NAUSEA_MODE':
      return [
        { operation: { airPurifierOperationMode: 'POWER_ON' } },
        { airFlow: { windStrength: 'POWER' } },
      ]
    default:
      throw new Error('지원하지 않는 ThinQ 명령입니다.')
  }
}

export function legacyCommandToThinQCommand(command: LegacyThinQCommand): ThinQCommand {
  switch (command) {
    case 'NAUSEA_MODE':
      return { type: 'NAUSEA_MODE' }
    case 'SLEEP_MODE':
      return { type: 'MODE_SLEEP' }
    case 'AIR_ON':
      return { type: 'POWER_ON' }
    case 'AIR_OFF':
      return { type: 'POWER_OFF' }
    case 'AUTO':
      return { type: 'MODE_AUTO' }
    case 'TURBO':
      return { type: 'MODE_TURBO' }
    case 'SAVING':
      return { type: 'MODE_SAVING' }
    default:
      return { type: 'POWER_ON' }
  }
}

function thinQCommandToLegacy(command: ThinQCommand): LegacyThinQCommand {
  switch (command.type) {
    case 'POWER_ON':
      return 'AIR_ON'
    case 'POWER_OFF':
      return 'AIR_OFF'
    case 'MODE_AUTO':
      return 'AUTO'
    case 'MODE_TURBO':
      return 'TURBO'
    case 'MODE_SLEEP':
      return 'SLEEP_MODE'
    case 'MODE_SAVING':
      return 'SAVING'
    case 'NAUSEA_MODE':
      return 'NAUSEA_MODE'
    default:
      return 'AIR_ON'
  }
}

function parseDeviceState(data: unknown): ThinQDeviceState {
  const response =
    (data as { response?: Record<string, unknown> })?.response ??
    (data as Record<string, unknown>)

  const operation = response.operation as Record<string, unknown> | undefined
  const jobMode = response.airPurifierJobMode as Record<string, unknown> | undefined
  const airQuality = response.airQualitySensor as Record<string, unknown> | undefined
  const airFlow = response.airFlow as Record<string, unknown> | undefined

  const opMode = operation?.airPurifierOperationMode as string | undefined
  const power: 'ON' | 'OFF' =
    opMode === 'POWER_ON' ? 'ON' : opMode === 'POWER_OFF' ? 'OFF' : 'OFF'

  const jobModeValue = jobMode?.currentJobMode as string | undefined
  const windStrength = airFlow?.windStrength as string | undefined

  let mode = jobModeValue ?? 'UNKNOWN'
  if (jobModeValue === 'SLEEP' || jobModeValue === 'CLEAN') {
    mode = jobModeValue
  } else if (windStrength) {
    mode = windStrength
  }
  const pm25Raw = airQuality?.pm2 ?? airQuality?.PM2 ?? 0
  const pm25 = Number(pm25Raw)

  return {
    power,
    mode,
    fanSpeed: windStrength,
    pm25: Number.isFinite(pm25) ? pm25 : 0,
  }
}

function toControlResult(
  state: ThinQDeviceState,
  command: ThinQCommand,
  options: { mock: boolean; fallback?: boolean },
): ThinQControlResult {
  const legacy = thinQCommandToLegacy(command)

  return {
    success: true,
    mock: options.mock,
    fallback: options.fallback,
    command: legacy,
    deviceStatus: {
      power: state.power,
      mode: state.mode,
      pm25: state.pm25,
    },
  }
}

async function thinqRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const deviceId = getDeviceId()
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ThinQ API ${response.status}: ${errorText}`)
  }

  return (await response.json()) as T
}

async function fetchDeviceStateInternal(): Promise<ThinQDeviceState> {
  const deviceId = getDeviceId()
  const data = await thinqRequest<unknown>(`/devices/${deviceId}/state`)
  return parseDeviceState(data)
}

async function executeControl(command: ThinQCommand): Promise<void> {
  const deviceId = getDeviceId()
  const payloads = commandToPayloads(command)

  for (const payload of payloads) {
    await thinqRequest<unknown>(`/devices/${deviceId}/control`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

export async function getDeviceState(): Promise<ThinQDeviceState & { mock: boolean; fallback?: boolean }> {
  try {
    const state = await fetchDeviceStateInternal()
    return { ...state, mock: false }
  } catch (error) {
    console.error('ThinQ 상태 조회 실패, Mock fallback:', error)
    const mockResult = await controlAirPurifierMock('AIR_ON')
    return {
      power: mockResult.deviceStatus.power as 'ON' | 'OFF',
      mode: mockResult.deviceStatus.mode,
      pm25: mockResult.deviceStatus.pm25,
      mock: true,
      fallback: true,
    }
  }
}

export async function controlAirPurifier(command: ThinQCommand): Promise<ThinQControlResult> {
  try {
    await executeControl(command)
    const state = await fetchDeviceStateInternal()
    return toControlResult(state, command, { mock: false })
  } catch (error) {
    console.error('ThinQ 기기 제어 실패, Mock fallback:', error)
    const legacy = thinQCommandToLegacy(command)
    const mockResult = await controlAirPurifierMock(legacy)
    return {
      success: mockResult.success,
      mock: true,
      fallback: true,
      command: legacy,
      deviceStatus: mockResult.deviceStatus,
    }
  }
}

export async function controlAirPurifierLegacy(
  command: LegacyThinQCommand,
): Promise<ThinQControlResult> {
  return controlAirPurifier(legacyCommandToThinQCommand(command))
}

export function isLegacyThinQCommand(value: unknown): value is LegacyThinQCommand {
  return (
    typeof value === 'string' &&
    ['NAUSEA_MODE', 'SLEEP_MODE', 'AIR_ON', 'AIR_OFF', 'AUTO', 'TURBO', 'SAVING'].includes(value)
  )
}

export function parseControlCommand(value: unknown): ThinQCommand {
  if (typeof value === 'object' && value !== null && 'type' in value) {
    return value as ThinQCommand
  }

  if (value === 'POWER_ON') return { type: 'POWER_ON' }
  if (value === 'POWER_OFF') return { type: 'POWER_OFF' }

  if (isLegacyThinQCommand(value)) {
    return legacyCommandToThinQCommand(value)
  }

  throw new Error('유효하지 않은 ThinQ command입니다.')
}
