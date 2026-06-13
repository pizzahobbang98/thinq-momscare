'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  appendDemoTrackRecord,
  buildDemoDetailUrl,
  DEFAULT_DEMO_CONSOLE_STATE,
  DEMO_ROLE_LABELS,
  DEMO_STAGE_LABELS,
  readDemoConsoleState,
  readDemoTrack,
  resetDemoTrack,
  saveDemoConsoleState,
  type DemoConsoleState,
  type DemoRole,
  type DemoStage,
  type DemoTab,
  type DemoTrackRecord,
} from '@/lib/demo-console'
import {
  DEMO_ROLE_CONTENT,
  PREGNANT_MODES,
  PREPARING_MODES,
  type DemoModeCard,
} from '@/lib/demo-content'

type SheetKind = 'home-selector' | 'quick' | 'notifications' | 'options' | null

const TABS: { id: DemoTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: '홈', icon: <HomeIcon /> },
  { id: 'devices', label: '디바이스', icon: <DeviceIcon /> },
  { id: 'care', label: '케어', icon: <CareIcon /> },
  { id: 'menu', label: '메뉴', icon: <MenuIcon /> },
]

function IconButton({
  label,
  onClick,
  children,
  badge,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  badge?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/[0.08]"
    >
      {children}
      {badge && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#f56b82]" />}
    </button>
  )
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-[24px] bg-[#292b30] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.16)] ${className}`}>
      {children}
    </section>
  )
}

export default function DemoConsole() {
  const router = useRouter()
  const [state, setState] = useState<DemoConsoleState>(DEFAULT_DEMO_CONSOLE_STATE)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [records, setRecords] = useState<DemoTrackRecord[]>([])
  const [activeModeId, setActiveModeId] = useState('condition')
  const [toast, setToast] = useState<string | null>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readDemoConsoleState()
      setState(saved)
      setRecords(readDemoTrack(saved.stage))
      setActiveModeId(saved.stage === 'preparing' ? 'condition' : 'nausea')
      hydratedRef.current = true
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (hydratedRef.current) saveDemoConsoleState(state)
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const content = DEMO_ROLE_CONTENT[state.stage][state.role]
  const modes = state.stage === 'preparing' ? PREPARING_MODES : PREGNANT_MODES
  const activeMode = modes.find((mode) => mode.id === activeModeId) ?? modes[0]

  function updateState(patch: Partial<DemoConsoleState>) {
    setState((current) => ({ ...current, ...patch }))
  }

  function addRecord(kind: DemoTrackRecord['kind'], title: string, detail: string) {
    setRecords(appendDemoTrackRecord(state.stage, { kind, title, detail }))
  }

  function selectStage(stage: DemoStage) {
    const next = {
      ...state,
      stage,
      tab: 'home' as DemoTab,
      role: state.role === 'simulation' ? 'wife' as DemoRole : state.role,
    }
    setState(next)
    saveDemoConsoleState(next)
    setRecords(readDemoTrack(stage))
    setActiveModeId(stage === 'preparing' ? 'condition' : 'nausea')
  }

  function selectScreen(role: DemoRole) {
    const next = { ...state, role, tab: 'home' as DemoTab }
    setState(next)
    saveDemoConsoleState(next)
    setSheet(null)

    if (role === 'hub' || role === 'simulation') {
      window.location.assign(buildDemoDetailUrl(state.stage, role, state.fixedWeeks[state.stage]))
    }
  }

  function openSimulation(mode: DemoModeCard = activeMode) {
    setActiveModeId(mode.id)
    addRecord('care', mode.label, `${mode.device} · ${mode.atmosphere}`)
    const params = new URLSearchParams({
      status: state.stage,
      demo: 'true',
      state: state.stage,
    })
    if (state.stage === 'preparing') {
      params.set('mode', 'pregnancy-prep')
      params.set('prepMode', mode.id)
    } else if (mode.routine) {
      params.set('routine', mode.routine)
      params.set('weeks', String(state.fixedWeeks.pregnant))
    }
    window.location.assign(`/simulation-3d/index.html?${params.toString()}`)
  }

  function runSample(text: string) {
    addRecord('utterance', `${DEMO_ROLE_LABELS[state.role]} 샘플 발화`, text)
    setSheet(null)
    setToast('샘플 발화를 현재 상태 기록에 추가했어요')
    if (state.role === 'hub') {
      router.push(buildDemoDetailUrl(state.stage, 'hub', state.fixedWeeks[state.stage]))
    }
  }

  function renderDeviceCard(
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    action?: () => void,
  ) {
    return (
      <button
        type="button"
        onClick={action}
        className="min-h-[174px] rounded-[24px] bg-[#292b30] p-4 text-left shadow-[0_12px_30px_rgba(0,0,0,0.16)] transition hover:bg-[#303238]"
      >
        <div className="flex items-start justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-white/80">
            {icon}
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/65">
            <PowerIcon />
          </span>
        </div>
        <p className="mt-7 text-base font-bold text-white">{title}</p>
        <p className="mt-1 text-sm leading-5 text-white/48">{subtitle}</p>
      </button>
    )
  }

  function renderHome() {
    return (
      <>
        <div className="mt-5 flex gap-2">
          <button type="button" className="flex min-h-9 items-center gap-2 rounded-full bg-white px-3.5 text-xs font-bold text-[#17181b]">
            <HomeSmallIcon /> 홈
          </button>
          <button type="button" onClick={() => updateState({ tab: 'devices' })} className="min-h-9 rounded-full bg-[#292b30] px-4 text-xs font-semibold text-white/62">
            에어
          </button>
          <button type="button" onClick={() => updateState({ tab: 'care' })} className="min-h-9 rounded-full bg-[#292b30] px-4 text-xs font-semibold text-white/62">
            케어
          </button>
        </div>

        <button type="button" className="mt-7 flex items-center gap-2 text-sm font-semibold text-white/70">
          모든 공간 <ChevronDownIcon />
        </button>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-[-0.03em] text-white">DXSchool</h2>
          <button type="button" onClick={() => updateState({ tab: 'devices' })} className="text-xs font-semibold text-white/38">편집</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {renderDeviceCard(
            '공기청정기',
            activeMode.device.replace('공기청정기 ', ''),
            <AirPurifierIcon />,
            () => updateState({ tab: 'devices' }),
          )}
          {renderDeviceCard(
            '스탠바이미',
            activeMode.content.replace('스탠바이미: ', ''),
            <ScreenIcon />,
            () => updateState({ tab: 'care' }),
          )}
        </div>

        <Card className="mt-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#bfdca7]/12 text-[#bfdca7]">
              <SparkleIcon />
            </span>
            <div>
              <p className="text-xs font-semibold text-white/38">{content.eyebrow}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/82">{content.recommendation}</p>
            </div>
          </div>
        </Card>

        {state.emergencyTest && state.role === 'husband' && (
          <button type="button" onClick={() => setSheet('notifications')} className="mt-3 w-full rounded-[22px] bg-[#49242b] p-4 text-left">
            <p className="text-xs font-bold text-[#ff9aad]">확인이 필요한 데모 알림</p>
            <p className="mt-1 text-sm text-white/68">위급 상황 테스트 상세 내용을 확인하세요.</p>
          </button>
        )}
      </>
    )
  }

  function renderDevices() {
    return (
      <>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-white/35">{DEMO_STAGE_LABELS[state.stage]}</p>
            <h2 className="mt-1 text-xl font-bold text-white">디바이스 모드</h2>
          </div>
          <button type="button" onClick={() => openSimulation()} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#17181b]">
            3D로 보기
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => openSimulation(mode)}
              className={`min-h-[168px] rounded-[24px] p-4 text-left transition ${
                activeMode.id === mode.id
                  ? 'bg-[#34383a] ring-1 ring-[#bfdca7]/35'
                  : 'bg-[#292b30]'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-white/70">
                <AirPurifierIcon />
              </span>
              <p className="mt-5 text-sm font-bold text-white">{mode.label}</p>
              <p className="mt-1 text-xs leading-5 text-white/42">{mode.device}</p>
              <p className="mt-1 text-[11px] text-white/28">{mode.atmosphere}</p>
            </button>
          ))}
        </div>
      </>
    )
  }

  function renderCare() {
    return (
      <>
        <div className="mt-6">
          <p className="text-xs font-semibold text-white/35">{content.eyebrow}</p>
          <h2 className="mt-1 text-xl font-bold text-white">{content.careTitle}</h2>
        </div>
        <Card className="mt-4">
          <p className="text-sm leading-6 text-white/68">{content.careSummary}</p>
          <div className="mt-4 rounded-2xl bg-black/15 p-4">
            <p className="text-xs font-semibold text-white/35">오늘의 AI 기록</p>
            <p className="mt-2 text-sm leading-6 text-white/72">{content.diary}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              addRecord('diary', content.careTitle, content.diary)
              setToast('현재 상태 전용 기록에 저장했어요')
            }}
            className="mt-4 min-h-11 w-full rounded-2xl bg-white/[0.07] text-sm font-semibold text-white/82"
          >
            데모 기록에 추가
          </button>
        </Card>
        <div className="mt-4 space-y-2">
          {records.slice(0, 3).map((record) => (
            <article key={record.id} className="rounded-[20px] bg-[#292b30] px-4 py-3">
              <p className="text-xs font-semibold text-white/72">{record.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/38">{record.detail}</p>
            </article>
          ))}
        </div>
      </>
    )
  }

  function renderMenu() {
    return (
      <>
        <h2 className="mt-6 text-xl font-bold text-white">메뉴</h2>
        <div className="mt-4 space-y-2">
          <MenuRow label="데모 화면 전환" value={`${DEMO_STAGE_LABELS[state.stage]} · ${DEMO_ROLE_LABELS[state.role]}`} onClick={() => setSheet('home-selector')} />
          <MenuRow label="샘플 발화와 빠른 실행" onClick={() => setSheet('quick')} />
          <MenuRow label="알림과 브리핑" onClick={() => setSheet('notifications')} />
          <MenuRow label="데모 옵션" onClick={() => setSheet('options')} />
          <MenuRow label="현재 상태 기록 초기화" danger onClick={() => {
            resetDemoTrack(state.stage)
            setRecords([])
            setToast(`${DEMO_STAGE_LABELS[state.stage]} 기록을 초기화했어요`)
          }} />
        </div>
      </>
    )
  }

  return (
    <main className="min-h-dvh bg-[#191a1d] text-white">
      <div className="mx-auto min-h-dvh w-full max-w-[520px] px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header>
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => setSheet('home-selector')} className="min-w-0 text-left">
              <span className="flex items-center gap-1 text-[22px] font-bold tracking-[-0.04em] text-white">
                사용자 홈 <ChevronDownIcon />
              </span>
              <span className="mt-1 block text-xs font-medium text-white/42">
                {DEMO_STAGE_LABELS[state.stage]} · {DEMO_ROLE_LABELS[state.role]}
              </span>
            </button>
            <div className="flex shrink-0">
              <IconButton label="빠른 실행" onClick={() => setSheet('quick')}><PlusIcon /></IconButton>
              <IconButton label="알림과 브리핑" onClick={() => setSheet('notifications')} badge><BellIcon /></IconButton>
              <IconButton label="데모 옵션" onClick={() => setSheet('options')}><DotsIcon /></IconButton>
            </div>
          </div>
        </header>

        {state.tab === 'home' && renderHome()}
        {state.tab === 'devices' && renderDevices()}
        {state.tab === 'care' && renderCare()}
        {state.tab === 'menu' && renderMenu()}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] border-t border-white/[0.06] bg-[#202125]/96 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="grid grid-cols-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateState({ tab: tab.id })}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                state.tab === tab.id ? 'text-white' : 'text-white/32'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 backdrop-blur-sm" onClick={() => setSheet(null)}>
          <section className="max-h-[86dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[30px] bg-[#292b30] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-5 h-1 w-11 rounded-full bg-white/18" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {sheet === 'home-selector'
                    ? '데모 화면 전환'
                    : sheet === 'quick'
                      ? '빠른 실행'
                      : sheet === 'notifications'
                        ? '알림 · 브리핑'
                        : '데모 옵션'}
                </h2>
                {sheet === 'home-selector' && (
                  <p className="mt-1 text-sm text-white/42">시연할 상태와 화면을 선택하세요.</p>
                )}
              </div>
              <button type="button" onClick={() => setSheet(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/55">×</button>
            </div>

            {sheet === 'home-selector' && (
              <div className="mt-6">
                <p className="text-xs font-semibold text-white/38">임신 상태</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['preparing', 'pregnant'] as DemoStage[]).map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => selectStage(stage)}
                      className={`min-h-12 rounded-2xl text-sm font-semibold ${
                        state.stage === stage
                          ? 'bg-white text-[#17181b]'
                          : 'bg-white/[0.06] text-white/62'
                      }`}
                    >
                      {DEMO_STAGE_LABELS[stage]}
                    </button>
                  ))}
                </div>

                <p className="mt-6 text-xs font-semibold text-white/38">화면 역할</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(Object.keys(DEMO_ROLE_LABELS) as DemoRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => selectScreen(role)}
                      className={`min-h-12 rounded-2xl px-3 text-sm font-semibold ${
                        state.role === role
                          ? 'bg-[#bfdca7] text-[#172014]'
                          : 'bg-white/[0.06] text-white/62'
                      }`}
                    >
                      {DEMO_ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl bg-black/15 px-4 py-3">
                  <p className="text-xs text-white/35">현재 선택</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {DEMO_STAGE_LABELS[state.stage]} · {DEMO_ROLE_LABELS[state.role]}
                  </p>
                </div>
              </div>
            )}

            {sheet === 'quick' && (
              <div className="mt-5">
                <div className="grid grid-cols-2 gap-2">
                  {modes.slice(0, 4).map((mode) => (
                    <button key={mode.id} type="button" onClick={() => openSimulation(mode)} className="rounded-2xl bg-black/15 p-4 text-left">
                      <p className="text-sm font-bold text-white">{mode.label}</p>
                      <p className="mt-1 text-xs text-white/38">{mode.device}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-xs font-semibold text-white/38">샘플 발화</p>
                <div className="mt-2 space-y-2">
                  {content.sampleUtterances.map((utterance) => (
                    <button key={utterance} type="button" onClick={() => runSample(utterance)} className="min-h-12 w-full rounded-2xl bg-white/[0.05] px-4 text-left text-sm text-white/72">
                      “{utterance}”
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sheet === 'notifications' && (
              <div className="mt-5 space-y-2">
                <InfoCard label="오늘의 브리핑" text={content.briefing} accent />
                <InfoCard label="최근 AI 추천" text={content.recommendation} />
                <InfoCard label="디바이스 상태" text={`${activeMode.device} · ${activeMode.content}`} />
                {state.emergencyTest && state.role === 'husband' && (
                  <InfoCard label="위급 상황 테스트" text="시연용 직접 알림이 활성화되어 있습니다." danger />
                )}
              </div>
            )}

            {sheet === 'options' && (
              <div className="mt-5 space-y-3">
                <label className="block rounded-2xl bg-black/15 p-4">
                  <span className="text-xs font-semibold text-white/38">임신중 고정 주차</span>
                  <select
                    value={state.fixedWeeks.pregnant}
                    onChange={(event) => updateState({ fixedWeeks: { ...state.fixedWeeks, pregnant: Number(event.target.value) } })}
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#202125] px-3 text-sm text-white outline-none"
                  >
                    {[8, 12, 18, 24, 32].map((week) => <option key={week} value={week}>{week}주차</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => updateState({ emergencyTest: !state.emergencyTest })} className="min-h-12 w-full rounded-2xl bg-white/[0.06] px-4 text-left text-sm font-semibold text-white/72">
                  위급 상황 테스트 {state.emergencyTest ? '끄기' : '켜기'}
                </button>
                <button type="button" onClick={() => {
                  resetDemoTrack(state.stage)
                  setRecords([])
                  setToast('현재 상태 기록을 초기화했어요')
                  setSheet(null)
                }} className="min-h-12 w-full rounded-2xl bg-[#f56b82]/10 px-4 text-left text-sm font-semibold text-[#ff9aad]">
                  {DEMO_STAGE_LABELS[state.stage]} 데이터 리셋
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#17181b] shadow-xl">
          {toast}
        </div>
      )}
    </main>
  )
}

function MenuRow({
  label,
  value,
  onClick,
  danger,
}: {
  label: string
  value?: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-between rounded-[20px] bg-[#292b30] px-4 text-left">
      <span className={`text-sm font-semibold ${danger ? 'text-[#ff8ca0]' : 'text-white/78'}`}>{label}</span>
      <span className="text-xs text-white/30">{value ?? '›'}</span>
    </button>
  )
}

function InfoCard({ label, text, accent, danger }: { label: string; text: string; accent?: boolean; danger?: boolean }) {
  return (
    <article className={`rounded-2xl p-4 ${danger ? 'bg-[#4a242c]' : 'bg-black/15'}`}>
      <p className={`text-xs font-semibold ${danger ? 'text-[#ff9aad]' : accent ? 'text-[#bfdca7]' : 'text-white/38'}`}>{label}</p>
      <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
    </article>
  )
}

function Svg({ children, size = 21 }: { children: React.ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}
function PlusIcon() { return <Svg><path d="M12 5v14M5 12h14" /></Svg> }
function BellIcon() { return <Svg><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></Svg> }
function DotsIcon() { return <Svg><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></Svg> }
function ChevronDownIcon() { return <Svg size={16}><path d="m7 10 5 5 5-5" /></Svg> }
function HomeSmallIcon() { return <Svg size={15}><path d="m4 11 8-7 8 7v8H4z" /></Svg> }
function HomeIcon() { return <Svg><path d="m3 11 9-8 9 8v9H6a3 3 0 0 1-3-3z" /><path d="M9 20v-6h6v6" /></Svg> }
function DeviceIcon() { return <Svg><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 7h6M9 17h6" /><circle cx="12" cy="12" r="2" /></Svg> }
function CareIcon() { return <Svg><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></Svg> }
function MenuIcon() { return <Svg><path d="M4 6h16M4 12h16M4 18h16" /></Svg> }
function PowerIcon() { return <Svg size={17}><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.8 0" /></Svg> }
function AirPurifierIcon() { return <Svg size={25}><rect x="6" y="3" width="12" height="18" rx="3" /><path d="M9 7h6M9 17h6" /><circle cx="12" cy="12" r="2.3" /></Svg> }
function ScreenIcon() { return <Svg size={25}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></Svg> }
function SparkleIcon() { return <Svg size={19}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /></Svg> }
