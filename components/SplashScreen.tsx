'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setVisible(false), 300)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(160deg, #FFF0F3 0%, #FFF5F7 50%, #FFFFFF 100%)',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
      aria-label="LG ThinQ Mom 시작 화면"
      role="status"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/new_아이콘1.png"
        alt="LG ThinQ Mom"
        className="h-52 w-52 object-contain"
        style={{ mixBlendMode: 'multiply' }}
      />
      <p className="mt-8 text-2xl font-bold text-rose-500 tracking-wide">LG ThinQ Mom</p>
    </div>
  )
}
