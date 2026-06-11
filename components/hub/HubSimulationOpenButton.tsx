'use client'

import {
  buildSimulation3dUrl,
  SIMULATION_WINDOW_NAME,
  type SimulationRoutineId,
  type TravelDestination,
} from '@/lib/simulation-routine-bridge'

type HubSimulationOpenButtonProps = {
  currentHubMode?: string | null
  routineId?: SimulationRoutineId | null
  travelDestination?: TravelDestination | null
}

export function openSimulationWindow(
  currentHubMode?: string | null,
  options: {
    routineId?: SimulationRoutineId | null
    travelDestination?: TravelDestination | null
  } = {},
) {
  const url = buildSimulation3dUrl(currentHubMode, {
    routineId: options.routineId ?? undefined,
    travelDestination: options.travelDestination,
  })
  console.log('[ThinQ Mom → 3D] open window', { currentHubMode, ...options, url })

  const simulationWindow = window.open(url, SIMULATION_WINDOW_NAME, 'width=1200,height=800')
  if (!simulationWindow) return

  try {
    simulationWindow.focus()
    const absoluteUrl = new URL(url, window.location.origin).href
    if (simulationWindow.location.href !== absoluteUrl) {
      simulationWindow.location.href = absoluteUrl
    }
  } catch (error) {
    console.warn('[ThinQ Mom → 3D] window navigation fallback via postMessage', error)
  }
}

export default function HubSimulationOpenButton({
  currentHubMode,
  routineId,
  travelDestination,
}: HubSimulationOpenButtonProps) {
  return (
    <section className="w-full overflow-x-hidden rounded-[20px] border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-emerald-700">연결된 시연 화면</p>
          <h2 className="mt-1 text-base font-bold text-gray-900">집 안 환경 변화를 3D로 확인해요</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
            선택한 케어 모드에 맞춰 공기, 조명, 가전 연출이 별도 화면에 이어집니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            openSimulationWindow(currentHubMode, { routineId, travelDestination })
          }
          className="min-h-[48px] w-full rounded-[14px] bg-emerald-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 sm:w-auto sm:self-start"
        >
          3D 시뮬레이션 열기
        </button>
        <p className="text-[11px] leading-relaxed text-gray-500">
          시연 전 3D 시뮬레이션 창을 먼저 열어두면, 허브에서 실행한 케어 모드가 별도
          화면에 반영됩니다.
        </p>
      </div>
    </section>
  )
}
