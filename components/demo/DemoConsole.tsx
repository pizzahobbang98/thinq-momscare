'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { SIMULATION_3D_PATH } from '@/lib/simulation-mode-map'
import { SIMULATION_WINDOW_NAME } from '@/lib/simulation-routine-bridge'

type SheetKind = 'quick' | 'notifications' | 'options' | null

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
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10"
    >
      {children}
      {badge && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f05b78]" />}
    </button>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
            value === option.value
              ? 'bg-white text-[#17181b] shadow-lg'
              : 'text-white/55 hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function RoleSegment({
  value,
  onChange,
}: {
  value: DemoRole
  onChange: (role: DemoRole) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
      {(Object.keys(DEMO_ROLE_LABELS) as DemoRole[]).map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role)}
          className={`min-h-10 rounded-xl text-sm font-semibold transition ${
            value === role
              ? 'bg-[#a8ff58] text-[#15200d]'
              : 'text-white/55 hover:bg-white/[0.05] hover:text-white'
          }`}
        >
          {DEMO_ROLE_LABELS[role]}
        </button>
      ))}
    </div>
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
    <section className={`rounded-[28px] border border-white/[0.08] bg-[#24262b] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] ${className}`}>
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
    if (!hydratedRef.current) return
    saveDemoConsoleState(state)
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const content = DEMO_ROLE_CONTENT[state.stage][state.role]
  const modes = state.stage === 'preparing' ? PREPARING_MODES : PREGNANT_MODES
  const activeMode = modes.find((mode) => mode.id === activeModeId) ?? modes[0]
  const statusColor = state.stage === 'preparing' ? '#a8ff58' : '#ff8097'
  const stageRecords = useMemo(
    () => records.filter((record) => record.id.startsWith(state.stage)),
    [records, state.stage],
  )

  function updateState(patch: Partial<DemoConsoleState>) {
    setState((current) => ({ ...current, ...patch }))
  }

  function changeStage(stage: DemoStage) {
    updateState({ stage, tab: 'home' })
    setRecords(readDemoTrack(stage))
    setActiveModeId(stage === 'preparing' ? 'condition' : 'nausea')
    setToast(`${DEMO_STAGE_LABELS[stage]} 데모 트랙으로 전환했어요`)
  }

  function addRecord(kind: DemoTrackRecord['kind'], title: string, detail: string) {
    const next = appendDemoTrackRecord(state.stage, { kind, title, detail })
    setRecords(next)
  }

  function runSample(text: string) {
    addRecord('utterance', `${DEMO_ROLE_LABELS[state.role]} 샘플 발화`, text)
    setSheet(null)
    setToast('샘플 발화를 현재 데모 트랙에 기록했어요')
    if (state.role === 'hub') {
      router.push(buildDemoDetailUrl(state.stage, 'hub', state.fixedWeeks[state.stage]))
    }
  }

  function openSimulation(mode: DemoModeCard = activeMode) {
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
    }
    const url = `${SIMULATION_3D_PATH}?${params.toString()}`
    window.open(url, SIMULATION_WINDOW_NAME, 'width=1440,height=920')
    addRecord('care', mode.label, `${mode.device} · ${mode.atmosphere}`)
  }

  function openRoleDetail() {
    router.push(buildDemoDetailUrl(state.stage, state.role, state.fixedWeeks[state.stage]))
  }

  function renderHome() {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="relative min-h-[280px] overflow-hidden">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                state.stage === 'preparing'
                  ? 'radial-gradient(circle at 75% 20%, rgba(168,255,88,.22), transparent 34%), linear-gradient(145deg,#273128,#1e2024 66%)'
                  : 'radial-gradient(circle at 75% 20%, rgba(255,128,151,.25), transparent 34%), linear-gradient(145deg,#35252b,#1f2024 66%)',
            }}
          />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.16em]" style={{ color: statusColor }}>
                {content.eyebrow}
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-bold leading-tight tracking-[-0.04em] text-white md:text-4xl">
                {content.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/62">{content.briefing}</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => updateState({ tab: 'care' })} className="min-h-12 rounded-2xl bg-white px-5 text-sm font-bold text-[#18191c]">
                {content.primaryAction}
              </button>
              <button type="button" onClick={openRoleDetail} className="min-h-12 rounded-2xl border border-white/15 bg-white/[0.05] px-5 text-sm font-semibold text-white">
                전체 {DEMO_ROLE_LABELS[state.role]} 화면
              </button>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <p className="text-xs font-semibold text-white/42">오늘의 한 줄 브리핑</p>
            <p className="mt-3 text-lg font-semibold leading-7 text-white">{content.recommendation}</p>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/42">현재 홈 상태</p>
                <p className="mt-2 text-lg font-bold text-white">{activeMode.label}</p>
              </div>
              <span className="rounded-full bg-[#a8ff58]/15 px-3 py-1 text-xs font-bold text-[#a8ff58]">정상 연결</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/55">{activeMode.device}</p>
          </Card>
        </div>
      </div>
    )
  }

  function renderDevices() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold text-white/45">3D HOME TWIN</p>
              <h2 className="mt-2 text-2xl font-bold text-white">같은 가전, 다른 케어 장면</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {DEMO_STAGE_LABELS[state.stage]} 전용 모드로 공기청정기, 스탠바이미, 조명 분위기를 함께 전환합니다.
              </p>
            </div>
            <button type="button" onClick={() => openSimulation()} className="min-h-12 shrink-0 rounded-2xl bg-[#a8ff58] px-5 text-sm font-bold text-[#15200d]">
              3D 시뮬레이터 열기
            </button>
          </div>
        </Card>
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => {
              setActiveModeId(mode.id)
              openSimulation(mode)
            }}
            className={`rounded-[26px] border p-5 text-left transition ${
              activeMode.id === mode.id
                ? 'border-[#a8ff58]/45 bg-[#293126]'
                : 'border-white/[0.08] bg-[#24262b] hover:bg-[#292b30]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-white">{mode.label}</p>
                <p className="mt-2 text-sm leading-6 text-white/52">{mode.description}</p>
              </div>
              <span className="mt-1 h-3 w-3 rounded-full bg-[#a8ff58] shadow-[0_0_20px_rgba(168,255,88,.7)]" />
            </div>
            <div className="mt-5 grid gap-2 text-xs text-white/58">
              <p><span className="text-white/35">가전</span> · {mode.device}</p>
              <p><span className="text-white/35">콘텐츠</span> · {mode.content}</p>
              <p><span className="text-white/35">공간</span> · {mode.atmosphere}</p>
            </div>
          </button>
        ))}
      </div>
    )
  }

  function renderCare() {
    return (
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <p className="text-xs font-bold tracking-[0.14em]" style={{ color: statusColor }}>AI CARE</p>
          <h2 className="mt-3 text-2xl font-bold text-white">{content.careTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-white/58">{content.careSummary}</p>
          <div className="mt-6 rounded-2xl bg-black/20 p-4">
            <p className="text-xs font-semibold text-white/40">AI 다이어리 문체</p>
            <p className="mt-2 text-sm leading-6 text-white/75">{content.diary}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              addRecord('diary', content.careTitle, content.diary)
              setToast('현재 상태 전용 다이어리에 저장했어요')
            }}
            className="mt-5 min-h-11 w-full rounded-2xl border border-white/12 bg-white/[0.05] text-sm font-semibold text-white"
          >
            데모 기록에 추가
          </button>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">{DEMO_STAGE_LABELS[state.stage]} 기록</h3>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/45">독립 저장소</span>
          </div>
          <div className="mt-4 space-y-3">
            {stageRecords.length > 0 ? stageRecords.slice(0, 5).map((record) => (
              <article key={record.id} className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white">{record.title}</p>
                  <span className="text-[11px] text-white/30">
                    {new Date(record.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/52">{record.detail}</p>
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/35">
                이 상태 트랙에는 아직 데모 기록이 없습니다.
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  function renderMenu() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-white">데모 설정</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-white/45">임신중 고정 주차</span>
              <select
                value={state.fixedWeeks.pregnant}
                onChange={(event) =>
                  updateState({ fixedWeeks: { ...state.fixedWeeks, pregnant: Number(event.target.value) } })
                }
                className="mt-2 min-h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none"
              >
                {[8, 12, 18, 24, 32].map((week) => <option key={week} value={week}>{week}주차</option>)}
              </select>
            </label>
            <label className="flex min-h-14 items-center justify-between rounded-2xl bg-black/20 px-4">
              <span className="text-sm font-semibold text-white">위급 상황 테스트</span>
              <input type="checkbox" checked={state.emergencyTest} onChange={(event) => updateState({ emergencyTest: event.target.checked })} className="h-5 w-5 accent-[#f05b78]" />
            </label>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold text-white">시연 도구</h2>
          <div className="mt-4 grid gap-3">
            <button type="button" onClick={() => setSheet('quick')} className="min-h-12 rounded-2xl bg-white/[0.06] px-4 text-left text-sm font-semibold text-white">샘플 발화 및 빠른 실행</button>
            <button type="button" onClick={() => openSimulation()} className="min-h-12 rounded-2xl bg-white/[0.06] px-4 text-left text-sm font-semibold text-white">현재 상태로 3D 열기</button>
            <button
              type="button"
              onClick={() => {
                resetDemoTrack(state.stage)
                setRecords([])
                setToast(`${DEMO_STAGE_LABELS[state.stage]} 기록만 초기화했어요`)
              }}
              className="min-h-12 rounded-2xl border border-[#f05b78]/25 bg-[#f05b78]/10 px-4 text-left text-sm font-semibold text-[#ff9aad]"
            >
              현재 상태 기록 초기화
            </button>
          </div>
        </Card>
        <Card className="md:col-span-2">
          <p className="text-xs font-semibold text-white/40">APP INFO</p>
          <p className="mt-2 text-sm leading-6 text-white/55">
            ThinQ Mom Demo Console · 임신준비중과 임신중의 샘플 기록 및 대화 맥락은 브라우저에서 별도 namespace로 관리됩니다.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-dvh bg-[#16171a] text-white">
      <div className="mx-auto min-h-dvh w-full max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 -mx-4 bg-[#16171a]/92 px-4 pb-4 pt-1 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-white/40">DXSCHOOL HOME</p>
              <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em]">ThinQ Mom Demo</h1>
            </div>
            <div className="flex gap-2">
              <IconButton label="빠른 실행" onClick={() => setSheet('quick')}><PlusIcon /></IconButton>
              <IconButton label="알림과 브리핑" onClick={() => setSheet('notifications')} badge><BellIcon /></IconButton>
              <IconButton label="데모 옵션" onClick={() => setSheet('options')}><DotsIcon /></IconButton>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_0.72fr]">
            <Segmented
              value={state.stage}
              options={[
                { value: 'preparing', label: '임신준비중' },
                { value: 'pregnant', label: `임신중 · ${state.fixedWeeks.pregnant}주` },
              ]}
              onChange={changeStage}
            />
            <RoleSegment value={state.role} onChange={(role) => updateState({ role, tab: 'home' })} />
          </div>
        </header>

        {state.emergencyTest && state.role === 'husband' && (
          <button type="button" onClick={() => setSheet('notifications')} className="mb-4 flex w-full items-center justify-between rounded-2xl border border-[#f05b78]/35 bg-[#4a2029] px-4 py-3 text-left">
            <span className="text-sm font-bold text-[#ff9aad]">위급 상황 테스트 알림이 활성화되어 있습니다.</span>
            <span className="text-xs text-white/45">상세 보기</span>
          </button>
        )}

        <div className="mt-2">
          {state.tab === 'home' && renderHome()}
          {state.tab === 'devices' && renderDevices()}
          {state.tab === 'care' && renderCare()}
          {state.tab === 'menu' && renderMenu()}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[720px] px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 rounded-[24px] border border-white/10 bg-[#24262b]/95 p-2 shadow-2xl backdrop-blur-xl">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateState({ tab: tab.id })}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${
                state.tab === tab.id ? 'bg-white text-[#17181b]' : 'text-white/42 hover:text-white'
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
          <section className="max-h-[82dvh] w-full max-w-[680px] overflow-y-auto rounded-t-[30px] border border-white/10 bg-[#24262b] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20" />
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {sheet === 'quick' ? '빠른 실행' : sheet === 'notifications' ? '알림 · 브리핑' : '데모 옵션'}
              </h2>
              <button type="button" onClick={() => setSheet(null)} className="h-10 w-10 rounded-full bg-white/[0.06] text-white/60">×</button>
            </div>

            {sheet === 'quick' && (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-2 gap-2">
                  {modes.slice(0, 4).map((mode) => (
                    <button key={mode.id} type="button" onClick={() => openSimulation(mode)} className="rounded-2xl bg-black/20 p-4 text-left">
                      <p className="text-sm font-bold text-white">{mode.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/42">{mode.device}</p>
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/40">샘플 발화</p>
                  <div className="mt-3 grid gap-2">
                    {content.sampleUtterances.map((utterance) => (
                      <button key={utterance} type="button" onClick={() => runSample(utterance)} className="min-h-12 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-left text-sm text-white/75">
                        “{utterance}”
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {sheet === 'notifications' && (
              <div className="mt-5 grid gap-3">
                {state.emergencyTest && state.role === 'husband' && (
                  <article className="rounded-2xl border border-[#f05b78]/35 bg-[#4a2029] p-4">
                    <p className="text-xs font-bold text-[#ff9aad]">위급 상황 테스트</p>
                    <p className="mt-2 text-sm font-semibold text-white">직접 확인이 필요한 알림이 도착했습니다.</p>
                    <p className="mt-2 text-xs leading-5 text-white/50">시연 모드에서만 민감 상태를 직접 노출하는 예외 알림입니다.</p>
                  </article>
                )}
                <article className="rounded-2xl bg-black/20 p-4">
                  <p className="text-xs font-semibold text-[#a8ff58]">오늘의 케어 브리핑</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">{content.briefing}</p>
                </article>
                <article className="rounded-2xl bg-black/20 p-4">
                  <p className="text-xs font-semibold text-white/40">최근 AI 추천</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">{content.recommendation}</p>
                </article>
                <article className="rounded-2xl bg-black/20 p-4">
                  <p className="text-xs font-semibold text-white/40">디바이스 상태</p>
                  <p className="mt-2 text-sm font-semibold text-white">{activeMode.device}</p>
                </article>
              </div>
            )}

            {sheet === 'options' && (
              <div className="mt-5 grid gap-3">
                <button type="button" onClick={() => changeStage(state.stage === 'preparing' ? 'pregnant' : 'preparing')} className="min-h-13 rounded-2xl bg-black/20 px-4 text-left text-sm font-semibold text-white">데모 상태 즉시 전환</button>
                <button type="button" onClick={() => updateState({ emergencyTest: !state.emergencyTest })} className="min-h-13 rounded-2xl bg-black/20 px-4 text-left text-sm font-semibold text-white">위급 상황 테스트 {state.emergencyTest ? '끄기' : '켜기'}</button>
                <button type="button" onClick={() => { resetDemoTrack(state.stage); setRecords([]); setToast('현재 상태 트랙을 초기화했어요'); setSheet(null) }} className="min-h-13 rounded-2xl bg-[#f05b78]/10 px-4 text-left text-sm font-semibold text-[#ff9aad]">{DEMO_STAGE_LABELS[state.stage]} 샘플 기록 초기화</button>
              </div>
            )}
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#17181b] shadow-xl">
          {toast}
        </div>
      )}
    </main>
  )
}

function Svg({ children }: { children: React.ReactNode }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}
function PlusIcon() { return <Svg><path d="M12 5v14M5 12h14" /></Svg> }
function BellIcon() { return <Svg><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></Svg> }
function DotsIcon() { return <Svg><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></Svg> }
function HomeIcon() { return <Svg><path d="m3 11 9-8 9 8v9H6a3 3 0 0 1-3-3z" /><path d="M9 20v-6h6v6" /></Svg> }
function DeviceIcon() { return <Svg><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 7h6M9 17h6" /><circle cx="12" cy="12" r="2" /></Svg> }
function CareIcon() { return <Svg><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></Svg> }
function MenuIcon() { return <Svg><path d="M4 6h16M4 12h16M4 18h16" /></Svg> }
