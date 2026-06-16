'use client'

import { AnimatePresence, motion } from 'framer-motion'
import DeviceCard from '../DeviceCard'
import { MonitorIcon } from '../icons'
import styles from '../HomeDemo.module.css'

const IMAGE = '/assets/devices/standbyme.png'

type Props = {
  isOn: boolean
  tone: string
  contentLabel: string
}

export default function StandbyMeDevice({ isOn, tone, contentLabel }: Props) {
  const playing = (
    <span className={styles.playing} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={styles.playDot} style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  )

  return (
    <DeviceCard
      title="스탠바이미"
      location="거실"
      icon={<MonitorIcon />}
      isOn={isOn}
      stateLabel={isOn ? '재생 중' : '대기'}
      primary={isOn ? contentLabel : '홈 화면'}
      secondary={isOn ? 'ThinQ 케어 콘텐츠' : '콘텐츠 대기 중'}
      meta={isOn ? playing : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMAGE} alt="스탠바이미" className={styles.deviceImg} draggable={false} />
      <div className={`${styles.smScreen} ${isOn ? styles.smScreenOn : ''}`}>
        <motion.div
          className={styles.smScene}
          style={{ background: tone }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isOn ? 1 : 0 }}
          transition={{ duration: 0.8, delay: isOn ? 0.1 : 0 }}
        />
        <AnimatePresence>
          {isOn && (
            <motion.div
              key="flash"
              className={styles.smFlash}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 0.5, times: [0, 0.3, 1], ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </div>
    </DeviceCard>
  )
}
