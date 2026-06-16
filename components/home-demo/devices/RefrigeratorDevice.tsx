'use client'

import { motion } from 'framer-motion'
import DeviceCard from '../DeviceCard'
import { FridgeIcon } from '../icons'
import styles from '../HomeDemo.module.css'

const IMAGE = '/assets/devices/fridge.png'

type Props = {
  scanning: boolean
  detail: string
}

export default function RefrigeratorDevice({ scanning, detail }: Props) {
  return (
    <DeviceCard
      title="냉장고"
      location="주방"
      icon={<FridgeIcon />}
      isOn
      stateLabel={scanning ? '케어 중' : '정상'}
      primary={detail}
      secondary="냉장 3℃ · 냉동 -18℃"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMAGE} alt="냉장고" className={styles.deviceImg} draggable={false} />
      <motion.div
        className={styles.frSeam}
        animate={{ opacity: scanning ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />
      {scanning && <span className={styles.frScan} />}
    </DeviceCard>
  )
}
