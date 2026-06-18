'use client'

import { useState } from 'react'
import type {
  DemoCareState,
  DemoPregnancyStatus,
  PreparationMode,
} from '@/lib/shared-demo-state'
import SmartHomeDashboard from '@/components/home-demo/SmartHomeDashboard'
import { useThinQDeviceState } from '@/hooks/useThinQDeviceState'
import styles from '@/components/home-demo/HomeDemo.module.css'

type ModeState = {
  pregnancyStatus: DemoPregnancyStatus
  routine: string | null
  simulationRoutine: string | null
  preparationMode: PreparationMode
  careState: DemoCareState
}

const MODES: Array<{ key: string; state: ModeState }> = [
  {
    key: '기본',
    state: { pregnancyStatus: 'pregnant', routine: null, simulationRoutine: null, preparationMode: 'condition', careState: 'idle' },
  },
  {
    key: '입덧 케어',
    state: { pregnancyStatus: 'pregnant', routine: 'NAUSEA_MODE', simulationRoutine: 'nausea_food', preparationMode: 'condition', careState: 'completed' },
  },
  {
    key: '수면 케어',
    state: { pregnancyStatus: 'pregnant', routine: 'SLEEP_MODE', simulationRoutine: 'sleep_care', preparationMode: 'condition', careState: 'completed' },
  },
  {
    key: '가사 케어',
    state: { pregnancyStatus: 'pregnant', routine: 'HOUSEWORK_MODE', simulationRoutine: 'housework_care', preparationMode: 'condition', careState: 'completed' },
  },
  {
    key: '바다 휴양',
    state: { pregnancyStatus: 'pregnant', routine: 'TRAVEL_MODE', simulationRoutine: 'destination_ocean', preparationMode: 'condition', careState: 'completed' },
  },
  {
    key: '공청기 끄기',
    state: { pregnancyStatus: 'pregnant', routine: 'AIR_OFF', simulationRoutine: null, preparationMode: 'condition', careState: 'idle' },
  },
  {
    key: '임신준비·수면리듬',
    state: { pregnancyStatus: 'preparing', routine: null, simulationRoutine: null, preparationMode: 'sleep-rhythm', careState: 'idle' },
  },
]

export default function HomeDemoPage() {
  const [index, setIndex] = useState(0)
  const mode = MODES[index]
  const { thinqState } = useThinQDeviceState()

  return (
    <main className={styles.preview}>
      <div className={styles.previewInner}>
        <h1 className={styles.previewHead}>가전 상태 미리보기</h1>
        <p className={styles.previewSub}>케어 모드를 선택하면 가전이 해당 상태로 전환돼요.</p>
        <div className={styles.previewBar}>
          {MODES.map((m, i) => (
            <button
              key={m.key}
              type="button"
              className={`${styles.modeButton} ${i === index ? styles.modeButtonActive : ''}`}
              onClick={() => setIndex(i)}
            >
              {m.key}
            </button>
          ))}
        </div>
        <SmartHomeDashboard {...mode.state} thinqState={thinqState} />
      </div>
    </main>
  )
}
