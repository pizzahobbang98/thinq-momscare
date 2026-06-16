'use client'

import { motion } from 'framer-motion'
import DeviceCard from '../DeviceCard'
import { WasherIcon } from '../icons'
import styles from '../HomeDemo.module.css'

const IMAGE = '/assets/devices/washtower.png'

export default function WashTowerDevice({ active }: { active: boolean }) {
  return (
    <DeviceCard
      title="워시타워"
      location="다용도실"
      icon={<WasherIcon />}
      isOn={active}
      stateLabel={active ? '세탁 중' : '대기'}
      primary={active ? '표준 코스' : '세탁 종료'}
      secondary={active ? '약 32분 남음' : '문 잠금 해제됨'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMAGE} alt="워시타워" className={styles.deviceImg} draggable={false} />
      {active && <span className={styles.wtDrumBottom} />}
      <motion.span
        className={styles.wtDrumTop}
        animate={active ? { opacity: [0.25, 0.5, 0.25] } : { opacity: 0 }}
        transition={active ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
      />
    </DeviceCard>
  )
}
