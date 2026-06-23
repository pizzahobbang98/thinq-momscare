'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  DEFAULT_SHARED_DEMO_STATE,
  normalizeSharedDemoState,
  type SharedDemoState,
} from '@/lib/shared-demo-state'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getStandbyDisplayStateFromSharedState } from '@/lib/standby-display-state'
import styles from './standby-display.module.css'

const POLL_INTERVAL_MS = 900
const SHARED_DEMO_STATE_SOURCE = 'demo_state'
const SHARED_DEMO_STATE_MODE = 'DEMO_STATE'

type DemoStatePayload = {
  state?: SharedDemoState & {
    mode?: string | null
    modeLabel?: string | null
    routineId?: string | null
  }
}

type SharedStateRealtimeRow = {
  mode?: string | null
  source?: string | null
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeApiDemoState(
  value: NonNullable<DemoStatePayload['state']>,
  fallback: SharedDemoState,
): SharedDemoState {
  const normalized = normalizeSharedDemoState(value, fallback)
  const mode = nullableString(value.mode)
  const modeLabel = nullableString(value.modeLabel)
  const routineId = nullableString(value.routineId) ?? normalized.simulationRoutine
  const currentRoutine = normalized.currentRoutine ?? mode
  const hasActiveMode = Boolean(routineId || currentRoutine)

  return {
    ...normalized,
    currentRoutine,
    simulationRoutine: routineId,
    latestCareModeLabel: normalized.latestCareModeLabel ?? modeLabel,
    careState: hasActiveMode && normalized.careState === 'idle' ? 'completed' : normalized.careState,
  }
}

export default function StandbyDisplayClient() {
  const [state, setState] = useState<SharedDemoState>(DEFAULT_SHARED_DEMO_STATE)
  const [connected, setConnected] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const standby = useMemo(() => getStandbyDisplayStateFromSharedState(state), [state])

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch('/api/demo-state', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('shared state fetch failed')

      const payload = (await response.json()) as DemoStatePayload
      if (payload.state) {
        setState((current) => normalizeApiDemoState(payload.state!, current))
        setConnected(true)
        setLastSyncedAt(new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }))
      }
    } catch (error) {
      console.warn('[standby-display] shared state refresh failed:', error)
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    let realtimeSubscribed = false
    let fallbackTimer: number | null = null
    let watchdogTimer: number | null = null

    const startFallbackPolling = () => {
      if (fallbackTimer !== null) return
      fallbackTimer = window.setInterval(refreshState, POLL_INTERVAL_MS)
    }

    const stopFallbackPolling = () => {
      if (fallbackTimer === null) return
      window.clearInterval(fallbackTimer)
      fallbackTimer = null
    }

    const initialTimer = window.setTimeout(refreshState, 0)
    const fallbackStartTimer = window.setTimeout(startFallbackPolling, 800)

    watchdogTimer = window.setInterval(() => {
      startFallbackPolling()
    }, 1400)

    if (!isSupabaseConfigured) {
      startFallbackPolling()
      return () => {
        window.clearTimeout(initialTimer)
        window.clearTimeout(fallbackStartTimer)
        if (watchdogTimer !== null) window.clearInterval(watchdogTimer)
        stopFallbackPolling()
      }
    }

    const channel = supabase
      .channel(`standby-display-${crypto.randomUUID?.() ?? Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mode_runs',
          filter: `source=eq.${SHARED_DEMO_STATE_SOURCE}`,
        },
        (payload) => {
          const row = payload.new as SharedStateRealtimeRow
          if (row.mode !== SHARED_DEMO_STATE_MODE || row.source !== SHARED_DEMO_STATE_SOURCE) return
          setConnected(true)
          void refreshState()
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeSubscribed = true
          setConnected(true)
          void refreshState()
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          realtimeSubscribed = false
          setConnected(false)
          startFallbackPolling()
        }
      })

    return () => {
      window.clearTimeout(initialTimer)
      window.clearTimeout(fallbackStartTimer)
      if (watchdogTimer !== null) window.clearInterval(watchdogTimer)
      stopFallbackPolling()
      supabase.removeChannel(channel)
    }
  }, [refreshState])

  return (
    <main
      className={`${styles.shell} ${standby.active ? styles.shellActive : styles.shellIdle}`}
      style={{
        '--standby-bg': standby.background,
        '--standby-accent': standby.accent,
      } as CSSProperties}
    >
      <section className={`${styles.screen} ${standby.dimmed ? styles.dimmed : ''}`}>
        <div className={styles.visualLayer}>
          {standby.active && standby.image ? (
            <Image
              src={standby.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className={styles.image}
            />
          ) : (
            <GeneratedStandbyVisual modeKey={standby.key} active={standby.active} />
          )}
          <span className={styles.surfaceGlow} />
          <span className={styles.vignette} />
        </div>

        <div className={styles.copy}>
          <p className={styles.kicker}>LG StandbyMe</p>
          <h1>{standby.active ? standby.title : '대기 중'}</h1>
          <p>{standby.subtitle}</p>
        </div>

        <div className={styles.statusBar}>
          <span className={`${styles.liveDot} ${connected ? styles.liveDotOn : ''}`} />
          <span>{standby.modeLabel}</span>
          {lastSyncedAt && <span className={styles.syncedAt}>{lastSyncedAt}</span>}
        </div>
      </section>
    </main>
  )
}

function GeneratedStandbyVisual({ modeKey, active }: { modeKey: string; active: boolean }) {
  if (!active) {
    return (
      <div className={`${styles.generated} ${styles.generatedOff}`}>
        <span />
        <span />
      </div>
    )
  }

  if (modeKey.includes('ocean')) {
    return (
      <div className={`${styles.generated} ${styles.ocean}`}>
        <span />
        <span />
        <span />
      </div>
    )
  }

  if (modeKey.includes('forest')) {
    return (
      <div className={`${styles.generated} ${styles.forest}`}>
        <span />
        <span />
        <span />
      </div>
    )
  }

  if (modeKey.includes('city')) {
    return (
      <div className={`${styles.generated} ${styles.city}`}>
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    )
  }

  if (modeKey.includes('sleep')) {
    return (
      <div className={`${styles.generated} ${styles.sleep}`}>
        <span />
        <span />
        <span />
      </div>
    )
  }

  return (
    <div className={`${styles.generated} ${styles.care}`}>
      <span />
      <span />
      <span />
    </div>
  )
}
