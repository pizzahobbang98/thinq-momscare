import type { Mode } from '@/lib/ai-mode-router'

type HubUiMode = 'AUTO' | 'TURBO' | 'SLEEP' | 'SAVING' | 'ON' | 'OFF'

const HUB_MODE_THINQ_COMMAND: Partial<Record<Mode, string>> = {
  NAUSEA_MODE: 'MODE_TURBO',
  SLEEP_MODE: 'MODE_SLEEP',
  HOUSEWORK_MODE: 'MODE_AUTO',
  TRAVEL_MODE: 'MODE_AUTO',
  AIR_ON: 'POWER_ON',
  AIR_OFF: 'POWER_OFF',
}

export type HubThinQStateSnapshot = {
  power: 'ON' | 'OFF'
  mode: string
  jobMode?: string
  fanSpeed?: string
  pm25: number
  uiMode: HubUiMode | null
  mock: boolean
  fallback: boolean
  error?: string
}

export type HubThinQControlClientResult = {
  success: boolean
  mock?: boolean
  fallback?: boolean
  error?: string
  deviceStatus?: {
    power: string
    mode: string
    jobMode?: string
    fanSpeed?: string
    pm25: number
    uiMode: string | null
  }
}

export function getThinQCommandForHubMode(hubMode: Mode): string | null {
  return HUB_MODE_THINQ_COMMAND[hubMode] ?? null
}

function commandToOptimisticUiMode(command: string): HubUiMode | null {
  switch (command) {
    case 'POWER_OFF':
      return 'OFF'
    case 'POWER_ON':
      return 'ON'
    case 'MODE_TURBO':
      return 'TURBO'
    case 'MODE_SLEEP':
      return 'SLEEP'
    case 'MODE_AUTO':
      return 'AUTO'
    case 'MODE_SAVING':
      return 'SAVING'
    default:
      return 'AUTO'
  }
}

export function buildOptimisticThinQState(
  command: string,
  currentPm25 = 12,
): HubThinQStateSnapshot {
  const uiMode = commandToOptimisticUiMode(command)
  const power: 'ON' | 'OFF' = uiMode === 'OFF' ? 'OFF' : 'ON'

  return {
    power,
    mode: uiMode ?? 'AUTO',
    pm25: currentPm25,
    uiMode,
    mock: false,
    fallback: false,
  }
}

export function controlResultToThinQState(
  result: HubThinQControlClientResult,
  currentPm25 = 12,
): HubThinQStateSnapshot {
  const status = result.deviceStatus
  const uiMode = (status?.uiMode as HubUiMode | null | undefined) ?? null
  const power: 'ON' | 'OFF' =
    status?.power === 'OFF' || uiMode === 'OFF' ? 'OFF' : 'ON'

  return {
    power,
    mode: status?.mode ?? uiMode ?? 'AUTO',
    jobMode: status?.jobMode,
    fanSpeed: status?.fanSpeed,
    pm25: status?.pm25 ?? currentPm25,
    uiMode,
    mock: result.mock ?? false,
    fallback: result.fallback ?? false,
    error: result.error,
  }
}

export async function dispatchThinQControlImmediately(
  command: string,
  context: { hubMode?: string; routineId?: string } = {},
): Promise<HubThinQControlClientResult> {
  const response = await fetch('/api/thinq/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, ...context }),
    cache: 'no-store',
  })

  const data = (await response.json()) as HubThinQControlClientResult & { error?: string }

  if (!response.ok) {
    throw new Error(data.error ?? 'ThinQ 제어 실패')
  }

  return data
}

export function dispatchThinQImmediatelyForHubMode(
  hubMode: Mode,
  options: {
    currentPm25?: number
    onOptimisticState?: (state: HubThinQStateSnapshot) => void
    onResolvedState?: (state: HubThinQStateSnapshot) => void
    onError?: (error: unknown) => void
  } = {},
) {
  const command = getThinQCommandForHubMode(hubMode)
  if (!command) return null

  const currentPm25 = options.currentPm25 ?? 12
  options.onOptimisticState?.(buildOptimisticThinQState(command, currentPm25))

  void dispatchThinQControlImmediately(command, { hubMode })
    .then((result) => {
      options.onResolvedState?.(controlResultToThinQState(result, currentPm25))
      console.log('[hub] ThinQ dispatched immediately:', {
        hubMode,
        command,
        uiMode: result.deviceStatus?.uiMode,
        mock: result.mock,
        fallback: result.fallback,
      })
    })
    .catch((error) => {
      console.error('[hub] immediate ThinQ control failed:', {
        hubMode,
        command,
        error,
      })
      options.onError?.(error)
    })

  return command
}
