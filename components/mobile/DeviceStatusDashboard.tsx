'use client'

import type { DemoCareState } from '@/lib/shared-demo-state'

type DeviceStatusDashboardProps = {
  routine: string | null
  routineLabel: string | null
  careState: DemoCareState
}

type DevicePresentation = {
  purifierPower: boolean
  purifierMode: string
  purifierDescription: string
  fanLevel: number
  pm25: number
  screenTitle: string
  screenDescription: string
  screenTone: string
  lightLevel: number
  lightDescription: string
}

const DEFAULT_PRESENTATION: DevicePresentation = {
  purifierPower: true,
  purifierMode: '자동',
  purifierDescription: '실내 공기질에 맞춰 풍량을 자동으로 조절해요',
  fanLevel: 2,
  pm25: 9,
  screenTitle: '홈 화면',
  screenDescription: '케어 콘텐츠 재생을 기다리고 있어요',
  screenTone: 'from-[#c7dbe7] via-[#e6e0d5] to-[#c9d7bc]',
  lightLevel: 65,
  lightDescription: '편안한 주백색 조명',
}

function getDevicePresentation(routine: string | null): DevicePresentation {
  switch (routine) {
    case 'AIR_OFF':
      return {
        ...DEFAULT_PRESENTATION,
        purifierPower: false,
        purifierMode: '꺼짐',
        purifierDescription: '현재 전원이 꺼져 있어 공기를 정화하지 않아요',
        fanLevel: 0,
        pm25: 14,
      }
    case 'NAUSEA_MODE':
      return {
        ...DEFAULT_PRESENTATION,
        purifierMode: '터보',
        purifierDescription: '강한 바람으로 냄새와 답답한 공기를 빠르게 정화해요',
        fanLevel: 3,
        pm25: 6,
        screenTitle: '산뜻한 주방 가이드',
        screenDescription: '냄새 부담을 낮추는 콘텐츠 재생 중',
        screenTone: 'from-[#d8f2e9] via-[#f7f2d4] to-[#c6e8e7]',
        lightLevel: 80,
        lightDescription: '환기를 돕는 밝은 조명',
      }
    case 'SLEEP_MODE':
      return {
        ...DEFAULT_PRESENTATION,
        purifierMode: '수면',
        purifierDescription: '소음과 표시등을 낮춰 조용하게 공기를 관리해요',
        fanLevel: 1,
        pm25: 8,
        screenTitle: '수면 호흡 가이드',
        screenDescription: '화면 밝기를 낮춰 재생 중',
        screenTone: 'from-[#343b68] via-[#6f7195] to-[#c8a9a0]',
        lightLevel: 25,
        lightDescription: '따뜻하고 은은한 취침 조명',
      }
    case 'HOUSEWORK_MODE':
      return {
        ...DEFAULT_PRESENTATION,
        purifierMode: '자동',
        purifierDescription: '집안일 중 발생하는 먼지에 맞춰 풍량을 조절해요',
        fanLevel: 2,
        pm25: 11,
        screenTitle: '가사 진행 요약',
        screenDescription: '연결된 가전의 진행 상태 표시 중',
        screenTone: 'from-[#f2d39c] via-[#ebe8df] to-[#b8d9d1]',
        lightLevel: 85,
        lightDescription: '활동하기 좋은 밝은 조명',
      }
    case 'TRAVEL_MODE':
      return {
        ...DEFAULT_PRESENTATION,
        purifierMode: '자연풍',
        purifierDescription: '바람 세기를 부드럽게 바꾸며 쾌적함을 유지해요',
        fanLevel: 2,
        pm25: 7,
        screenTitle: '휴양지 분위기 영상',
        screenDescription: '자연의 풍경과 소리를 재생 중',
        screenTone: 'from-[#75bfc6] via-[#d8d8b0] to-[#6e9b73]',
        lightLevel: 55,
        lightDescription: '공간 영상에 맞춘 분위기 조명',
      }
    case 'MORNING_BRIEFING':
      return {
        ...DEFAULT_PRESENTATION,
        screenTitle: '굿모닝 브리핑',
        screenDescription: '오늘의 컨디션과 케어 포인트 표시 중',
        screenTone: 'from-[#f2c7b6] via-[#f2e4c4] to-[#b7d6d2]',
        lightLevel: 75,
        lightDescription: '하루를 시작하는 밝은 조명',
      }
    default:
      return DEFAULT_PRESENTATION
  }
}

export default function DeviceStatusDashboard({
  routine,
  routineLabel,
  careState,
}: DeviceStatusDashboardProps) {
  const device = getDevicePresentation(routine)
  const isProcessing = careState === 'processing'
  const airQualityLabel = device.pm25 <= 10 ? '좋음' : device.pm25 <= 20 ? '보통' : '나쁨'
  const statusMessage = isProcessing
    ? '연결된 기기가 새 설정으로 전환 중이에요'
    : routineLabel
      ? `${routineLabel}에 맞춰 공간을 관리하고 있어요`
      : '집 안을 쾌적하게 유지하는 기본 설정이에요'

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] bg-[#171a20] p-5 text-white shadow-[0_18px_50px_rgba(25,28,35,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/45">우리집 · 거실</p>
            <h2 className="mt-1 text-xl font-bold">공간 상태</h2>
            <p className="mt-2 text-xs leading-5 text-white/55">{statusMessage}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/75">
            <span className={`h-1.5 w-1.5 rounded-full ${isProcessing ? 'bg-amber-300' : 'bg-emerald-300'}`} />
            {isProcessing ? '전환 중' : '온라인'}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <StatusMetric label="실내 온도" value="23°" />
          <StatusMetric label="습도" value="48%" />
          <StatusMetric label="미세먼지" value={`${device.pm25}`} unit="㎍/㎥" />
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#e8e4df] bg-white shadow-[0_12px_35px_rgba(44,36,32,0.07)]">
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">공기청정기</h2>
              <span className={`h-2 w-2 rounded-full ${device.purifierPower ? 'bg-[#3aa874]' : 'bg-gray-300'}`} />
            </div>
            <p className="mt-1 text-xs text-gray-400">거실 공기청정기</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-full ${
            device.purifierPower ? 'bg-[#e8f2ff] text-[#4978dd]' : 'bg-gray-100 text-gray-400'
          }`}>
            <PowerIcon />
          </div>
        </div>

        <div className="relative mt-2 h-[260px] overflow-hidden bg-gradient-to-b from-[#f8fbfc] to-[#eef2f1]">
          {device.purifierPower && (
            <>
              <span className="device-airflow device-airflow-one" />
              <span className="device-airflow device-airflow-two" />
              <span className="device-airflow device-airflow-three" />
            </>
          )}
          <div className="absolute left-5 top-8 rounded-2xl bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm">
            <p className="text-[10px] font-semibold text-gray-400">현재 공기</p>
            <p className="mt-0.5 text-sm font-bold text-[#258a72]">{airQualityLabel}</p>
          </div>
          <AirPurifierVisual power={device.purifierPower} fanLevel={device.fanLevel} />
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400">운전 모드</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{device.purifierMode}</p>
            </div>
            <div className="flex items-end gap-1" aria-label={`풍량 ${device.fanLevel}단계`}>
              {[1, 2, 3].map((level) => (
                <span
                  key={level}
                  className={`w-1.5 rounded-full ${
                    level <= device.fanLevel ? 'bg-[#4e7ee2]' : 'bg-gray-300'
                  }`}
                  style={{ height: `${8 + level * 5}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-600">{device.purifierDescription}</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-gray-400">
            <span>PM2.5 {device.pm25}㎍/㎥</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span>{device.purifierPower ? '전원 켜짐' : '전원 꺼짐'}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <ScreenDeviceCard
          title={device.screenTitle}
          description={device.screenDescription}
          tone={device.screenTone}
          active={Boolean(routine)}
        />
        <LightDeviceCard level={device.lightLevel} description={device.lightDescription} />
      </div>
    </div>
  )
}

function StatusMetric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] px-3 py-3">
      <p className="text-[10px] font-semibold text-white/35">{label}</p>
      <p className="mt-1 text-base font-bold">
        {value}
        {unit && <span className="ml-0.5 text-[9px] font-medium text-white/35">{unit}</span>}
      </p>
    </div>
  )
}

function AirPurifierVisual({ power, fanLevel }: { power: boolean; fanLevel: number }) {
  return (
    <div className={`absolute left-1/2 top-7 -translate-x-1/2 ${power ? '' : 'opacity-60'}`} aria-hidden="true">
      <div className="relative h-[180px] w-[112px]">
        <div className="absolute left-1/2 top-0 h-9 w-20 -translate-x-1/2 rounded-[50%] border-[7px] border-[#f2f3f3] bg-[#252b31] shadow-[0_5px_12px_rgba(21,26,30,0.28)]">
          <div className={`absolute inset-1 rounded-full border border-dashed border-white/35 ${
            power ? `device-fan device-fan-${fanLevel}` : ''
          }`} />
        </div>
        <div className="absolute left-1/2 top-7 h-[142px] w-[88px] -translate-x-1/2 rounded-t-[22px] rounded-b-[30px] bg-gradient-to-r from-[#e8e9e7] via-white to-[#d7d9d8] shadow-[0_18px_28px_rgba(46,54,57,0.22)]">
          <div className="absolute left-1/2 top-5 h-4 w-4 -translate-x-1/2 rounded-full bg-[#273039] shadow-inner">
            <span className={`absolute inset-[5px] rounded-full ${power ? 'bg-[#72d8c0]' : 'bg-gray-500'}`} />
          </div>
          <div className="absolute bottom-5 left-4 right-4 space-y-1">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} className="block h-px bg-gray-300/80" />
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-1/2 h-3 w-20 -translate-x-1/2 rounded-[50%] bg-black/10 blur-sm" />
      </div>
    </div>
  )
}

function ScreenDeviceCard({
  title,
  description,
  tone,
  active,
}: {
  title: string
  description: string
  tone: string
  active: boolean
}) {
  return (
    <section className="min-w-0 rounded-[24px] border border-[#e8e4df] bg-white p-4 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
      <div className="relative mx-auto h-24 w-full max-w-[132px]" aria-hidden="true">
        <div className={`absolute inset-x-1 top-0 h-[76px] overflow-hidden rounded-xl border-[5px] border-[#303338] bg-gradient-to-br ${tone}`}>
          <span className={`absolute inset-0 bg-white/10 ${active ? 'device-screen-glow' : ''}`} />
          <span className="absolute bottom-2 left-2 h-1.5 w-10 rounded-full bg-white/60" />
          <span className="absolute bottom-5 left-2 h-1.5 w-16 rounded-full bg-white/35" />
        </div>
        <span className="absolute bottom-2 left-1/2 h-5 w-1 -translate-x-1/2 bg-[#565a60]" />
        <span className="absolute bottom-0 left-1/2 h-2 w-12 -translate-x-1/2 rounded-[50%] bg-[#777b80]" />
      </div>
      <p className="mt-2 truncate text-sm font-bold">스탠바이미</p>
      <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-[#4b6fae]">{title}</p>
      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-400">{description}</p>
    </section>
  )
}

function LightDeviceCard({ level, description }: { level: number; description: string }) {
  return (
    <section className="min-w-0 rounded-[24px] border border-[#e8e4df] bg-white p-4 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
      <div className="relative mx-auto flex h-24 items-center justify-center" aria-hidden="true">
        <span
          className="absolute h-20 w-20 rounded-full bg-[#ffd98a] blur-xl"
          style={{ opacity: Math.max(0.18, level / 130) }}
        />
        <div className="relative">
          <span className="block h-12 w-14 rounded-t-[50%] rounded-b-xl bg-gradient-to-b from-[#fff5d7] to-[#f1c86e] shadow-[0_8px_24px_rgba(242,190,83,0.32)]" />
          <span className="mx-auto block h-7 w-1.5 bg-[#77736d]" />
          <span className="mx-auto block h-2 w-12 rounded-[50%] bg-[#6c6964]" />
        </div>
      </div>
      <p className="mt-2 text-sm font-bold">거실 조명</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <span className="block h-full rounded-full bg-[#efbd58]" style={{ width: `${level}%` }} />
      </div>
      <p className="mt-2 text-[11px] font-semibold text-[#9a7124]">밝기 {level}%</p>
      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-400">{description}</p>
    </section>
  )
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v10" strokeLinecap="round" />
      <path d="M7.3 5.7a8 8 0 1 0 9.4 0" strokeLinecap="round" />
    </svg>
  )
}
