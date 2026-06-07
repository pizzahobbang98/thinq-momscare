'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

type ToastState = {
  message: string
  type: ToastType
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, type })
    timerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  return { toast, showToast }
}
