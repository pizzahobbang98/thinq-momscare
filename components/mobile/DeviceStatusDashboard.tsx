'use client'

import Image from 'next/image'
import type {
  DemoCareState,
  DemoPregnancyStatus,
  PreparationMode,
} from '@/lib/shared-demo-state'

type DeviceStatusDashboardProps = {
  pregnancyStatus: DemoPregnancyStatus
  routine: string | null
  simulationRoutine: string | null
  preparationMode: PreparationMode
  careState: DemoCareState
}

type DevicePresentation = {
  modeLabel: string
  purifierPower: boolean
  purifierMode: string
  purifierDescription: string
  fanLevel: number
  pm25: number
  screenTitle: string
  screenDescription: string
  screenTone: string
  screenImage?: string
  lightLevel: number
  lightDescription: string
}

const DEFAULT_PRESENTATION: DevicePresentation = {
  modeLabel: '기본 공기 케어',
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

const PREPARATION_PRESENTATIONS: Record<PreparationMode, DevicePresentation> = {
  condition: {
    ...DEFAULT_PRESENTATION,
    modeLabel: '컨디션 밸런스',
    purifierMode: '자동 · 약풍',
    purifierDescription: '몸의 리듬을 깨우는 맑고 가벼운 공기를 유지해요',
    fanLevel: 1,
    pm25: 8,
    screenTitle: '가벼운 스트레칭',
    screenDescription: '아침 컨디션을 깨우는 동작을 안내해요',
    screenTone: 'from-[#dce8c7] via-[#f4ead8] to-[#b7d0b1]',
    screenImage: '/images/standby-mom/pregnancy-prep-main.png',
    lightLevel: 72,
    lightDescription: '세이지 자연광',
  },
  'sleep-rhythm': {
    ...DEFAULT_PRESENTATION,
    modeLabel: '수면 리듬',
    purifierMode: '수면 · 저소음',
    purifierDescription: '잠들 시간을 부드럽게 앞당기도록 조용히 작동해요',
    fanLevel: 1,
    pm25: 7,
    screenTitle: '수면 호흡 가이드',
    screenDescription: '호흡 속도를 낮추는 가이드를 재생 중',
    screenTone: 'from-[#30375f] via-[#666a96] to-[#a894ad]',
    screenImage: '/images/standby-mom/pregnancy-prep-sleep.png',
    lightLevel: 22,
    lightDescription: '딥 인디고 간접 조명',
  },
  'stress-relief': {
    ...DEFAULT_PRESENTATION,
    modeLabel: '마음 환기',
    purifierMode: '중풍 · 이온 케어',
    purifierDescription: '감각 자극을 낮추면서 답답한 공기를 환기해요',
    fanLevel: 2,
    pm25: 9,
    screenTitle: '빗소리 명상',
    screenDescription: '생각을 가라앉히는 잔잔한 소리 재생 중',
    screenTone: 'from-[#a99aca] via-[#d9cfdf] to-[#8ca7a1]',
    screenImage: '/images/standby-mom/pregnancy-prep-calm-room.png',
    lightLevel: 38,
    lightDescription: '라벤더 저채도 조명',
  },
  'rest-ready': {
    ...DEFAULT_PRESENTATION,
    modeLabel: '휴식 준비',
    purifierMode: '약풍 · 60분',
    purifierDescription: '저녁의 속도를 낮추도록 약한 바람으로 예약 운전해요',
    fanLevel: 1,
    pm25: 8,
    screenTitle: '잔잔한 재즈',
    screenDescription: '휴식에 어울리는 플레이리스트 재생 중',
    screenTone: 'from-[#b8764c] via-[#ddbd88] to-[#614d47]',
    screenImage: '/images/standby-mom/pregnancy-prep-calm-room.png',
    lightLevel: 35,
    lightDescription: '웜 앰버 조명',
  },
  'walk-air': {
    ...DEFAULT_PRESENTATION,
    modeLabel: '산책 환기',
    purifierMode: '터보 · 10분',
    purifierDescription: '산책 뒤처럼 산뜻하도록 짧고 강하게 공기를 순환해요',
    fanLevel: 3,
    pm25: 5,
    screenTitle: '숲길 산책 영상',
    screenDescription: '선명한 자연 풍경을 재생 중',
    screenTone: 'from-[#72b69d] via-[#bcd8b5] to-[#4d7c68]',
    screenImage: '/images/standby-mom/pregnancy-prep-air-care.png',
    lightLevel: 88,
    lightDescription: '민트 자연광',
  },
  'couple-routine': {
    ...DEFAULT_PRESENTATION,
    modeLabel: '둘의 저녁',
    purifierMode: '자동 · 정숙',
    purifierDescription: '대화를 방해하지 않는 정숙 운전으로 공기를 관리해요',
    fanLevel: 1,
    pm25: 8,
    screenTitle: '커플 플레이리스트',
    screenDescription: '함께 쉬기 좋은 음악을 재생 중',
    screenTone: 'from-[#9a5868] via-[#c8998f] to-[#5d4b67]',
    screenImage: '/images/standby-mom/pregnancy-prep-calm-room.png',
    lightLevel: 42,
    lightDescription: '로즈 앰버 라운지 조명',
  },
}

const PREGNANT_PRESENTATIONS: Record<string, DevicePresentation> = {
  nausea_food: {
    ...DEFAULT_PRESENTATION,
    modeLabel: '입덧 케어',
    purifierMode: '터보',
    purifierDescription: '냄새와 답답한 공기를 빠르게 줄이도록 강하게 정화해요',
    fanLevel: 3,
    pm25: 6,
    screenTitle: '산뜻한 주방 가이드',
    screenDescription: '냄새 부담이 적은 식사와 환기 방법을 표시해요',
    screenTone: 'from-[#b8e8ed] via-[#e8f5ec] to-[#b9d7dd]',
    lightLevel: 82,
    lightDescription: '시원하고 맑은 주방 조명',
  },
  sleep_care: {
    ...DEFAULT_PRESENTATION,
    modeLabel: '수면 케어',
    purifierMode: '수면',
    purifierDescription: '소음과 표시등을 낮춰 조용하게 공기를 관리해요',
    fanLevel: 1,
    pm25: 8,
    screenTitle: '수면 콘텐츠',
    screenDescription: '화면 밝기와 자극을 낮춰 재생 중',
    screenTone: 'from-[#252b58] via-[#555b89] to-[#927f93]',
    lightLevel: 20,
    lightDescription: '어두운 딥 네이비 조명',
  },
  housework_care: {
    ...DEFAULT_PRESENTATION,
    modeLabel: '가사 케어',
    purifierMode: '자동',
    purifierDescription: '집안일 중 생기는 먼지에 맞춰 풍량을 자동 조절해요',
    fanLevel: 2,
    pm25: 11,
    screenTitle: '가사 진행 요약',
    screenDescription: '세탁과 청소 가전의 진행 상태 표시 중',
    screenTone: 'from-[#efd08d] via-[#eae4d5] to-[#a9cfc6]',
    lightLevel: 86,
    lightDescription: '활동하기 좋은 웜 옐로 조명',
  },
  destination_ocean: {
    ...DEFAULT_PRESENTATION,
    modeLabel: '바다 휴양',
    purifierMode: '자동 · 산들바람',
    purifierDescription: '바닷가처럼 시원한 공기 흐름을 부드럽게 만들어요',
    fanLevel: 2,
    pm25: 6,
    screenTitle: '파도 영상',
    screenDescription: '여유로운 바닷가 풍경과 파도 소리 재생 중',
    screenTone: 'from-[#3fa9d0] via-[#aad9df] to-[#dfc486]',
    lightLevel: 68,
    lightDescription: '오션 블루 조명',
  },
  destination_forest: {
    ...DEFAULT_PRESENTATION,
    modeLabel: '숲 휴양',
    purifierMode: '자연풍',
    purifierDescription: '숲속 바람처럼 세기를 천천히 바꾸며 작동해요',
    fanLevel: 2,
    pm25: 5,
    screenTitle: '숲 영상',
    screenDescription: '고요한 숲 풍경과 자연 소리 재생 중',
    screenTone: 'from-[#477c5b] via-[#91b98b] to-[#d4c99c]',
    lightLevel: 52,
    lightDescription: '포레스트 그린 조명',
  },
  destination_city: {
    ...DEFAULT_PRESENTATION,
    modeLabel: '도시 라운지',
    purifierMode: '정숙',
    purifierDescription: '라운지 분위기를 유지하도록 조용하게 공기를 관리해요',
    fanLevel: 1,
    pm25: 7,
    screenTitle: '도시 야경',
    screenDescription: '차분한 도심 라운지 영상을 재생 중',
    screenTone: 'from-[#25234d] via-[#6d5385] to-[#c17282]',
    lightLevel: 38,
    lightDescription: '바이올렛 라운지 조명',
  },
}

const HUB_MODE_TO_ROUTINE: Record<string, string> = {
  NAUSEA_MODE: 'nausea_food',
  SLEEP_MODE: 'sleep_care',
  HOUSEWORK_MODE: 'housework_care',
  TRAVEL_MODE: 'destination_ocean',
}

function getDevicePresentation(
  pregnancyStatus: DemoPregnancyStatus,
  preparationMode: PreparationMode,
  simulationRoutine: string | null,
  routine: string | null,
) {
  if (pregnancyStatus === 'preparing') {
    return PREPARATION_PRESENTATIONS[preparationMode]
  }

  if (routine === 'AIR_OFF') {
    return {
      ...DEFAULT_PRESENTATION,
      modeLabel: '공기청정기 꺼짐',
      purifierPower: false,
      purifierMode: '꺼짐',
      purifierDescription: '현재 전원이 꺼져 있어 공기를 정화하지 않아요',
      fanLevel: 0,
      pm25: 14,
    }
  }

  const resolvedRoutine = simulationRoutine ?? (routine ? HUB_MODE_TO_ROUTINE[routine] : null)
  return resolvedRoutine
    ? PREGNANT_PRESENTATIONS[resolvedRoutine] ?? DEFAULT_PRESENTATION
    : DEFAULT_PRESENTATION
}

export default function DeviceStatusDashboard({
  pregnancyStatus,
  routine,
  simulationRoutine,
  preparationMode,
  careState,
}: DeviceStatusDashboardProps) {
  const device = getDevicePresentation(
    pregnancyStatus,
    preparationMode,
    simulationRoutine,
    routine,
  )
  const isProcessing = careState === 'processing'
  const airQualityLabel = device.pm25 <= 10 ? '좋음' : device.pm25 <= 20 ? '보통' : '나쁨'
  const statusMessage = isProcessing
    ? '연결된 기기가 새 설정으로 전환 중이에요'
    : `${device.modeLabel} 모드로 공간을 관리하고 있어요`

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] bg-[#171a20] p-5 text-white shadow-[0_18px_50px_rgba(25,28,35,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/45">
              {pregnancyStatus === 'preparing' ? '임신 준비중' : '임신중'} · 우리집 거실
            </p>
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
          image={device.screenImage}
          active={Boolean(routine || simulationRoutine || preparationMode)}
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
  image,
  active,
}: {
  title: string
  description: string
  tone: string
  image?: string
  active: boolean
}) {
  return (
    <section className="min-w-0 rounded-[24px] border border-[#e8e4df] bg-white p-4 shadow-[0_8px_24px_rgba(44,36,32,0.05)]">
      <div className="relative mx-auto h-24 w-full max-w-[132px]" aria-hidden="true">
        <div className={`absolute inset-x-1 top-0 h-[76px] overflow-hidden rounded-xl border-[5px] border-[#303338] bg-gradient-to-br ${tone}`}>
          {image && (
            // The preparation visuals are the same assets used by the 3D experience.
            <Image src={image} alt="" fill sizes="132px" className="object-cover" />
          )}
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
