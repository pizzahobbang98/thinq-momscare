import {
  hubModeToSimulationRoutine,
  resolveTravelDestination,
  type SimulationRoutineId,
  type TravelDestination,
} from '@/lib/simulation-routine-bridge'

export type HubNaturalLanguageSource = 'hub_voice' | 'hub_text' | 'example_chip'

export type HubExecutionContext = {
  travelDestination: TravelDestination | null
}

export function buildHubExecutionContext(
  text: string,
  options: { travelDestination?: TravelDestination | null } = {},
): HubExecutionContext {
  return {
    travelDestination: resolveTravelDestination(options.travelDestination, text),
  }
}

export function resolveHubTravelDestinationForMode(
  mode: string,
  text: string,
  context: HubExecutionContext,
): TravelDestination | null {
  if (mode !== 'TRAVEL_MODE') return null
  return resolveTravelDestination(context.travelDestination, text)
}

export function resolveHubSimulationRoutine(
  mode: string,
  text: string,
  context: HubExecutionContext,
): SimulationRoutineId | null {
  return hubModeToSimulationRoutine(mode, {
    travelDestination: resolveHubTravelDestinationForMode(mode, text, context),
    inputText: text,
  })
}
