import type { ThinQUiMode } from '@/lib/thinq'

export type ThinQStateApiResponse = {
  power?: 'ON' | 'OFF' | null
  mode?: string | null
  jobMode?: string | null
  fanSpeed?: string | null
  pm25?: number | null
  pm10?: number | null
  pm2Level?: string | null
  totalPollutionLevel?: string | null
  odorLevel?: string | null
  temperature?: number | null
  humidity?: number | null
  uiMode?: ThinQUiMode | null
  mock?: boolean
  fallback?: boolean
  error?: string
}

export type ThinQDeviceStateView = {
  loading: boolean
  connected: boolean
  online: boolean
  error?: string
  power: 'ON' | 'OFF' | null
  mode: string | null
  jobMode: string | null
  fanSpeed: string | null
  uiMode: ThinQUiMode | null
  pm25: number | null
  pm10: number | null
  pm2Level: string | null
  totalPollutionLevel: string | null
  odorLevel: string | null
  temperature: number | null
  humidity: number | null
  lastFetchedAt: number | null
}

export const EMPTY_THINQ_DEVICE_STATE: ThinQDeviceStateView = {
  loading: true,
  connected: false,
  online: false,
  power: null,
  mode: null,
  jobMode: null,
  fanSpeed: null,
  uiMode: null,
  pm25: null,
  pm10: null,
  pm2Level: null,
  totalPollutionLevel: null,
  odorLevel: null,
  temperature: null,
  humidity: null,
  lastFetchedAt: null,
}

export function isTrustedThinQReading(data: ThinQStateApiResponse): boolean {
  return data.mock === false && data.fallback !== true && !data.error
}

export function mapThinQStateResponse(data: ThinQStateApiResponse): ThinQDeviceStateView {
  const trusted = isTrustedThinQReading(data)

  if (!trusted) {
    return {
      loading: false,
      connected: false,
      online: false,
      error: data.error ?? '연결 확인 필요',
      power: null,
      mode: null,
      jobMode: null,
      fanSpeed: null,
      uiMode: null,
      pm25: null,
      pm10: null,
      pm2Level: null,
      totalPollutionLevel: null,
      odorLevel: null,
      temperature: null,
      humidity: null,
      lastFetchedAt: Date.now(),
    }
  }

  return {
    loading: false,
    connected: true,
    online: true,
    power: data.power ?? null,
    mode: data.mode ?? null,
    jobMode: data.jobMode ?? null,
    fanSpeed: data.fanSpeed ?? null,
    uiMode: data.uiMode ?? null,
    pm25: typeof data.pm25 === 'number' && Number.isFinite(data.pm25) ? data.pm25 : null,
    pm10: typeof data.pm10 === 'number' && Number.isFinite(data.pm10) ? data.pm10 : null,
    pm2Level: data.pm2Level ?? null,
    totalPollutionLevel: data.totalPollutionLevel ?? null,
    odorLevel: data.odorLevel ?? null,
    temperature:
      typeof data.temperature === 'number' && Number.isFinite(data.temperature)
        ? data.temperature
        : null,
    humidity:
      typeof data.humidity === 'number' && Number.isFinite(data.humidity) ? data.humidity : null,
    lastFetchedAt: Date.now(),
  }
}

export async function fetchThinQDeviceState(): Promise<ThinQDeviceStateView> {
  const response = await fetch('/api/thinq/state', { cache: 'no-store' })
  const data = (await response.json()) as ThinQStateApiResponse
  return mapThinQStateResponse(data)
}

export function formatThinQMetric(value: number | null, suffix = ''): string {
  if (value === null) return '--'
  return `${value}${suffix}`
}

export function formatThinQTemperature(value: number | null): string {
  if (value === null) return '--'
  return `${Math.round(value)}°`
}

export function formatThinQHumidity(value: number | null): string {
  if (value === null) return '--'
  return `${Math.round(value)}%`
}

export function formatThinQPollutionLevel(value: string | null): string {
  if (!value) return '--'
  if (value.toUpperCase() === 'GOOD') return '좋음'
  return value
}

export function formatThinQOdorLevel(value: string | null): string {
  if (!value) return '--'
  if (value.toUpperCase() === 'WEAK') return '약함'
  return value
}

export function getThinQAirQualityLabel(pm25: number | null, pm2Level: string | null): string {
  if (pm2Level) {
    const normalized = pm2Level.toUpperCase()
    if (normalized === 'GOOD') return '좋음'
    if (normalized === 'MODERATE' || normalized === 'NORMAL') return '보통'
    if (normalized === 'BAD' || normalized === 'VERY_BAD' || normalized === 'POOR') return '나쁨'
  }

  if (pm25 === null) return '연결 확인 필요'
  if (pm25 <= 15) return '좋음'
  if (pm25 <= 35) return '보통'
  return '나쁨'
}

export function getThinQFanLevel(fanSpeed: string | null, power: 'ON' | 'OFF' | null): number {
  if (power !== 'ON') return 0
  const normalized = (fanSpeed ?? '').toUpperCase()
  if (normalized === 'LOW') return 1
  if (normalized === 'MID' || normalized === 'AUTO') return 2
  if (normalized === 'HIGH' || normalized === 'POWER') return 3
  return 2
}

export function getThinQOperationLabel(state: Pick<
  ThinQDeviceStateView,
  'power' | 'uiMode' | 'jobMode' | 'fanSpeed' | 'mode'
>): string {
  if (state.power !== 'ON') return '전원 꺼짐'
  if (state.jobMode === 'SLEEP' || state.uiMode === 'SLEEP') return '수면 운전'
  if (state.uiMode === 'TURBO' || state.fanSpeed === 'POWER' || state.fanSpeed === 'HIGH') {
    return '터보 운전'
  }
  if (state.uiMode === 'AUTO' || state.jobMode === 'CLEAN') return '자동 운전'
  if (state.uiMode === 'SAVING' || state.fanSpeed === 'LOW') return '절전 운전'
  if (state.mode) return `${state.mode} 운전`
  return '운전 중'
}

export function getThinQOnlineLabel(state: Pick<ThinQDeviceStateView, 'connected' | 'online' | 'error'>): string {
  if (state.connected && state.online) return '온라인'
  return state.error ?? '오프라인'
}
