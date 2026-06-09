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
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
      aria-label="ThinQ 맘스케어 시작 화면"
      role="status"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/아이콘.png" alt="ThinQ 맘스케어" className="h-40 w-40 object-contain" />
      <p className="mt-6 text-xl font-semibold text-rose-400">ThinQ 맘스케어</p>
      <p className="mt-1 text-sm text-gray-400">LG ThinQ ON</p>
    </div>
  )
}
