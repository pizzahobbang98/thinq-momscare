export type DemoStage = 'preparing' | 'pregnant'
export type DemoRole = 'wife' | 'husband' | 'hub'
export type DemoTab = 'home' | 'devices' | 'care' | 'menu'

export const DEMO_FIXED_WEEKS: Record<DemoStage, number> = {
  preparing: 0,
  pregnant: 18,
}

export const DEMO_STAGE_LABELS: Record<DemoStage, string> = {
  preparing: '임신준비중',
  pregnant: '임신중',
}

export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  wife: '아내',
  husband: '남편',
  hub: '허브',
}

export const DEMO_CONSOLE_STORAGE_KEY = 'thinq-mom-demo-console'
export const DEMO_TRACK_STORAGE_PREFIX = 'thinq-mom-demo-track'

export type DemoConsoleState = {
  stage: DemoStage
  role: DemoRole
  tab: DemoTab
  fixedWeeks: Record<DemoStage, number>
  emergencyTest: boolean
}

export type DemoTrackRecord = {
  id: string
  kind: 'utterance' | 'care' | 'diary'
  title: string
  detail: string
  createdAt: string
}

export const DEFAULT_DEMO_CONSOLE_STATE: DemoConsoleState = {
  stage: 'preparing',
  role: 'wife',
  tab: 'home',
  fixedWeeks: DEMO_FIXED_WEEKS,
  emergencyTest: false,
}

function getStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function getDemoTrackStorageKey(stage: DemoStage) {
  return `${DEMO_TRACK_STORAGE_PREFIX}:${stage}`
}

export function readDemoConsoleState(): DemoConsoleState {
  try {
    const raw = getStorage()?.getItem(DEMO_CONSOLE_STORAGE_KEY)
    if (!raw) return DEFAULT_DEMO_CONSOLE_STATE
    const parsed = JSON.parse(raw) as Partial<DemoConsoleState>
    return {
      stage: parsed.stage === 'pregnant' ? 'pregnant' : 'preparing',
      role: parsed.role === 'husband' || parsed.role === 'hub' ? parsed.role : 'wife',
      tab:
        parsed.tab === 'devices' || parsed.tab === 'care' || parsed.tab === 'menu'
          ? parsed.tab
          : 'home',
      fixedWeeks: {
        preparing: 0,
        pregnant:
          Number.isInteger(parsed.fixedWeeks?.pregnant) &&
          (parsed.fixedWeeks?.pregnant ?? 0) > 0
            ? parsed.fixedWeeks!.pregnant
            : DEMO_FIXED_WEEKS.pregnant,
      },
      emergencyTest: parsed.emergencyTest === true,
    }
  } catch {
    return DEFAULT_DEMO_CONSOLE_STATE
  }
}

export function saveDemoConsoleState(state: DemoConsoleState) {
  try {
    getStorage()?.setItem(DEMO_CONSOLE_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('[demo-console] state save failed:', error)
  }
}

export function readDemoTrack(stage: DemoStage): DemoTrackRecord[] {
  try {
    const raw = getStorage()?.getItem(getDemoTrackStorageKey(stage))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DemoTrackRecord[]) : []
  } catch {
    return []
  }
}

export function appendDemoTrackRecord(
  stage: DemoStage,
  record: Omit<DemoTrackRecord, 'id' | 'createdAt'>,
) {
  const next = [
    {
      ...record,
      id: `${stage}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    },
    ...readDemoTrack(stage),
  ].slice(0, 12)

  try {
    getStorage()?.setItem(getDemoTrackStorageKey(stage), JSON.stringify(next))
  } catch (error) {
    console.warn('[demo-console] track save failed:', error)
  }
  return next
}

export function resetDemoTrack(stage: DemoStage) {
  try {
    getStorage()?.removeItem(getDemoTrackStorageKey(stage))
  } catch (error) {
    console.warn('[demo-console] track reset failed:', error)
  }
}

export function buildDemoDetailUrl(stage: DemoStage, role: DemoRole, weeks: number) {
  const params = new URLSearchParams({
    status: stage,
    demo: 'true',
    track: stage,
    name: stage === 'pregnant' ? '튼튼이' : '우리의 내일',
  })
  if (stage === 'pregnant') params.set('weeks', String(weeks))
  return `/${role}?${params.toString()}`
}
