import {
  sendModeToSimulation,
  SIMULATION_BROADCAST_CHANNEL,
} from '@/lib/simulation-broadcast'
import {
  saveSimulationTestModeFromRoutine,
  SIMULATION_DESTINATION_STORAGE_KEY,
  SIMULATION_ROUTINE_STORAGE_KEY,
  SIMULATION_TEST_MODE_CHANGE_EVENT,
  type SimulationTestModeSlug,
} from '@/lib/simulation-test-mode-sync'
import { getTravelModeDisplayLabel, type SimulationRoutineId, type TravelDestination } from '@/lib/simulation-routine-bridge'

export const SIMULATION_UPDATED_AT_STORAGE_KEY = 'thinq_simulation_updated_at'

export type DispatchSimulationOptions = {
  hubMode: string
  routineId: SimulationRoutineId | null
  travelDestination?: TravelDestination | null
  simulationModeSlug?: SimulationTestModeSlug | null
  inputText?: string
  modeLabel: string
  source?: string
}

export function dispatchSimulationImmediately(options: DispatchSimulationOptions) {
  if (typeof window === 'undefined') return

  const timestamp = Date.now()
  const travelDestination = options.travelDestination ?? null
  const displayLabel =
    options.hubMode === 'TRAVEL_MODE' && travelDestination
      ? getTravelModeDisplayLabel(options.modeLabel, travelDestination)
      : options.modeLabel

  try {
    window.localStorage.setItem(SIMULATION_UPDATED_AT_STORAGE_KEY, String(timestamp))

    if (options.routineId) {
      window.localStorage.setItem(SIMULATION_ROUTINE_STORAGE_KEY, options.routineId)
      window.localStorage.setItem(
        SIMULATION_DESTINATION_STORAGE_KEY,
        travelDestination ?? '',
      )
      saveSimulationTestModeFromRoutine(options.routineId, 'hub-execute', {
        slug: options.simulationModeSlug ?? undefined,
      })
    }

    sendModeToSimulation(options.hubMode, displayLabel, {
      travelDestination,
      inputText: options.inputText,
    })

    const channel = new BroadcastChannel(SIMULATION_BROADCAST_CHANNEL)
    channel.postMessage({
      type: 'SIMULATION_MODE_CHANGE',
      mode: options.hubMode,
      routine: options.routineId,
      destination: travelDestination,
      source: options.source ?? 'voice',
      updatedAt: timestamp,
      label: displayLabel,
    })
    channel.close()

    window.dispatchEvent(
      new CustomEvent(SIMULATION_TEST_MODE_CHANGE_EVENT, {
        detail: {
          routineId: options.routineId,
          hubMode: options.hubMode,
          travelDestination,
          timestamp,
          source: options.source ?? 'voice',
        },
      }),
    )

    console.log('[hub] simulation dispatched immediately:', {
      hubMode: options.hubMode,
      routineId: options.routineId,
      travelDestination,
      timestamp,
    })
  } catch (error) {
    console.warn('[hub] immediate simulation dispatch failed:', error)
  }
}
