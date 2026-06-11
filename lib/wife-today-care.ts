import type { CareLog } from '@/lib/care-log-storage'
import type { DeviceAction } from '@/lib/mode-actions'
import type { DiaryModeRun } from '@/lib/diary'

export type WifeModeRunDeviceResult = {
  device: string
  action: string
  label?: string
  status: 'actual' | 'mock' | 'planned'
}

export type WifeModeRun = {
  id: string
  mode: string
  mode_label: string
  created_at: string
  wife_card: string | null
  reply?: string | null
  input_text?: string | null
  signals?: string[] | null
  device_results: WifeModeRunDeviceResult[] | null
}

export type TodayCareCardContent = {
  headline: string
  description: string
  detailText: string | null
  hasTodayRun: boolean
  latestRun: WifeModeRun | null
  todayRuns: WifeModeRun[]
  insightSummary: string
}

const MODE_CARE_COPY: Record<
  string,
  { headline: string; description: string }
> = {
  NAUSEA_MODE: {
    headline: '오늘은 냄새 부담을 줄이는 케어가 도움이 될 수 있어요.',
    description:
      '허브 대화에서 냄새 민감 신호가 감지되어 공기청정기와 식사 환경을 조정했어요.',
  },
  SLEEP_MODE: {
    headline: '오늘은 잠들기 좋은 환경을 조금 일찍 준비하면 좋아요.',
    description:
      '피로와 수면 준비 신호를 바탕으로 공기와 소음을 낮추는 침실 환경을 추천했어요.',
  },
  TRAVEL_MODE: {
    headline: '오늘은 집 안에서도 잠시 휴양지처럼 쉬어갈 수 있게 분위기를 바꿔보면 좋아요.',
    description:
      '답답함이나 기분 전환 신호를 바탕으로 휴양지 분위기의 환경을 추천했어요.',
  },
  HOUSEWORK_MODE: {
    headline: '오늘은 무리하지 않는 가사 리듬이 도움이 될 수 있어요.',
    description:
      '몸의 무거움이나 가사 부담 신호를 바탕으로 집안일 타이밍을 조정했어요.',
  },
  MORNING_BRIEFING: {
    headline: '오늘 하루를 시작할 케어 포인트를 정리했어요.',
    description: 'ThinQ ON과의 아침 대화를 바탕으로 오늘의 케어 루틴을 준비했어요.',
  },
  ULTRASOUND_GROWTH: {
    headline: '오늘의 성장 기록이 추가됐어요.',
    description: '초음파 사진으로 오늘의 성장 순간을 따뜻하게 남겼어요.',
  },
}

const FALLBACK_CARE: TodayCareCardContent = {
  headline: '아직 오늘 실행된 케어가 없어요.',
  description:
    "허브에서 '입덧이 심해', '이제 잘 거야', '바다 보고 싶어'처럼 말하면 ThinQ Mom이 필요한 케어를 준비해드려요.",
  detailText: null,
  hasTodayRun: false,
  latestRun: null,
  todayRuns: [],
  insightSummary: '오늘은 ThinQ Mom과의 대화 기록을 바탕으로 필요한 케어를 준비했어요.',
}

function isTodayRun(createdAt: string, todayStartISO: string) {
  return new Date(createdAt).getTime() >= new Date(todayStartISO).getTime()
}

function getModeCopy(mode: string) {
  return (
    MODE_CARE_COPY[mode] ?? {
      headline: '오늘 필요한 케어를 ThinQ Mom이 준비했어요.',
      description: '허브 대화 기록을 바탕으로 환경을 조정했어요.',
    }
  )
}

function pickPrimaryRun(runs: WifeModeRun[]) {
  const withWifeCard = runs.find((run) => run.wife_card?.trim())
  if (withWifeCard) return withWifeCard
  const withReply = runs.find((run) => run.reply?.trim())
  if (withReply) return withReply
  return runs[0] ?? null
}

export function buildTodayCareCardContent(
  allRuns: WifeModeRun[],
  todayStartISO: string,
): TodayCareCardContent {
  const todayRuns = allRuns.filter((run) => isTodayRun(run.created_at, todayStartISO))
  const recentRuns = allRuns.slice(0, 5)

  if (todayRuns.length === 0) {
    if (recentRuns.length === 0) {
      return FALLBACK_CARE
    }

    const latest = pickPrimaryRun(recentRuns)
    if (!latest) return FALLBACK_CARE

    const copy = getModeCopy(latest.mode)
    const detail = latest.wife_card?.trim() || latest.reply?.trim() || null
    const headline =
      latest.mode === 'ULTRASOUND_GROWTH' && detail ? detail : copy.headline

    return {
      headline,
      description: detail ?? copy.description,
      detailText: detail,
      hasTodayRun: false,
      latestRun: latest,
      todayRuns: [],
      insightSummary: '최근 허브 대화 기록을 바탕으로 오늘의 케어를 준비했어요.',
    }
  }

  const latest = pickPrimaryRun(todayRuns)!
  const copy = getModeCopy(latest.mode)
  const detail = latest.wife_card?.trim() || latest.reply?.trim() || null
  const headline =
    latest.mode === 'ULTRASOUND_GROWTH' && detail ? detail : copy.headline

  return {
    headline,
    description: detail ?? copy.description,
    detailText: detail,
    hasTodayRun: true,
    latestRun: latest,
    todayRuns,
    insightSummary: '오늘은 ThinQ Mom과의 대화 기록을 바탕으로 필요한 케어를 준비했어요.',
  }
}

export function formatCareRunTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getActualDeviceResults(run: WifeModeRun) {
  return (run.device_results ?? []).filter((item) => item.status === 'actual')
}

export function getPreparedDeviceResults(run: WifeModeRun) {
  return (run.device_results ?? []).filter(
    (item) => item.status === 'mock' || item.status === 'planned',
  )
}

function mapCareLogDeviceResults(
  deviceResults: DeviceAction[] | undefined,
): WifeModeRunDeviceResult[] {
  return (deviceResults ?? []).map((action) => ({
    device: action.device,
    action: action.action,
    label: action.label,
    status: action.status ?? 'planned',
  }))
}

export function careLogToWifeModeRun(careLog: CareLog): WifeModeRun {
  return {
    id: careLog.id,
    mode: careLog.mode,
    mode_label: careLog.modeLabel,
    created_at: careLog.createdAt,
    wife_card: careLog.wifeCard ?? careLog.resultText,
    reply: careLog.resultText,
    input_text: careLog.userInput,
    signals: careLog.signals ?? null,
    device_results: mapCareLogDeviceResults(careLog.deviceResults),
  }
}

export function careLogToDiaryModeRun(careLog: CareLog): DiaryModeRun {
  return {
    mode: careLog.mode,
    mode_label: careLog.modeLabel,
    input_text: careLog.userInput,
    signals: careLog.signals ?? null,
    reply: careLog.resultText,
    wife_card: careLog.wifeCard ?? careLog.resultText,
    husband_card: careLog.husbandCard ?? null,
    device_results: careLog.deviceResults ?? null,
    created_at: careLog.createdAt,
  }
}

function enrichWifeModeRunFromCareLog(run: WifeModeRun, careLog: CareLog): WifeModeRun {
  return {
    ...run,
    wife_card: run.wife_card?.trim() || careLog.wifeCard || careLog.resultText,
    reply: run.reply?.trim() || careLog.resultText,
    input_text: run.input_text?.trim() || careLog.userInput,
    signals: run.signals ?? careLog.signals ?? null,
    device_results:
      (run.device_results?.length ?? 0) > 0
        ? run.device_results
        : mapCareLogDeviceResults(careLog.deviceResults),
  }
}

/** Supabase mode_runs와 허브 localStorage 케어 로그를 합칩니다. */
export function mergeWifeModeRunsWithCareLogs(
  remoteRuns: WifeModeRun[],
  localLogs: CareLog[],
): WifeModeRun[] {
  const localById = new Map(localLogs.map((log) => [log.id, log]))
  const enrichedRemote = remoteRuns.map((run) => {
    const local = localById.get(run.id)
    return local ? enrichWifeModeRunFromCareLog(run, local) : run
  })
  const remoteIds = new Set(remoteRuns.map((run) => run.id))
  const localOnly = localLogs
    .filter((log) => !remoteIds.has(log.id))
    .map(careLogToWifeModeRun)

  return [...localOnly, ...enrichedRemote]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)
}
