export type SpotlightRole = 'wife' | 'husband'

export type SpotlightAction = {
  label: string
}

export type SpotlightContent = {
  role: SpotlightRole
  title: string
  headline: string
  description: string
  modeLabels?: string[]
  actions?: SpotlightAction[]
  primaryLabel: string
  secondaryLabel?: string
}

type ModeRunDeviceResult = {
  device?: unknown
  action?: unknown
  label?: unknown
  status?: unknown
}

type ModeRunLike = {
  mode?: unknown
  mode_label?: unknown
  modeLabel?: unknown
  wife_card?: unknown
  wifeCard?: unknown
  husband_card?: unknown
  husbandCard?: unknown
  reply?: unknown
  device_results?: unknown
  deviceResults?: unknown
}

const ROLE_STORAGE_PREFIX: Record<SpotlightRole, string> = {
  wife: 'thinq-mom-wife-spotlight-dismissed',
  husband: 'thinq-mom-husband-spotlight-dismissed',
}

const MODE_LABEL_FALLBACKS: Record<string, string> = {
  NAUSEA_MODE: '입덧모드',
  AIR_OFF: '공기청정기 끄기',
  SLEEP_MODE: '수면모드',
  HOUSEWORK_MODE: '가사케어 모드',
  TRAVEL_MODE: '여행 모드',
  MORNING_BRIEFING: '굿모닝 브리핑',
  UNKNOWN: '알 수 없음',
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(values.map(parseString).filter((value): value is string => Boolean(value))),
  )
}

function getModeLabel(modeRun: ModeRunLike) {
  const modeLabel = parseString(modeRun.mode_label) ?? parseString(modeRun.modeLabel)
  if (modeLabel) return modeLabel

  const mode = parseString(modeRun.mode)
  return mode ? MODE_LABEL_FALLBACKS[mode] ?? mode : null
}

function getDeviceActions(modeRun: ModeRunLike): SpotlightAction[] {
  const rawResults = modeRun.device_results ?? modeRun.deviceResults
  if (!Array.isArray(rawResults)) return []

  return rawResults
    .filter(isRecord)
    .map((result: ModeRunDeviceResult) => parseString(result.label) ?? parseString(result.action))
    .filter((label): label is string => Boolean(label))
    .map((label) => ({ label }))
}

export function getTodayKey(role: SpotlightRole): string {
  return `${ROLE_STORAGE_PREFIX[role]}-${getLocalDateKey()}`
}

export function hasDismissedToday(role: SpotlightRole): boolean {
  const storage = getStorage()
  if (!storage) return false

  try {
    return storage.getItem(getTodayKey(role)) === 'true'
  } catch {
    return false
  }
}

export function dismissToday(role: SpotlightRole): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(getTodayKey(role), 'true')
  } catch {
    // Storage can be unavailable in private browsing or restricted WebViews.
  }
}

export function makeFallbackWifeSpotlight(): SpotlightContent {
  return {
    role: 'wife',
    title: '오늘 엄마품 케어 🌸',
    headline: '오늘은 무리하지 않아도 되도록 집이 먼저 준비할게요.',
    description:
      '최근 상태를 바탕으로 필요한 케어를 확인하고, 입덧·수면·가사·여행 모드 중 필요한 환경을 추천해드릴게요.',
    primaryLabel: '오늘 케어 확인했어요',
    secondaryLabel: '나중에 볼게요',
  }
}

export function makeFallbackHusbandSpotlight(): SpotlightContent {
  return {
    role: 'husband',
    title: '오늘의 아빠손길 💙',
    headline: '오늘 필요한 배려를 행동으로 알려드려요.',
    description:
      '아내의 상태를 감시하는 화면이 아니라, 오늘 할 수 있는 작은 행동을 알려주는 카드입니다.',
    primaryLabel: '배려 행동 확인했어요',
    secondaryLabel: '나중에 볼게요',
  }
}

export function normalizeSpotlightFromModeRun(
  modeRun: unknown,
  role: SpotlightRole,
): SpotlightContent {
  const fallback =
    role === 'wife' ? makeFallbackWifeSpotlight() : makeFallbackHusbandSpotlight()

  if (!isRecord(modeRun)) return fallback

  const run = modeRun as ModeRunLike
  const modeLabel = getModeLabel(run)
  const description =
    role === 'wife'
      ? parseString(run.wife_card) ?? parseString(run.wifeCard) ?? parseString(run.reply)
      : parseString(run.husband_card) ?? parseString(run.husbandCard) ?? parseString(run.reply)
  const modeLabels = uniqueStrings([modeLabel])
  const actions = role === 'husband' ? getDeviceActions(run) : []

  return {
    ...fallback,
    headline:
      role === 'wife'
        ? modeLabel
          ? `${modeLabel}로 오늘의 케어를 준비했어요.`
          : fallback.headline
        : modeLabel
          ? `${modeLabel}에 맞춘 배려 행동을 확인해보세요.`
          : fallback.headline,
    description: description ?? fallback.description,
    modeLabels: modeLabels.length > 0 ? modeLabels : fallback.modeLabels,
    actions: actions.length > 0 ? actions : fallback.actions,
  }
}
