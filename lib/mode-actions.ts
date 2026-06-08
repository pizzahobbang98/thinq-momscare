import { controlAirPurifier, type ThinQCommand } from '@/lib/thinq'

export type DeviceStatus = 'actual' | 'mock' | 'planned'

export interface DeviceAction {
  device: string
  action: string
  label: string
  status: DeviceStatus
  thinqCommand?: string
}

export interface ModeActions {
  mode: string
  description: string
  actions: DeviceAction[]
}

const MODE_ACTIONS: Record<string, ModeActions> = {
  NAUSEA_MODE: {
    mode: 'NAUSEA_MODE',
    description: '냄새 부담을 줄이는 환경으로 바꿨어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'POWER',
        label: '공기청정기 강력 모드',
        status: 'actual',
        thinqCommand: 'MODE_TURBO',
      },
      { device: 'AC', action: 'SOFT_WIND', label: '에어컨 약풍', status: 'planned' },
      { device: 'HOOD', action: 'STRONG_VENTILATION', label: '주방후드 강환기', status: 'planned' },
      { device: 'REFRIGERATOR', action: 'LOW_SMELL_MEAL', label: '냄새 낮은 식사 추천', status: 'mock' },
      { device: 'INDUCTION', action: 'LOW_SMELL_PRESET', label: '냄새 낮은 조리 설정', status: 'mock' },
    ],
  },
  SLEEP_MODE: {
    mode: 'SLEEP_MODE',
    description: '잠들기 좋은 침실 조건으로 맞췄어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'SLEEP',
        label: '공기청정기 수면 모드',
        status: 'actual',
        thinqCommand: 'MODE_SLEEP',
      },
      { device: 'AC', action: 'SLEEP_TEMP', label: '에어컨 수면 온도', status: 'planned' },
      { device: 'LIGHT', action: 'WARM_DIM', label: '조명 따뜻하게 낮추기', status: 'planned' },
      { device: 'TV', action: 'AUTO_OFF', label: 'TV 자동 종료', status: 'mock' },
      { device: 'ROBOT_CLEANER', action: 'NIGHT_BLOCK', label: '로봇청소기 야간 작동 금지', status: 'mock' },
    ],
  },
  HOUSEWORK_MODE: {
    mode: 'HOUSEWORK_MODE',
    description: '지금 바로 움직이지 않아도 되게 집안일 타이밍을 조정했어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'AUTO',
        label: '공기청정기 자동 모드',
        status: 'actual',
        thinqCommand: 'MODE_AUTO',
      },
      { device: 'WASHER', action: 'KEEP_CARE', label: '세탁기 세탁물 관리', status: 'mock' },
      { device: 'DRYER', action: 'WRINKLE_PREVENT', label: '건조기 구김 방지', status: 'mock' },
      { device: 'DISHWASHER', action: 'BUNDLE_ALERT', label: '식기세척기 완료 알림', status: 'mock' },
      { device: 'ROBOT_CLEANER', action: 'RESCHEDULE', label: '로봇청소기 일정 조정', status: 'mock' },
    ],
  },
  TRAVEL_MODE: {
    mode: 'TRAVEL_MODE',
    description: '집 안을 잠시 다른 장소처럼 바꿨어요',
    actions: [
      {
        device: 'AIR_PURIFIER',
        action: 'AUTO',
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

export function getModeActions(mode: string): ModeActions {
  return cloneModeActions(MODE_ACTIONS[mode] ?? EMPTY_MODE_ACTIONS)
}

export async function executeModeActions(mode: string): Promise<DeviceAction[]> {
  const modeActions = getModeActions(mode)
  const executedActions = modeActions.actions.map((action) => ({ ...action }))

  for (const action of executedActions) {
    if (action.status !== 'actual' || !action.thinqCommand) continue

    try {
      await controlAirPurifier(parseThinQCommand(action.thinqCommand))
    } catch (error) {
      console.warn('[mode-actions] ThinQ actual action failed:', {
        mode,
        device: action.device,
        action: action.action,
        thinqCommand: action.thinqCommand,
        error,
      })
    }
  }

  return executedActions
}
