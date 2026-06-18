'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EMPTY_THINQ_DEVICE_STATE,
  fetchThinQDeviceState,
  type ThinQDeviceStateView,
} from '@/lib/thinq-device-state-client'

const POLL_INTERVAL_MS = 30_000

export function useThinQDeviceState(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled !== false
  const [state, setState] = useState<ThinQDeviceStateView>(EMPTY_THINQ_DEVICE_STATE)
  const inFlightRef = useRef(false)

  const refetch = useCallback(async () => {
    if (!enabled || inFlightRef.current) return
    inFlightRef.current = true
    setState((current) => ({ ...current, loading: current.lastFetchedAt === null }))

    try {
      const next = await fetchThinQDeviceState()
      setState(next)
    } catch (error) {
      const message = error instanceof Error ? error.message : '연결 확인 필요'
      setState({
        ...EMPTY_THINQ_DEVICE_STATE,
        loading: false,
        error: message,
        lastFetchedAt: Date.now(),
      })
    } finally {
      inFlightRef.current = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    void refetch()

    const pollTimer = window.setInterval(() => {
      void refetch()
    }, POLL_INTERVAL_MS)

    const handleFocus = () => {
      void refetch()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refetch()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(pollTimer)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [enabled, refetch])

  return { thinqState: state, refetchThinQState: refetch }
}
