'use client'

import {
  buildSimulation3dUrl,
  type TravelDestination,
} from '@/lib/simulation-routine-bridge'

const SIMULATION_WINDOW_NAME = 'thinq-mom-3d-simulation'

type HubSimulationOpenButtonProps = {
  currentHubMode?: string | null
  travelDestination?: TravelDestination | null
  inputText?: string | null
}

export function openSimulationWindow(
  currentHubMode?: string | null,
  options: { travelDestination?: TravelDestination | null; inputText?: string | null } = {},
) {
  const url = buildSimulation3dUrl(currentHubMode, {
    travelDestination: options.travelDestination,
    inputText: options.inputText ?? undefined,
  })
  console.log('[ThinQ Mom → 3D] open window', { currentHubMode, ...options, url })
  window.open(url, SIMULATION_WINDOW_NAME, 'width=1200,height=800')
}

export default function HubSimulationOpenButton({
  currentHubMode,
  travelDestination,
  inputText,
}: HubSimulationOpenButtonProps) {
  return (
    <section className="w-full overflow-x-hidden rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-600">
          별도 화면에서 ThinQ ON 가전 제어 연출을 확인해요.
        </p>
        <button
          type="button"
          onClick={() =>
            openSimulationWindow(currentHubMode, { travelDestination, inputText })
          }
          className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:self-start"
        >
          3D 시뮬레이션 열기
        </button>
        <p className="text-[11px] leading-relaxed text-gray-400">
          시연 전 3D 시뮬레이션 창을 먼저 열어두면, 허브에서 실행한 케어 모드가 별도
          화면에 반영됩니다.
        </p>
      </div>
    </section>
  )
}
