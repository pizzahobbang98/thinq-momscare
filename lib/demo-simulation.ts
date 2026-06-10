import type { DeviceAction } from '@/lib/mode-actions'

export type SimulationSceneName = 'NAUSEA_SCENE' | 'SLEEP_SCENE' | 'RESORT_SCENE'

export type SimulationSceneInfo = {
  simulationScene: SimulationSceneName | null
  simulationText: string | null
}

export type DemoSceneSnapshot = {
  sceneName: string
  mode: string
  modeLabel: string
  simulationText: string
  updatedAt: string
}

export const DEMO_SCENE_CHANGE_EVENT = 'thinq-mom-demo-scene-change'

export const DEMO_SCENE_STORAGE_KEYS = {
  scene: 'thinq-mom-demo-scene',
  mode: 'thinq-mom-demo-mode',
  modeLabel: 'thinq-mom-demo-mode-label',
  simulationText: 'thinq-mom-demo-simulation-text',
  updatedAt: 'thinq-mom-demo-updated-at',
} as const

export const SIMULATION_SCENE_LABELS: Record<SimulationSceneName, string> = {
  NAUSEA_SCENE: '입덧 케어 장면',
  SLEEP_SCENE: '수면 케어 장면',
  RESORT_SCENE: '휴양지 케어 장면',
}

export function getSimulationScene(mode: string): SimulationSceneInfo {
  switch (mode) {
    case 'NAUSEA_MODE':
      return {
        simulationScene: 'NAUSEA_SCENE',
        simulationText: '주방 냄새와 식사 부담을 줄이는 환경으로 전환됩니다.',
      }
    case 'SLEEP_MODE':
      return {
        simulationScene: 'SLEEP_SCENE',
        simulationText: '조명, 공기, 소음을 낮춘 침실 환경으로 전환됩니다.',
      }
    case 'TRAVEL_MODE':
      return {
        simulationScene: 'RESORT_SCENE',
        simulationText: '스탠바이미, 오브제컬렉션, 조명, 공기를 활용해 휴양지 분위기를 만듭니다.',
      }
    default:
      return {
        simulationScene: null,
        simulationText: null,
      }
  }
}

export function getSimulationSceneLabel(sceneName: string | null | undefined) {
  if (!sceneName) return null
  return SIMULATION_SCENE_LABELS[sceneName as SimulationSceneName] ?? sceneName
}

export function normalizeExecuteModeLabel(mode: string, modeLabel: string) {
  if (mode === 'TRAVEL_MODE') return '휴양지모드'
  return modeLabel
}

export function buildDemoSimulationDeviceAction(mode: string): DeviceAction | null {
  const { simulationScene, simulationText } = getSimulationScene(mode)
  if (!simulationScene || !simulationText) return null

  return {
    device: 'DEMO_SIMULATION',
    action: 'SCENE_CHANGE',
    label: '3D 시뮬레이션 전환',
    status: 'mock',
    success: true,
    sceneName: simulationScene,
    simulationText,
  }
}

export function appendDemoSimulationDeviceResult(deviceResults: DeviceAction[], mode: string): DeviceAction[] {
  const demoAction = buildDemoSimulationDeviceAction(mode)
  if (!demoAction) return deviceResults
  return [...deviceResults, demoAction]
}

export function readDemoSceneFromStorage(): DemoSceneSnapshot | null {
  if (typeof window === 'undefined') return null

  try {
    const sceneName = localStorage.getItem(DEMO_SCENE_STORAGE_KEYS.scene)
    if (!sceneName) return null

    return {
      sceneName,
      mode: localStorage.getItem(DEMO_SCENE_STORAGE_KEYS.mode) ?? '',
      modeLabel: localStorage.getItem(DEMO_SCENE_STORAGE_KEYS.modeLabel) ?? '',
      simulationText: localStorage.getItem(DEMO_SCENE_STORAGE_KEYS.simulationText) ?? '',
      updatedAt: localStorage.getItem(DEMO_SCENE_STORAGE_KEYS.updatedAt) ?? '',
    }
  } catch (error) {
    console.warn('[demo-simulation] read storage failed:', error)
    return null
  }
}

export function persistDemoSceneChange(payload: {
  mode: string
  modeLabel: string
  simulationScene: string | null | undefined
  simulationText?: string | null
  demoUpdatedAt?: string | null
}) {
  if (typeof window === 'undefined' || !payload.simulationScene) return

  const updatedAt = payload.demoUpdatedAt ?? new Date().toISOString()

  try {
    localStorage.setItem(DEMO_SCENE_STORAGE_KEYS.scene, payload.simulationScene)
    localStorage.setItem(DEMO_SCENE_STORAGE_KEYS.mode, payload.mode)
    localStorage.setItem(DEMO_SCENE_STORAGE_KEYS.modeLabel, payload.modeLabel)
    localStorage.setItem(DEMO_SCENE_STORAGE_KEYS.simulationText, payload.simulationText ?? '')
    localStorage.setItem(DEMO_SCENE_STORAGE_KEYS.updatedAt, updatedAt)

    window.dispatchEvent(
      new CustomEvent(DEMO_SCENE_CHANGE_EVENT, {
        detail: {
          mode: payload.mode,
          modeLabel: payload.modeLabel,
          sceneName: payload.simulationScene,
          simulationText: payload.simulationText ?? '',
          updatedAt,
        },
      }),
    )
  } catch (error) {
    console.warn('[demo-simulation] persist storage failed:', error)
  }
}

export function formatDemoSceneUpdatedAt(updatedAt: string) {
  if (!updatedAt) return '-'
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return updatedAt

  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
