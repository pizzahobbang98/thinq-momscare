'use client'

import DeviceCard from '../DeviceCard'
import { AirIcon } from '../icons'
import styles from '../HomeDemo.module.css'

const IMAGE = '/assets/devices/airpurifier.png'
const STREAM_POSITIONS = ['38%', '46%', '50%', '54%', '62%']

type Props = {
  isOn: boolean
  mode: string
  fanLevel: number
  pm25: number
  airLabel: string
  stateLabel?: string
  primary?: string
  secondary?: string
  pm25Available?: boolean
}

export default function AirPurifierDevice({
  isOn,
  mode,
  fanLevel,
  pm25,
  airLabel,
  stateLabel,
  primary,
  secondary,
}: Props) {
  const streams = isOn ? STREAM_POSITIONS.slice(0, Math.round(1 + fanLevel * 1.3)) : []
  const speed = 3 - Math.min(2, fanLevel) * 0.6

  const fanBars = (
    <span className={styles.bars} aria-label={`풍량 ${fanLevel}단계`}>
      {[1, 2, 3].map((level) => (
        <span
          key={level}
          className={`${styles.bar} ${isOn && level <= fanLevel ? styles.barOn : ''}`}
          style={{ height: 7 + level * 4 }}
        />
      ))}
    </span>
  )

  return (
    <DeviceCard
      title="공기청정기"
      location="거실"
      icon={<AirIcon />}
      isOn={isOn}
      stateLabel={stateLabel ?? (isOn ? '작동 중' : '꺼짐')}
      primary={primary ?? (isOn ? `${mode} 운전` : '전원 꺼짐')}
      secondary={secondary ?? `PM2.5 ${pm25}㎍/㎥ · 공기 ${airLabel}`}
      meta={fanBars}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMAGE} alt="공기청정기" className={styles.deviceImg} draggable={false} />
      {streams.map((left, index) => (
        <span
          key={left}
          className={styles.airStream}
          style={{ left, animationDelay: `${index * 0.45}s`, animationDuration: `${speed}s` }}
        />
      ))}
    </DeviceCard>
  )
}
