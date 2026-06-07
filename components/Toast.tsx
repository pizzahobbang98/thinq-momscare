'use client'

import { useEffect, useState } from 'react'

type ToastProps = {
  message: string
  type: 'success' | 'error' | 'info'
}

const TYPE_STYLES = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
} as const

const TYPE_ICONS = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
} as const

export default function Toast({ message, type }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[100] max-w-xs -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ${TYPE_STYLES[type]} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      role="status"
    >
      {TYPE_ICONS[type]} {message}
    </div>
  )
}
