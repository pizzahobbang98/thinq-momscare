import { hubModeToSimulationQuery, simulationRoutineToQueryMode, type SimulationQueryMode } from '@/lib/simulation-mode-map'
import {
  hubModeToSimulationRoutine,
  type SimulationRoutineId,
  type TravelDestination,
} from '@/lib/simulation-routine-bridge'

export type ThinQMomSimulationMode =
  | 'NAUSEA_MODE'
  | 'SLEEP_MODE'
  | 'TRAVEL_MODE'
  | 'HOUSEWORK_MODE'
  | 'MORNING_BRIEFING'

export type SendModeToSimulationOptions = {
  travelDestination?: TravelDestination | null
  inputText?: string
}

export type ThinQMomSimulationMessage = {
  type: 'THINQ_MOM_MODE'
  mode: ThinQMomSimulationMode
  label: string
  timestamp: number
  simulationQueryMode: SimulationQueryMode
  routineId: SimulationRoutineId | null
  travelDestination?: TravelDestination | null
}

export const SIMULATION_BROADCAST_CHANNEL = 'thinq-mom-simulation'
export const SIMULATION_LAST_MODE_STORAGE_KEY = 'thinq-mom-simulation-last-mode'
export const SIMULATION_VOICE_COMMAND_STORAGE_KEY = 'thinq-mom-simulation-voice-command'
export const HUB_LISTENING_BROADCAST_CHANNEL = 'thinq-mom-hub-listening'
export const HUB_LISTENING_STORAGE_KEY = 'thinq-mom-hub-listening-state'
export const SIMULATION_VOICE_COMMAND_MESSAGE_TYPE = 'THINQ_MOM_SIMULATION_VOICE_COMMAND'

export type Simulation3DVoiceIntentResult = {
  success?: boolean
  type?: string
  intent?: string
  transcript?: string
  userText?: string
  understoodText?: string
  reply?: string
  intentSentence?: string
  executionText?: string
  ttsText?: string
  routineId?: string | null
  preparationMode?: string | null
  queryMode?: string | null
  defaultMode?: boolean
  airPowerOff?: boolean
  airPowerOn?: boolean
  lightPowerOff?: boolean
  lightPowerOn?: boolean
  deviceAction?: 'on' | 'off' | null
  lightAction?: 'on' | 'off' | null
  actionType?: string
  source?: string
}

export type SimulationVoiceCommandMessage = {
  type: typeof SIMULATION_VOICE_COMMAND_MESSAGE_TYPE
  commandId?: string
  transcript: string
  result: Simulation3DVoiceIntentResult
  timestamp: number
  source: string
  deviceHandled?: boolean
}

export type HubListeningMessage = {
  type: 'HUB_LISTENING_STATE'
  listening: boolean
  timestamp: number
  source: 'mobile-app' | 'hub'
}

const SIMULATION_MODES = new Set<string>([
  'NAUSEA_MODE',
  'SLEEP_MODE',
  'TRAVEL_MODE',
  'HOUSEWORK_MODE',
  'MORNING_BRIEFING',
])

export function isThinQMomSimulationMode(mode: string): mode is ThinQMomSimulationMode {
  return SIMULATION_MODES.has(mode)
}

export function sendModeToSimulation(
  mode: string,
  label: string,
  options: SendModeToSimulationOptions = {},
) {
  if (typeof window === 'undefined') return
  if (!isThinQMomSimulationMode(mode)) return

  try {
    const routineId = hubModeToSimulationRoutine(mode, {
      travelDestination: options.travelDestination,
      inputText: options.inputText,
    })
    const simulationQueryMode =
      routineId && simulationRoutineToQueryMode(routineId) !== 'default'
        ? simulationRoutineToQueryMode(routineId)
        : hubModeToSimulationQuery(mode)

    const message: ThinQMomSimulationMessage = {
      type: 'THINQ_MOM_MODE',
      mode,
      label,
      timestamp: Date.now(),
      simulationQueryMode,
      routineId,
      travelDestination: options.travelDestination ?? null,
    }

    console.log('[ThinQ Mom → 3D] send', message)

    const channel = new BroadcastChannel(SIMULATION_BROADCAST_CHANNEL)
    channel.postMessage(message)
    channel.close()

    window.localStorage.setItem(SIMULATION_LAST_MODE_STORAGE_KEY, JSON.stringify(message))
  } catch (error) {
    console.warn('[ThinQ Mom → 3D] send failed', error)
  }
}

export function sendVoiceCommandToSimulation(
  transcript: string,
  result: Simulation3DVoiceIntentResult,
  options: { source?: string; deviceHandled?: boolean; commandId?: string } = {},
) {
  if (typeof window === 'undefined') return

  const trimmed = transcript.trim()
  if (!trimmed) return

  try {
    const message: SimulationVoiceCommandMessage = {
      type: SIMULATION_VOICE_COMMAND_MESSAGE_TYPE,
      commandId: options.commandId,
      transcript: trimmed,
      result,
      timestamp: Date.now(),
      source: options.source ?? 'hub_voice',
      deviceHandled: options.deviceHandled ?? false,
    }

    console.log('[ThinQ Mom → 3D Voice] send', message)

    const channel = new BroadcastChannel(SIMULATION_BROADCAST_CHANNEL)
    channel.postMessage(message)
    channel.close()

    window.localStorage.setItem(SIMULATION_VOICE_COMMAND_STORAGE_KEY, JSON.stringify(message))
  } catch (error) {
    console.warn('[ThinQ Mom → 3D Voice] send failed', error)
  }
}

export function sendSimulationReset(reason = 'idle-timeout') {
  if (typeof window === 'undefined') return

  try {
    const message = {
      type: 'reset',
      source: reason,
      timestamp: Date.now(),
    }

    const channel = new BroadcastChannel(SIMULATION_BROADCAST_CHANNEL)
    channel.postMessage(message)
    channel.close()

    window.dispatchEvent(new CustomEvent('voice-agent-reset', { detail: message }))
  } catch (error) {
    console.warn('[ThinQ Mom -> 3D] reset failed', error)
  }
}

export function publishHubListeningState(listening: boolean, source: HubListeningMessage['source'] = 'mobile-app') {
  if (typeof window === 'undefined') return

  try {
    const timestamp = Date.now()
    const message: HubListeningMessage = {
      type: 'HUB_LISTENING_STATE',
      listening,
      timestamp,
      source,
    }

    const channel = new BroadcastChannel(HUB_LISTENING_BROADCAST_CHANNEL)
    channel.postMessage(message)
    channel.close()

    window.localStorage.setItem(HUB_LISTENING_STORAGE_KEY, JSON.stringify(message))

    void fetch('/api/demo-state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        hubListening: {
          listening,
          source,
          updatedAt: new Date(timestamp).toISOString(),
        },
      }),
    }).catch((error) => {
      console.warn('[ThinQ Mom ??Hub] remote listening sync failed', error)
    })
  } catch (error) {
    console.warn('[ThinQ Mom → Hub] listening sync failed', error)
  }
}

export function readHubListeningState(maxAgeMs = 30_000) {
  if (typeof window === 'undefined') return false

  try {
    const raw = window.localStorage.getItem(HUB_LISTENING_STORAGE_KEY)
    if (!raw) return false

    const parsed = JSON.parse(raw) as Partial<HubListeningMessage>
    if (!parsed.listening || typeof parsed.timestamp !== 'number') return false

    return Date.now() - parsed.timestamp <= maxAgeMs
  } catch {
    return false
  }
}
