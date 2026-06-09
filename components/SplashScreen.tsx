'use client'

import { useEffect, useState } from 'react'

const SPLASH_SEEN_KEY = 'thinq-mom-splash-seen'

export default function SplashScreen() {
  const [mounted, setMounted] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.sessionStorage.getItem(SPLASH_SEEN_KEY) === 'true') {
      const skipTimer = setTimeout(() => setMounted(false), 0)
      return () => clearTimeout(skipTimer)
    }

    window.sessionStorage.setItem(SPLASH_SEEN_KEY, 'true')

    const frame = requestAnimationFrame(() => setVisible(true))
    const fadeTimer = setTimeout(() => setVisible(false), 2000)
    const unmountTimer = setTimeout(() => setMounted(false), 2300)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(fadeTimer)
      clearTimeout(unmountTimer)
    }
  }, [])

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white transition-opacity duration-300 ease-in-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-label="ThinQ 맘스케어 시작 화면"
      role="status"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/아이콘.png" alt="ThinQ 맘스케어" className="h-32 w-32 object-contain" />
      <p className="mt-4 text-xl font-semibold text-rose-400">ThinQ 맘스케어</p>
      <p className="mt-1 text-sm text-gray-400">LG ThinQ ON</p>
    </div>
  )
}
