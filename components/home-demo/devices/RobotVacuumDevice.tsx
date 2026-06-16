'use client'

import { motion } from 'framer-motion'
import DeviceCard from '../DeviceCard'
import { RobotIcon } from '../icons'
import styles from '../HomeDemo.module.css'

const IMAGE = '/assets/devices/robot.png'

export default function RobotVacuumDevice({ active }: { active: boolean }) {
  const battery = active ? 64 : 100

  return (
    <DeviceCard
      title="로봇청소기"
      location="거실"
      icon={<RobotIcon />}
      isOn={active}
      stateLabel={active ? '청소 중' : '대기'}
      primary={active ? '거실 청소' : '충전 중'}
      secondary={active ? '구석구석 청소하고 있어요' : '충전 완료 · 도크 대기'}
      meta={
        <span className={styles.battery}>
          <span className={styles.batShell}>
            <span className={styles.batFill} style={{ width: `${battery}%` }} />
          </span>
          {battery}%
        </span>
      }
    >
      <div className={styles.robotFit}>
        <motion.div
          className={styles.robotMover}
          animate={active ? { x: [0, 14, -14, 6, 0] } : { x: 0 }}
          transition={active ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMAGE} alt="로봇청소기" className={styles.deviceImg} draggable={false} />
          {active && <span className={`${styles.robotBrush} ${styles.robotBrushLeft}`} />}
          {active && <span className={`${styles.robotBrush} ${styles.robotBrushRight}`} />}
        </motion.div>
      </div>
    </DeviceCard>
  )
}
