import {
  controlAirPurifier as controlAirPurifierMock,
  type ThinQCommand as LegacyThinQCommand,
} from '@/lib/thinq-mock'
import {
  isRecoverableThinQApiError,
  isRecoverableThinQErrorMessage,
  summarizeThinQErrorText,
} from '@/lib/thinq-errors'

export type ThinQCommand =
  | { type: 'POWER_ON' }
  | { type: 'POWER_OFF' }
  | { type: 'MODE_AUTO' }
  | { type: 'MODE_TURBO' }
  | { type: 'MODE_SLEEP' }
  | { type: 'MODE_SAVING' }
  | { type: 'NAUSEA_MODE' }

export type ThinQUiMode = 'ON' | 'OFF' | 'AUTO' | 'TURBO' | 'SLEEP' | 'SAVING'

export type ThinQDeviceState = {
  power: 'ON' | 'OFF'
  mode: string
  jobMode?: string
  fanSpeed?: string
  pm25: number
  uiMode: ThinQUiMode | null
}

export type ThinQControlResult = {
  success: boolean
  mock: boolean
  fallback?: boolean
  error?: string
  command?: LegacyThinQCommand
  deviceStatus: {
    power: string
    mode: string
    jobMode?: string
    fanSpeed?: string
    pm25: number
    uiMode: ThinQUiMode | null
  }
}

const BASE_URL = 'https://api-kic.lgthinq.com'
const REQUEST_TIMEOUT_MS = 10_000

function isMockFallbackEnabled(): boolean {
  const value = process.env.THINQ_MOCK_FALLBACK
  if (value === undefined) return true
  return value !== 'false' && value !== '0'
}

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

export function mapDeviceStateToUiMode(state: {
  power: 'ON' | 'OFF'
  mode: string
  jobMode?: string
  fanSpeed?: string
}): ThinQUiMode | null {
  if (state.power === 'OFF') return 'OFF'

  const jobMode = state.jobMode ?? (state.mode === 'SLEEP' || state.mode === 'CLEAN' ? state.mode : undefined)
  const windStrength =
    state.fanSpeed ??
    (['AUTO', 'LOW', 'MID', 'HIGH', 'POWER'].includes(state.mode) ? state.mode : undefined)

  if (jobMode === 'SLEEP') return 'SLEEP'
  if (windStrength === 'POWER' || windStrength === 'HIGH') return 'TURBO'
  if (windStrength === 'LOW') return 'SAVING'
  if (windStrength === 'AUTO' || jobMode === 'CLEAN') return 'AUTO'
  if (state.power === 'ON') return 'ON'

  return null
}

function commandToPayloads(command: ThinQCommand): Record<string, unknown>[] {
  switch (command.type) {
    case 'POWER_ON':
      return [{ operation: { airPurifierOperationMode: 'POWER_ON' } }]
    case 'POWER_OFF':
      return [{ operation: { airPurifierOperationMode: 'POWER_OFF' } }]
    case 'MODE_AUTO':
      return [
        { operation: { airPurifierOperationMode: 'POWER_ON' } },
        { airFlow: { windStrength: 'AUTO' } },
      ]
    case 'MODE_TURBO':
      return [
        { operation: { airPurifierOperationMode: 'POWER_ON' } },
        { airFlow: { windStrength: 'POWER' } },
      ]
    case 'MODE_SLEEP':
      return [
        { operation: { airPurifierOperationMode: 'POWER_ON' } },
        { airPurifierJobMode: { currentJobMode: 'SLEEP' } },
      ]
    case 'MODE_SAVING':
      return [
        { operation: { airPurifierOperationMode: 'POWER_ON' } },
        { airFlow: { windStrength: 'LOW' } },
      ]
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
  const jobModeBlock = response.airPurifierJobMode as Record<string, unknown> | undefined
  const airQuality = response.airQualitySensor as Record<string, unknown> | undefined
  const airFlow = response.airFlow as Record<string, unknown> | undefined

  const opMode = operation?.airPurifierOperationMode as string | undefined
  const power: 'ON' | 'OFF' =
    opMode === 'POWER_ON' ? 'ON' : opMode === 'POWER_OFF' ? 'OFF' : 'OFF'

  const jobModeValue = jobModeBlock?.currentJobMode as string | undefined
  const windStrength = airFlow?.windStrength as string | undefined

  let mode = jobModeValue ?? 'UNKNOWN'
  if (jobModeValue === 'SLEEP' || jobModeValue === 'CLEAN') {
    mode = jobModeValue
  } else if (windStrength) {
    mode = windStrength
  }

  const pm25Raw = airQuality?.pm2 ?? airQuality?.PM2 ?? 0
  const pm25 = Number(pm25Raw)

  const base = {
    power,
    mode,
    jobMode: jobModeValue,
    fanSpeed: windStrength,
    pm25: Number.isFinite(pm25) ? pm25 : 0,
  }

  return {
    ...base,
    uiMode: mapDeviceStateToUiMode(base),
  }
}

function toControlResult(
  state: ThinQDeviceState,
  command: ThinQCommand,
  options: { mock: boolean; fallback?: boolean; error?: string },
): ThinQControlResult {
  const legacy = thinQCommandToLegacy(command)

  return {
    success: true,
    mock: options.mock,
    fallback: options.fallback,
    error: options.error,
    command: legacy,
    deviceStatus: {
      power: state.power,
      mode: state.mode,
      jobMode: state.jobMode,
      fanSpeed: state.fanSpeed,
      pm25: state.pm25,
      uiMode: state.uiMode,
    },
  }
}

async function readMockDeviceState(errorMessage?: string) {
  const mockResult = await controlAirPurifierMock('AIR_ON')
  const power = mockResult.deviceStatus.power as 'ON' | 'OFF'

  return {
    power,
    mode: mockResult.deviceStatus.mode,
    pm25: mockResult.deviceStatus.pm25,
    uiMode: mapDeviceStateToUiMode({
      power,
      mode: mockResult.deviceStatus.mode,
    }),
    mock: true as const,
    fallback: true as const,
    error: errorMessage,
  }
}

async function thinqRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const deviceId = getDeviceId()
  const url = `${BASE_URL}${path}`
  console.log(`[thinq] ${init?.method ?? 'GET'} ${url}`)

  const response = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    const recoverable = isRecoverableThinQApiError(response.status, errorText)
    const summary = summarizeThinQErrorText(errorText)

    if (recoverable) {
      console.warn(`[thinq] recoverable API error ${response.status}: ${summary}`)
    } else {
      console.error(`[thinq] API error ${response.status}:`, errorText)
    }

    throw new Error(`ThinQ API ${response.status}: ${errorText}`)
  }

  const json = (await response.json()) as T
  console.log(`[thinq] response OK:`, JSON.stringify(json).slice(0, 500))
  return json
}

async function fetchDeviceStateInternal(): Promise<ThinQDeviceState> {
  const deviceId = getDeviceId()
  const data = await thinqRequest<unknown>(`/devices/${deviceId}/state`)
  const state = parseDeviceState(data)
  console.log('[thinq] parsed state:', state)
  return state
}

async function executeControl(command: ThinQCommand): Promise<void> {
  const deviceId = getDeviceId()
  const payloads = commandToPayloads(command)

  console.log('[thinq] control command:', command.type, 'payloads:', payloads)

  for (const payload of payloads) {
    await thinqRequest<unknown>(`/devices/${deviceId}/control`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

async function mockFallbackResult(command: ThinQCommand, error: unknown): Promise<ThinQControlResult> {
  const legacy = thinQCommandToLegacy(command)
  const mockResult = await controlAirPurifierMock(legacy)
  const errorMessage = error instanceof Error ? error.message : String(error)

  console.warn('[thinq] fallback used: true — mock control response', { command: command.type, error: errorMessage })

  return {
    success: mockResult.success,
    mock: true,
    fallback: true,
    error: errorMessage,
    command: legacy,
    deviceStatus: {
      power: mockResult.deviceStatus.power,
      mode: mockResult.deviceStatus.mode,
      pm25: mockResult.deviceStatus.pm25,
      uiMode: mapDeviceStateToUiMode({
        power: mockResult.deviceStatus.power as 'ON' | 'OFF',
        mode: mockResult.deviceStatus.mode,
      }),
    },
  }
}

export async function getDeviceState(): Promise<ThinQDeviceState & { mock: boolean; fallback?: boolean; error?: string }> {
  try {
    const state = await fetchDeviceStateInternal()
    console.log('[thinq] getDeviceState: real API success, fallback used: false')
    return { ...state, mock: false }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const recoverable = isRecoverableThinQErrorMessage(errorMessage)

    if (recoverable) {
      console.warn('[thinq] getDeviceState device not connected, using mock fallback:', summarizeThinQErrorText(errorMessage))
      return readMockDeviceState(errorMessage)
    }

    console.warn('[thinq] getDeviceState failed:', summarizeThinQErrorText(errorMessage))

    if (!isMockFallbackEnabled()) {
      throw error
    }

    console.warn('[thinq] fallback used: true — mock state response')
    return readMockDeviceState(errorMessage)
  }
}

export async function controlAirPurifier(command: ThinQCommand): Promise<ThinQControlResult> {
  try {
    await executeControl(command)
    const state = await fetchDeviceStateInternal()
    console.log('[thinq] controlAirPurifier: real API success, fallback used: false')
    return toControlResult(state, command, { mock: false })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const recoverable = isRecoverableThinQErrorMessage(errorMessage)

    if (recoverable) {
      console.warn('[thinq] controlAirPurifier device not connected, using mock fallback:', summarizeThinQErrorText(errorMessage))
      return mockFallbackResult(command, error)
    }

    console.warn('[thinq] controlAirPurifier failed:', summarizeThinQErrorText(errorMessage))

    if (!isMockFallbackEnabled()) {
      throw error
    }

    return mockFallbackResult(command, error)
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

export function doesUiModeMatchRequest(
  requested: ThinQUiMode,
  state: Pick<ThinQDeviceState, 'power' | 'uiMode'>,
): boolean {
  if (requested === 'OFF') return state.power === 'OFF'
  if (requested === 'ON') return state.power === 'ON'
  return state.uiMode === requested
}
