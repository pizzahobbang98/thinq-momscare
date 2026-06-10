import { controlAirPurifier, type ThinQCommand } from '@/lib/thinq'
import { type Mode } from '@/lib/ai-mode-router'

export type DeviceStatus = 'actual' | 'mock' | 'planned'
export type DeviceExecutionStatus = 'success' | 'failed' | 'skipped'

export interface DeviceAction {
  device: string
  action: string
  label: string
  status: DeviceStatus
  thinqCommand?: string
  success?: boolean
  message?: string
  executionStatus?: DeviceExecutionStatus
  executionMessage?: string
  executedAt?: string
  deviceStatus?: {
    power: string
    mode: string
    jobMode?: string
    fanSpeed?: string
    pm25: number
    uiMode: string | null
  }
  mock?: boolean
  fallback?: boolean
  sceneName?: string
  simulationText?: string
  error?: string
}

export interface ModeActions {
  description: string
  actions: DeviceAction[]
  mode?: Mode
}

const MODE_ACTIONS: Record<Exclude<Mode, 'UNKNOWN'>, ModeActions> = {
  NAUSEA_MODE: {
    mode: 'NAUSEA_MODE',
    description: '공기청정기를 터보 모드로 켜서 냄새 부담을 줄였어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'MODE_TURBO',
        label: '공기청정기 터보 모드',
        status: 'actual',
        thinqCommand: 'MODE_TURBO',
      },
      { device: 'AC', action: 'SOFT_WIND', label: '에어컨 약풍', status: 'planned' },
      { device: 'HOOD', action: 'STRONG_VENTILATION', label: '주방후드 강환기', status: 'planned' },
      { device: 'REFRIGERATOR', action: 'LOW_SMELL_MEAL', label: '냄새 낮은 식사 추천', status: 'mock' },
      { device: 'INDUCTION', action: 'LOW_SMELL_PRESET', label: '냄새 낮은 조리 설정', status: 'mock' },
    ],
  },
  AIR_ON: {
    mode: 'AIR_ON',
    description: '공기청정기를 켰어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'POWER_ON',
        label: '공기청정기 켜기',
        status: 'actual',
        thinqCommand: 'POWER_ON',
      },
    ],
  },
  AIR_OFF: {
    mode: 'AIR_OFF',
    description: '공기청정기 전원을 껐어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'POWER_OFF',
        label: '공기청정기 전원 끄기',
        status: 'actual',
        thinqCommand: 'POWER_OFF',
      },
    ],
  },
  SLEEP_MODE: {
    mode: 'SLEEP_MODE',
    description: '잠들기 좋은 침실 조건으로 맞췄어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'MODE_SLEEP',
        label: '공기청정기 수면 모드',
        status: 'actual',
        thinqCommand: 'MODE_SLEEP',
      },
      { device: 'AC', action: 'SLEEP_TEMP', label: '에어컨 수면 온도', status: 'planned' },
      { device: 'LIGHT', action: 'WARM_DIM', label: '조명 따뜻하게 낮추기', status: 'planned' },
      { device: 'TV', action: 'AUTO_OFF', label: 'TV 자동 종료', status: 'mock' },
      { device: 'ROBOT_CLEANER', action: 'NIGHT_BLOCK', label: '로봇청소기 야간 제한', status: 'mock' },
    ],
  },
  HOUSEWORK_MODE: {
    mode: 'HOUSEWORK_MODE',
    description: '지금 바로 움직이지 않아도 되게 집안일 타이밍을 조정했어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'MODE_AUTO',
        label: '공기청정기 자동 모드',
        status: 'actual',
        thinqCommand: 'MODE_AUTO',
      },
      { device: 'WASHER', action: 'KEEP_CARE', label: '세탁물 케어 유지', status: 'mock' },
      { device: 'DRYER', action: 'WRINKLE_PREVENT', label: '건조기 구김 방지', status: 'mock' },
      { device: 'DISHWASHER', action: 'BUNDLE_ALERT', label: '식기세척기 알림 묶기', status: 'mock' },
      { device: 'ROBOT_CLEANER', action: 'RESCHEDULE', label: '로봇청소기 일정 조정', status: 'mock' },
    ],
  },
  TRAVEL_MODE: {
    mode: 'TRAVEL_MODE',
    description: '집 안을 잠시 다른 장소처럼 바꿨어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'MODE_AUTO',
        label: '공기청정기 쾌적 모드',
        status: 'actual',
        thinqCommand: 'MODE_AUTO',
      },
      { device: 'TV', action: 'AMBIENT_VISUAL', label: '분위기 영상 재생', status: 'mock' },
      { device: 'SPEAKER', action: 'AMBIENT_SOUND', label: '자연 소리 재생', status: 'mock' },
      { device: 'LIGHT', action: 'SCENE', label: '분위기 조명 설정', status: 'planned' },
      { device: 'AC', action: 'BREEZE', label: '산들바람 설정', status: 'planned' },
    ],
  },
  MORNING_BRIEFING: {
    mode: 'MORNING_BRIEFING',
    description: '오늘의 컨디션과 케어 포인트를 아내와 남편 화면에 나눠 정리했어요',
    actions: [
      {
        device: 'AI_HUB',
        action: 'MORNING_BRIEFING',
        label: '굿모닝 브리핑 생성',
        status: 'mock',
      },
    ],
  },
}

const EMPTY_MODE_ACTIONS: ModeActions = {
  mode: 'UNKNOWN',
  description: '실행할 수 있는 모드를 찾지 못했어요',
  actions: [],
}

function cloneModeActions(modeActions: ModeActions): ModeActions {
  return {
    ...modeActions,
    actions: modeActions.actions.map((action) => ({ ...action })),
  }
}

function assertServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error('executeModeActions는 서버에서만 실행할 수 있습니다.')
  }
}

function parseThinQCommand(command: string): ThinQCommand {
  switch (command) {
    case 'POWER_ON':
    case 'POWER_OFF':
    case 'MODE_AUTO':
    case 'MODE_TURBO':
    case 'MODE_SLEEP':
    case 'MODE_SAVING':
    case 'NAUSEA_MODE':
      return { type: command }
    default:
      throw new Error(`지원하지 않는 ThinQ 명령입니다: ${command}`)
  }
}

const ACTUAL_DEVICE_ERROR = '실제 기기 연결 확인 필요'

async function runThinQActualCommand(thinqCommand: string) {
  const execute = (command: string) => controlAirPurifier(parseThinQCommand(command))
  let result = await execute(thinqCommand)

  if (!result.success && thinqCommand !== 'POWER_ON') {
    const powerOnResult = await execute('POWER_ON')
    if (powerOnResult.success) {
      result = await execute(thinqCommand)
    }
  }

  return result
}

function applyActualDeviceResult(action: DeviceAction, result: Awaited<ReturnType<typeof runThinQActualCommand>>) {
  const realFailure = !result.success || result.fallback === true

  action.success = !realFailure
  action.mock = result.mock
  action.fallback = result.fallback
  action.deviceStatus = result.deviceStatus
  action.executionStatus = realFailure ? 'failed' : 'success'

  if (realFailure) {
    action.error = ACTUAL_DEVICE_ERROR
    action.message = ACTUAL_DEVICE_ERROR
    action.executionMessage = ACTUAL_DEVICE_ERROR
    return
  }

  action.message = 'ThinQ 공기청정기 명령을 실행했어요.'
  action.executionMessage = action.message
}

export function getModeActions(mode: string): ModeActions {
  return cloneModeActions(mode in MODE_ACTIONS ? MODE_ACTIONS[mode as keyof typeof MODE_ACTIONS] : EMPTY_MODE_ACTIONS)
}

export async function executeModeActions(mode: string): Promise<DeviceAction[]> {
  assertServerOnly()

  console.log('[mode-actions] execute start:', { mode })

  const modeActions = getModeActions(mode)
  const executedActions = modeActions.actions.map((action) => ({ ...action }))

  for (const action of executedActions) {
    action.executedAt = new Date().toISOString()

    console.log('[mode-actions] action start:', {
      mode,
      device: action.device,
      action: action.action,
      status: action.status,
      thinqCommand: action.thinqCommand,
    })

    if (action.status === 'planned') {
      action.success = true
      action.executionStatus = 'skipped'
      action.executionMessage = 'ThinQ Mom 시나리오에 포함된 예정 기기 액션입니다.'
      console.log('[mode-actions] planned action skipped:', { mode, action: action.action })
      continue
    }

    if (action.status === 'mock') {
      action.success = true
      action.executionStatus = 'success'
      action.executionMessage = 'ThinQ Mom 데모 로그로 기록된 모의 액션입니다.'
      action.mock = true
      console.log('[mode-actions] mock action logged:', { mode, action: action.action })
      continue
    }

    if (!action.thinqCommand) {
      action.success = false
      action.message = '실제 ThinQ 명령이 연결되지 않은 액션입니다.'
      action.executionStatus = 'skipped'
      action.executionMessage = action.message
      continue
    }

    try {
      const result = await runThinQActualCommand(action.thinqCommand)
      applyActualDeviceResult(action, result)
      console.log('[mode-actions] actual action result:', {
        mode,
        action: action.action,
        thinqCommand: action.thinqCommand,
        success: action.success,
        mock: action.mock,
        fallback: action.fallback,
        deviceStatus: action.deviceStatus,
      })
    } catch (error) {
      action.success = false
      action.error = ACTUAL_DEVICE_ERROR
      action.message = ACTUAL_DEVICE_ERROR
      action.executionStatus = 'failed'
      action.executionMessage = ACTUAL_DEVICE_ERROR
      console.warn('[mode-actions] ThinQ actual action failed:', {
        mode,
        device: action.device,
        action: action.action,
        thinqCommand: action.thinqCommand,
        error,
      })
    }
  }

  console.log('[mode-actions] execute complete:', {
    mode,
    actions: executedActions.map((action) => ({
      action: action.action,
      success: action.success,
      executionStatus: action.executionStatus,
    })),
  })

  return executedActions
}
