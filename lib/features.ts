import { supabase, DEMO_WIFE_ID } from '@/lib/supabase'

export type FeatureStatusBadge = 'available' | 'demo' | 'planned' | 'ai' | 'shared'

export type DeviceStatusPayload = {
  power?: string
  mode?: string
  pm25?: number
  routine?: string
  devices?: string[]
  source?: string
  mock?: boolean
  travelMode?: string
  message?: string
}

export const MOCK_MEAL_RECOMMENDATION = {
  name: '두부계란찜',
  smell: '조리 냄새 낮음',
  time: '8분',
  note: '오래 서 있지 않아도 돼요',
  ingredients: ['두부', '계란', '대파'],
}

export async function logFeatureEvent(
  eventType: string,
  deviceStatus: DeviceStatusPayload,
  triggeredBy: 'APP' | 'AI' = 'APP',
) {
  const { error } = await supabase.from('device_events').insert({
    user_id: DEMO_WIFE_ID,
    event_type: eventType,
    triggered_by: triggeredBy,
    device_status: deviceStatus,
  })

  if (error) throw error
}

export async function sendRoleMessage(fromRole: 'husband' | 'wife', content: string) {
  const { error } = await supabase.from('messages').insert({
    from_role: fromRole,
    content,
  })

  if (error) throw error
}

export async function sendHusbandHeart() {
  const { error } = await supabase.from('hearts').insert({
    from_role: 'husband',
  })

  if (error) throw error
}

export async function controlThinQ(command: string) {
  const response = await fetch('/api/thinq/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })

  const data = (await response.json()) as { error?: string; deviceStatus?: DeviceStatusPayload }

  if (!response.ok) {
    throw new Error(data.error ?? 'ThinQ control failed')
  }

  return data
}

export async function fetchThinQState() {
  const response = await fetch('/api/thinq/state', { cache: 'no-store' })
  const data = (await response.json()) as {
    power?: string
    mode?: string
    uiMode?: string
    jobMode?: string
    error?: string
  }

  if (!response.ok) {
    throw new Error(data.error ?? 'ThinQ state failed')
  }

  return data
}

export function isSleepModeActive(state: {
  uiMode?: string | null
  mode?: string
  jobMode?: string
}): boolean {
  return (
    state.uiMode === 'SLEEP' ||
    state.jobMode === 'SLEEP' ||
    state.mode === 'SLEEP'
  )
}
