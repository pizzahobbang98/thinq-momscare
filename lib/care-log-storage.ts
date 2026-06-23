import type { DeviceAction } from '@/lib/mode-actions'
import { saveModeExecutionLog } from '@/lib/mode-execution-log'
import { DEMO_WIFE_ID, supabase } from '@/lib/supabase'

export const CARE_LOG_STORAGE_KEY = 'thinq-mom-care-logs'
/** @alias CARE_LOG_STORAGE_KEY */
export const CARE_LOGS_STORAGE_KEY = CARE_LOG_STORAGE_KEY
export const PENDING_CARE_LOG_STORAGE_KEY = 'thinq-mom-pending-care-logs'
/** @alias PENDING_CARE_LOG_STORAGE_KEY */
export const PENDING_CARE_LOGS_STORAGE_KEY = PENDING_CARE_LOG_STORAGE_KEY
const LEGACY_HUB_CARE_LOG_KEY = 'thinq-mom-hub-care-logs'
const MAX_STORED_LOGS = 30

export type CareLogSource = 'voice' | 'text' | 'demo' | string

export type CareLog = {
  id: string
  mode: string
  modeLabel: string
  userInput: string
  resultText: string
  createdAt: string
  source: CareLogSource
  synced?: boolean
  signals?: string[]
  wifeCard?: string
  husbandCard?: string
  deviceResults?: DeviceAction[]
  simulationScene?: string | null
  simulationText?: string | null
  reason?: string
  recommendedModes?: string[]
}

/** @deprecated use CareLog */
export type HubCareLogEntry = {
  id: string
  mode: string
  mode_label: string
  source: string
  input_text: string
  signals: string[]
  reply: string
  wife_card: string
  husband_card: string
  device_results: DeviceAction[]
  created_at: string
  simulationScene?: string | null
  simulationText?: string | null
  synced?: boolean
}

/** @deprecated use CARE_LOG_STORAGE_KEY */
export const HUB_CARE_LOG_STORAGE_KEY = CARE_LOG_STORAGE_KEY

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function createCareLogId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `care-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function normalizeCareLogSource(source: string): CareLogSource {
  const normalized = source.toLowerCase()
  if (normalized.includes('voice')) return 'voice'
  if (normalized.includes('chip') || normalized.includes('example') || normalized.includes('demo')) {
    return 'demo'
  }
  return 'text'
}

function readJsonArray<T>(key: string): T[] {
  try {
    const storage = getStorage()
    if (!storage) return []

    const raw = storage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn(`[care-log] read failed (${key})`, error)
    return []
  }
}

function writeJsonArray<T>(key: string, items: T[]) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(key, JSON.stringify(items))
}

function legacyEntryToCareLog(entry: HubCareLogEntry): CareLog {
  return {
    id: entry.id,
    mode: entry.mode,
    modeLabel: entry.mode_label,
    userInput: entry.input_text,
    resultText: entry.reply,
    createdAt: entry.created_at,
    source: normalizeCareLogSource(entry.source),
    synced: entry.synced,
    signals: entry.signals,
    wifeCard: entry.wife_card,
    husbandCard: entry.husband_card,
    deviceResults: entry.device_results,
    simulationScene: entry.simulationScene,
    simulationText: entry.simulationText,
  }
}

function careLogToLegacyEntry(log: CareLog): HubCareLogEntry {
  return {
    id: log.id,
    mode: log.mode,
    mode_label: log.modeLabel,
    source: log.source,
    input_text: log.userInput,
    signals: log.signals ?? [],
    reply: log.resultText,
    wife_card: log.wifeCard ?? log.resultText,
    husband_card: log.husbandCard ?? '',
    device_results: log.deviceResults ?? [],
    created_at: log.createdAt,
    simulationScene: log.simulationScene,
    simulationText: log.simulationText,
    synced: log.synced,
  }
}

function migrateLegacyCareLogsIfNeeded() {
  const storage = getStorage()
  if (!storage) return

  const current = readJsonArray<CareLog>(CARE_LOG_STORAGE_KEY)
  if (current.length > 0) return

  const legacy = readJsonArray<HubCareLogEntry>(LEGACY_HUB_CARE_LOG_KEY)
  if (legacy.length === 0) return

  writeJsonArray(
    CARE_LOG_STORAGE_KEY,
    legacy.map(legacyEntryToCareLog),
  )
}

export function readCareLogsFromLocalStorage(): CareLog[] {
  migrateLegacyCareLogsIfNeeded()

  return readJsonArray<CareLog>(CARE_LOG_STORAGE_KEY)
    .filter((entry) => entry?.mode && entry?.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/** @deprecated use readCareLogsFromLocalStorage */
export function readHubCareLogsFromLocalStorage(): HubCareLogEntry[] {
  return readCareLogsFromLocalStorage().map(careLogToLegacyEntry)
}

export function saveCareLogToLocalStorage(
  entry: Omit<CareLog, 'id' | 'createdAt' | 'synced'> & {
    id?: string
    createdAt?: string
    synced?: boolean
  },
): CareLog {
  const savedEntry: CareLog = {
    ...entry,
    id: entry.id ?? createCareLogId(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    source: normalizeCareLogSource(String(entry.source)),
    synced: entry.synced ?? false,
  }

  try {
    const existing = readCareLogsFromLocalStorage()
    const next = [savedEntry, ...existing.filter((item) => item.id !== savedEntry.id)].slice(
      0,
      MAX_STORED_LOGS,
    )
    writeJsonArray(CARE_LOG_STORAGE_KEY, next)
  } catch (error) {
    console.warn('[care-log] local save failed', error)
  }

  return savedEntry
}

/** @deprecated use saveCareLogToLocalStorage */
export function saveHubCareLogToLocalStorage(
  entry: Omit<HubCareLogEntry, 'id' | 'created_at'> & {
    id?: string
    created_at?: string
    synced?: boolean
  },
): HubCareLogEntry {
  const saved = saveCareLogToLocalStorage({
    id: entry.id,
    mode: entry.mode,
    modeLabel: entry.mode_label,
    userInput: entry.input_text,
    resultText: entry.reply,
    createdAt: entry.created_at,
    source: entry.source,
    synced: entry.synced,
    signals: entry.signals,
    wifeCard: entry.wife_card,
    husbandCard: entry.husband_card,
    deviceResults: entry.device_results,
    simulationScene: entry.simulationScene,
    simulationText: entry.simulationText,
  })

  return careLogToLegacyEntry(saved)
}

export function markCareLogSynced(careLogId: string) {
  try {
    const logs = readCareLogsFromLocalStorage()
    const next = logs.map((log) => (log.id === careLogId ? { ...log, synced: true } : log))
    writeJsonArray(CARE_LOG_STORAGE_KEY, next)
    removePendingCareLog(careLogId)
  } catch (error) {
    console.warn('[care-log] mark synced failed', error)
  }
}

export function readPendingCareLogs(): CareLog[] {
  return readJsonArray<CareLog>(PENDING_CARE_LOG_STORAGE_KEY).filter(
    (entry) => entry?.id && entry?.mode,
  )
}

export function addPendingCareLog(careLog: CareLog) {
  try {
    const pending = readPendingCareLogs()
    if (pending.some((entry) => entry.id === careLog.id)) return

    writeJsonArray(PENDING_CARE_LOG_STORAGE_KEY, [{ ...careLog, synced: false }, ...pending])
  } catch (error) {
    console.warn('[care-log] pending queue add failed', error)
  }
}

export function removePendingCareLog(careLogId: string) {
  try {
    const pending = readPendingCareLogs().filter((entry) => entry.id !== careLogId)
    writeJsonArray(PENDING_CARE_LOG_STORAGE_KEY, pending)
  } catch (error) {
    console.warn('[care-log] pending queue remove failed', error)
  }
}

function getTriggeredBy(source: string) {
  const normalizedSource = source.toLowerCase()
  if (normalizedSource.includes('voice')) return 'VOICE'
  if (normalizedSource.includes('text') || normalizedSource.includes('chip')) return 'APP'
  return source.toUpperCase()
}

function getDeviceEventType(mode: string, action: DeviceAction) {
  if (mode === 'AIR_OFF' || action.thinqCommand === 'POWER_OFF') return 'AIR_OFF'
  if (mode === 'AIR_ON' || action.thinqCommand === 'POWER_ON') return 'AIR_ON'
  return mode
}

function buildDeviceEventRows(mode: string, source: string, deviceResults: DeviceAction[] = []) {
  return deviceResults
    .filter((action) => action.status === 'actual' && action.deviceStatus && action.success !== false)
    .map((action) => ({
      user_id: DEMO_WIFE_ID,
      event_type: getDeviceEventType(mode, action),
      triggered_by: getTriggeredBy(source),
      device_status: {
        power: action.deviceStatus?.power ?? 'UNKNOWN',
        mode: action.deviceStatus?.uiMode ?? action.deviceStatus?.mode ?? 'UNKNOWN',
        pm25: action.deviceStatus?.pm25 ?? 0,
      },
    }))
}

export async function saveCareLogToSupabase(careLog: CareLog): Promise<void> {
  const deviceResults = careLog.deviceResults ?? []

  const { error: modeRunError } = await supabase.from('mode_runs').upsert(
    {
      id: careLog.id,
      mode: careLog.mode,
      mode_label: careLog.modeLabel,
      source: careLog.source,
      input_text: careLog.userInput,
      signals: careLog.signals ?? [],
      reply: careLog.resultText,
      wife_card: careLog.wifeCard ?? careLog.resultText,
      husband_card: careLog.husbandCard ?? '',
      device_results: deviceResults,
      created_at: careLog.createdAt,
    },
    { onConflict: 'id' },
  )

  if (modeRunError) {
    throw modeRunError
  }

  await saveModeExecutionLog(supabase, {
    id: careLog.id,
    mode: careLog.mode,
    modeLabel: careLog.modeLabel,
    source: careLog.source,
    inputText: careLog.userInput,
    signals: careLog.signals,
  })

  const deviceEventRows = buildDeviceEventRows(careLog.mode, String(careLog.source), deviceResults)
  if (deviceEventRows.length > 0) {
    const { error: deviceEventError } = await supabase.from('device_events').insert(deviceEventRows)
    if (deviceEventError) {
      console.warn('[care-log] device_events sync failed', deviceEventError)
    }
  }

  if (careLog.husbandCard) {
    const { error: messageError } = await supabase.from('messages').insert({
      from_role: 'system',
      content: careLog.husbandCard,
    })

    if (messageError) {
      console.warn('[care-log] messages sync failed', messageError)
    }
  }
}

export async function syncCareLogToSupabase(careLog: CareLog): Promise<boolean> {
  try {
    await saveCareLogToSupabase(careLog)
    markCareLogSynced(careLog.id)
    return true
  } catch (error) {
    console.warn('[care-log] Supabase save failed', error)
    addPendingCareLog(careLog)
    return false
  }
}

export async function retryPendingCareLogSync(): Promise<number> {
  const pending = readPendingCareLogs()
  if (pending.length === 0) return 0

  let syncedCount = 0

  for (const careLog of pending) {
    const success = await syncCareLogToSupabase(careLog)
    if (success) syncedCount += 1
  }

  if (syncedCount > 0) {
    console.log(`[care-log] pending sync retried: ${syncedCount}/${pending.length}`)
  }

  return syncedCount
}

export function careLogToModeRunLog(careLog: CareLog) {
  return {
    id: careLog.id,
    mode: careLog.mode,
    mode_label: careLog.modeLabel,
    created_at: careLog.createdAt,
    reply: careLog.resultText,
    device_results: careLog.deviceResults ?? [],
  }
}

/** @deprecated use careLogToModeRunLog */
export function hubCareLogToModeRunLog(entry: HubCareLogEntry) {
  return careLogToModeRunLog(legacyEntryToCareLog(entry))
}

export function mergeModeRunLogsWithLocal<T extends { id: string; created_at: string }>(
  remoteLogs: T[],
  localLogs: CareLog[] | HubCareLogEntry[],
  mapLocal?: (entry: HubCareLogEntry) => T,
): T[] {
  const normalizedLocal: CareLog[] = localLogs.map((entry) =>
    'modeLabel' in entry ? entry : legacyEntryToCareLog(entry),
  )

  const remoteIds = new Set(remoteLogs.map((log) => log.id))
  const localOnly = normalizedLocal
    .filter((entry) => !remoteIds.has(entry.id))
    .map((entry) =>
      mapLocal
        ? mapLocal(careLogToLegacyEntry(entry))
        : (careLogToModeRunLog(entry) as unknown as T),
    )

  return [...localOnly, ...remoteLogs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
}

export function buildCareLogFromExecution(options: {
  id?: string
  inputText: string
  source: string
  mode: string
  modeLabel: string
  signals?: string[]
  reason?: string
  reply: string
  wifeCard: string
  husbandCard: string
  deviceResults?: DeviceAction[]
  simulationScene?: string | null
  simulationText?: string | null
  recommendedModes?: string[]
  synced?: boolean
}): CareLog {
  return {
    id: options.id ?? createCareLogId(),
    mode: options.mode,
    modeLabel: options.modeLabel,
    userInput: options.inputText,
    resultText: options.reply,
    createdAt: new Date().toISOString(),
    source: normalizeCareLogSource(options.source),
    synced: options.synced ?? false,
    signals: options.signals ?? [],
    wifeCard: options.wifeCard,
    husbandCard: options.husbandCard,
    deviceResults: options.deviceResults ?? [],
    simulationScene: options.simulationScene,
    simulationText: options.simulationText,
    reason: options.reason,
    recommendedModes: options.recommendedModes,
  }
}

/** @alias buildCareLogFromExecution */
export const createCareLog = buildCareLogFromExecution

export function careLogToHubModeResult(log: CareLog) {
  return {
    mode: log.mode,
    modeLabel: log.modeLabel,
    signals: log.signals ?? [],
    reason: log.reason,
    reply: log.resultText,
    wifeCard: log.wifeCard ?? log.resultText,
    husbandCard: log.husbandCard ?? '',
    deviceResults: log.deviceResults ?? [],
    recommendedModes: log.recommendedModes,
    simulationScene: log.simulationScene,
    simulationText: log.simulationText,
    demoUpdatedAt: log.createdAt,
  }
}

/** localStorage 저장 이후 Supabase를 백그라운드로 동기화합니다. */
export function backgroundSyncCareLog(careLog: CareLog, serverAlreadySynced = false) {
  if (serverAlreadySynced) {
    markCareLogSynced(careLog.id)
    return
  }

  void saveCareLogToSupabase(careLog)
    .then(() => {
      markCareLogSynced(careLog.id)
    })
    .catch((error) => {
      console.warn('[care-log] Supabase save failed', error)
      addPendingCareLog(careLog)
    })
}
