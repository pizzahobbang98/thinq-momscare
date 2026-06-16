'use client'

import { motion } from 'framer-motion'
import DeviceCard from '../DeviceCard'
import { BulbIcon } from '../icons'
import styles from '../HomeDemo.module.css'

const BULB_IMAGE = '/assets/devices/bulb.png'

type Props = {
  color: string
  brightness: number
  description: string
}

export default function SmartBulbDevice({ color, brightness, description }: Props) {
  const on = brightness > 0
  const intensity = Math.max(0.25, Math.min(0.75, brightness / 100))

  return (
    <DeviceCard
      title="거실 조명"
      location="거실"
      icon={<BulbIcon />}
      isOn={on}
      stateLabel={on ? '켜짐' : '꺼짐'}
      swatch={on ? color : undefined}
      primary={description}
      secondary={`밝기 ${brightness}%`}
      meta={
        <span className={styles.barTrack}>
          <span className={styles.barFill} style={{ width: `${brightness}%`, background: color }} />
        </span>
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BULB_IMAGE} alt="거실 조명" className={styles.deviceImg} draggable={false} />
      <motion.div
        className={styles.bulbGlow}
        style={{ backgroundColor: color }}
        animate={{ opacity: on ? [intensity * 0.8, intensity, intensity * 0.8] : 0 }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </DeviceCard>
  )
}
