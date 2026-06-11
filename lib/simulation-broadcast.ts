import { hubModeToSimulationQuery, simulationRoutineToQueryMode, type SimulationQueryMode } from '@/lib/simulation-mode-map'
import {
  hubModeToSimulationRoutine,
  postRoutineToSimulationWindow,
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

    if (routineId) {
      postRoutineToSimulationWindow(routineId)
    }
  } catch (error) {
    console.warn('[ThinQ Mom → 3D] send failed', error)
  }
}
