'use client'

import type {
  DemoCareState,
  DemoLightPower,
  DemoPregnancyStatus,
  PreparationMode,
} from '@/lib/shared-demo-state'
import type { ThinQDeviceStateView } from '@/lib/thinq-device-state-client'
import {
  formatThinQOdorLevel,
  formatThinQPollutionLevel,
  getThinQAirQualityLabel,
  getThinQFanLevel,
  getThinQOnlineLabel,
  getThinQOperationLabel,
} from '@/lib/thinq-device-state-client'
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
  lightPower: DemoLightPower
  lightColor?: string | null
  careState: DemoCareState
  thinqState: ThinQDeviceStateView
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
  lightPower,
  lightColor,
  careState,
  thinqState,
}: SmartHomeDashboardProps) {
  const device = getDevicePresentation(
    pregnancyStatus,
    preparationMode,
    simulationRoutine,
    routine,
    careState,
    lightPower,
    lightColor,
  )
  const isProcessing = careState === 'processing'
  const purifierOn = thinqState.connected && thinqState.power === 'ON'
  const airLabel = getThinQAirQualityLabel(thinqState.pm25, thinqState.pm2Level)
  const operationLabel = getThinQOperationLabel(thinqState)
  const fanLevel = getThinQFanLevel(thinqState.fanSpeed, thinqState.power)
  const onlineLabel = isProcessing ? '전환 중' : getThinQOnlineLabel(thinqState)
  const pm25Display = thinqState.pm25 ?? '--'
  const spaceAirQuality = formatThinQPollutionLevel(thinqState.totalPollutionLevel)
  const spaceOdor = formatThinQOdorLevel(thinqState.odorLevel)

  // 케어 모드에 따라 추가 가전 반응 (가사 케어 → 청소/세탁, 입덧 케어 → 냉장고 냄새 케어)
  const isHousework = device.modeLabel.includes('가사')
  const isNausea = device.modeLabel.includes('입덧')

  const screenActive = device.screenPower
  const statusMessage = isProcessing
    ? '연결된 기기를 새 모드로 전환하고 있어요'
    : thinqState.connected
      ? `${device.modeLabel} 모드로 전환했어요`
      : thinqState.error ?? '공기청정기 연결을 확인하고 있어요'

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
            <span
              className={`${styles.spaceDot} ${
                isProcessing
                  ? styles.spaceDotBusy
                  : thinqState.connected
                    ? ''
                    : styles.spaceDotBusy
              }`}
            />
            {onlineLabel}
          </span>
        </div>
        <div className={styles.metricRow}>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>공기질</p>
            <p className={styles.metricValue}>{spaceAirQuality}</p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>초미세먼지</p>
            <p className={styles.metricValue}>
              {pm25Display}
              {thinqState.pm25 !== null && <span className={styles.metricUnit}>㎍/m³</span>}
            </p>
          </div>
          <div className={styles.metric}>
            <p className={styles.metricLabel}>냄새</p>
            <p className={styles.metricValue}>{spaceOdor}</p>
          </div>
        </div>
      </section>

      <div className={styles.grid}>
        <AirPurifierDevice
          isOn={purifierOn}
          mode={operationLabel}
          fanLevel={fanLevel}
          pm25={thinqState.pm25 ?? 0}
          airLabel={airLabel}
          pm25Available={thinqState.pm25 !== null}
          stateLabel={purifierOn ? '작동 중' : thinqState.connected ? '꺼짐' : '연결 확인 필요'}
          primary={
            purifierOn
              ? operationLabel
              : thinqState.connected
                ? '전원 꺼짐'
                : '연결 확인 필요'
          }
          secondary={
            thinqState.pm25 !== null
              ? `PM2.5 ${thinqState.pm25}㎍/㎥ · 공기 ${airLabel}`
              : `PM2.5 -- · ${thinqState.error ?? '연결 확인 필요'}`
          }
        />
        <SmartBulbDevice
          color={device.lightColor}
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
