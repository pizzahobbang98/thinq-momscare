'use client'

import type {
  DemoCareState,
  DemoPregnancyStatus,
  PreparationMode,
} from '@/lib/shared-demo-state'
import { getDevicePresentation } from '@/components/mobile/DeviceStatusDashboard'
import styles from './HomeDemo.module.css'
import SmartBulbDevice from './devices/SmartBulbDevice'
import StandbyMeDevice from './devices/StandbyMeDevice'
import AirPurifierDevice from './devices/AirPurifierDevice'
import RobotVacuumDevice from './devices/RobotVacuumDevice'
import RefrigeratorDevice from './devices/RefrigeratorDevice'
import WashTowerDevice from './devices/WashTowerDevice'

type SmartHomeDashboardProps = {
  pregnancyStatus: DemoPregnancyStatus
  routine: string | null
  simulationRoutine: string | null
  preparationMode: PreparationMode
  careState: DemoCareState
}

// 조명 설명 → 실제 켜진 색
function getLightColor(description: string): string {
  if (/인디고|네이비|문라이트|어두운|딥/.test(description)) return '#6d7be0'
  if (/민트|라벤더/.test(description)) return '#c4b6ff'
  if (/바이올렛|보라/.test(description)) return '#bb8cff'
  if (/오션|블루|시원|맑/.test(description)) return '#8fcaff'
  if (/포레스트|그린|숲/.test(description)) return '#92d6a4'
  if (/앰버|웜|옐로|골드|로즈/.test(description)) return '#ffc887'
  return '#ffe1b0' // 기본 주백색
}

// 스탠바이미 톤(Tailwind class)을 실제 CSS 그라데이션으로
function toneToGradient(tone: string): string {
  const hexes = tone.match(/#[0-9a-fA-F]{6}/g)
  if (!hexes || hexes.length === 0) return 'linear-gradient(135deg,#c7dbe7,#e6e0d5,#c9d7bc)'
  return `linear-gradient(135deg, ${hexes.join(', ')})`
}

export default function SmartHomeDashboard({
  pregnancyStatus,
  routine,
  simulationRoutine,
  preparationMode,
  careState,
}: SmartHomeDashboardProps) {
  const device = getDevicePresentation(pregnancyStatus, preparationMode, simulationRoutine, routine)
  const isProcessing = careState === 'processing'
  const airLabel = device.pm25 <= 10 ? '좋음' : device.pm25 <= 20 ? '보통' : '나쁨'

  // 케어 모드에 따라 추가 가전 반응 (가사 케어 → 청소/세탁, 입덧 케어 → 냉장고 냄새 케어)
  const isHousework = device.modeLabel.includes('가사')
  const isNausea = device.modeLabel.includes('입덧')

  const screenActive = device.screenPower
  const statusMessage = isProcessing
    ? '연결된 기기를 새 모드로 전환하고 있어요'
    : `${device.modeLabel} 모드로 전환했어요`

  return (
    <div className={styles.dash}>
      <section className={styles.spaceCard}>
        <div className={styles.spaceTop}>
          <div>
            <p className={styles.spaceLabel}>
              {pregnancyStatus === 'preparing' ? '임신 준비중' : '임신중'} · 우리집 거실
            </p>
            <h2 className={styles.spaceTitle}>공간 상태</h2>
            <p className={styles.spaceMsg}>{statusMessage}</p>
          </div>
          <span className={styles.spaceBadge}>
            <span className={`${styles.spaceDot} ${isProcessing ? styles.spaceDotBusy : ''}`} />
            {isProcessing ? '전환 중' : '온라인'}
          </span>
        </div>
        <div className={styles.metricRow}>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>실내 온도</p>
            <p className={styles.metricValue}>23°</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>습도</p>
            <p className={styles.metricValue}>48%</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>미세먼지</p>
            <p className={styles.metricValue}>
              {device.pm25}
              <span className={styles.metricUnit}>㎍/㎥</span>
            </p>
          </div>
        </div>
      </section>

      <div className={styles.grid}>
        <AirPurifierDevice
          isOn={device.purifierPower}
          mode={device.purifierMode}
          fanLevel={device.fanLevel}
          pm25={device.pm25}
          airLabel={airLabel}
        />
        <SmartBulbDevice
          color={getLightColor(device.lightDescription)}
          brightness={device.lightLevel}
          description={device.lightDescription}
        />
        <StandbyMeDevice
          isOn={screenActive}
          tone={toneToGradient(device.screenTone)}
          contentLabel={device.screenTitle}
        />
        <RefrigeratorDevice
          scanning={isNausea || isProcessing}
          detail={isNausea ? '냄새·신선 케어' : isProcessing ? '스마트 진단' : '정상 운전'}
        />
        <RobotVacuumDevice active={isHousework} />
        <WashTowerDevice active={isHousework} />
      </div>
    </div>
  )
}
