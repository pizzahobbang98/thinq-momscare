'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  DEFAULT_SHARED_DEMO_STATE,
  normalizeSharedDemoState,
  type SharedDemoState,
} from '@/lib/shared-demo-state'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getStandbyDisplayStateFromSharedState } from '@/lib/standby-display-state'
import styles from './standby-display.module.css'

const POLL_INTERVAL_MS = 5_000
const REALTIME_FALLBACK_DELAY_MS = 5_000
const REALTIME_RECENT_EVENT_MS = 10_000
const SHARED_DEMO_STATE_SOURCE = 'demo_state'
const SHARED_DEMO_STATE_MODE = 'DEMO_STATE'
const YOUTUBE_VIEWPORT_WIDTH = 854
const YOUTUBE_VIEWPORT_HEIGHT = 480

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

type YouTubePlayer = {
  loadVideoById: (options: { videoId: string; startSeconds?: number; endSeconds?: number }) => void
  playVideo: () => void
  unMute: () => void
  setVolume: (volume: number) => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  destroy: () => void
}

type YouTubePlayerEvent = {
  target: YouTubePlayer
  data?: number
}

type YouTubeConstructor = new (
  elementId: string,
  options: {
    videoId: string
    width?: number
    height?: number
    playerVars: Record<string, string | number>
    events: {
      onReady: (event: YouTubePlayerEvent) => void
      onStateChange: (event: YouTubePlayerEvent) => void
      onError: (event: YouTubePlayerEvent) => void
    }
  },
) => YouTubePlayer

type YouTubeApi = {
  Player: YouTubeConstructor
  PlayerState: {
    ENDED: number
  }
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
    __standbyYouTubeApiPromise?: Promise<YouTubeApi>
  }
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (window.__standbyYouTubeApiPromise) return window.__standbyYouTubeApiPromise

  window.__standbyYouTubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]')
    const previousReady = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      if (window.YT?.Player) {
        resolve(window.YT)
      } else {
        reject(new Error('YouTube API did not initialize.'))
      }
    }

    if (!existingScript) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => reject(new Error('YouTube API script failed to load.'))
      document.head.appendChild(script)
    }
  })

  return window.__standbyYouTubeApiPromise
}

function normalizeApiDemoState(
  value: NonNullable<DemoStatePayload['state']>,
  fallback: SharedDemoState,
): SharedDemoState {
  const normalized = normalizeSharedDemoState(value, fallback)
  const mode = nullableString(value.mode)
  const modeLabel = nullableString(value.modeLabel)
  const routineId = normalized.simulationRoutine ?? normalized.demoMode?.routine ?? nullableString(value.routineId)
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
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [playerScale, setPlayerScale] = useState(1)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const activeVideoIdRef = useRef<string | null>(null)
  const demoStateRefreshInFlightRef = useRef(false)

  const standby = useMemo(() => getStandbyDisplayStateFromSharedState(state), [state])
  const startSeconds = standby.youtubeStartSeconds ?? 0
  const endSeconds = standby.youtubeEndSeconds ?? 300
  const showYouTubePlayer = audioUnlocked && Boolean(standby.youtubeId)

  const refreshState = useCallback(async () => {
    if (demoStateRefreshInFlightRef.current) return
    demoStateRefreshInFlightRef.current = true

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
    } finally {
      demoStateRefreshInFlightRef.current = false
    }
  }, [])

  const playCurrentVideo = useCallback((player: YouTubePlayer, forceReload = false) => {
    if (!standby.youtubeId) return

    try {
      if (forceReload || activeVideoIdRef.current !== standby.youtubeId) {
        player.loadVideoById({
          videoId: standby.youtubeId,
          startSeconds,
          endSeconds,
        })
        activeVideoIdRef.current = standby.youtubeId
      }
      player.unMute()
      player.setVolume(86)
      player.playVideo()
      setPlayerError(null)
    } catch (error) {
      console.warn('[standby-display] YouTube play failed:', error)
      setPlayerError('영상 재생을 시작하지 못했어요. 시연 시작을 한 번 더 눌러주세요.')
    }
  }, [endSeconds, standby.youtubeId, startSeconds])

  const unlockAudio = useCallback(async () => {
    setAudioUnlocked(true)
    setPlayerError(null)
    if (!standby.youtubeId) return

    try {
      const api = await loadYouTubeApi()
      if (playerRef.current) {
        playCurrentVideo(playerRef.current, true)
        return
      }

      playerRef.current = new api.Player('standby-youtube-player', {
        videoId: standby.youtubeId,
        width: YOUTUBE_VIEWPORT_WIDTH,
        height: YOUTUBE_VIEWPORT_HEIGHT,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          start: startSeconds,
          end: endSeconds,
        },
        events: {
          onReady: (event) => {
            setPlayerReady(true)
            playCurrentVideo(event.target, true)
          },
          onStateChange: (event) => {
            if (event.data === api.PlayerState.ENDED) {
              event.target.seekTo(startSeconds, true)
              event.target.playVideo()
            }
          },
          onError: (event) => {
            console.warn('[standby-display] YouTube player error:', event.data)
            setPlayerError('이 영상은 현재 재생할 수 없어요. 다른 영상 ID로 교체가 필요합니다.')
          },
        },
      })
    } catch (error) {
      console.warn('[standby-display] YouTube init failed:', error)
      setPlayerError('YouTube 플레이어를 불러오지 못했어요. 네트워크를 확인해주세요.')
    }
  }, [endSeconds, playCurrentVideo, standby.youtubeId, startSeconds])

  useEffect(() => {
    if (!audioUnlocked || !playerReady || !playerRef.current || !standby.youtubeId) return
    playCurrentVideo(playerRef.current)
  }, [audioUnlocked, playerReady, playCurrentVideo, standby.youtubeId])

  useEffect(() => {
    if (!audioUnlocked || playerRef.current || !standby.youtubeId) return
    void unlockAudio()
  }, [audioUnlocked, standby.youtubeId, unlockAudio])

  useEffect(() => {
    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  useEffect(() => {
    const updatePlayerScale = () => {
      setPlayerScale(Math.max(
        window.innerWidth / YOUTUBE_VIEWPORT_WIDTH,
        window.innerHeight / YOUTUBE_VIEWPORT_HEIGHT,
      ))
    }

    updatePlayerScale()
    window.addEventListener('resize', updatePlayerScale)
    return () => window.removeEventListener('resize', updatePlayerScale)
  }, [])

  useEffect(() => {
    let realtimeSubscribed = false
    let lastRealtimeEventAt = 0
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
    const fallbackStartTimer = window.setTimeout(() => {
      if (!realtimeSubscribed) startFallbackPolling()
    }, REALTIME_FALLBACK_DELAY_MS)

    watchdogTimer = window.setInterval(() => {
      if (realtimeSubscribed && lastRealtimeEventAt > 0 && Date.now() - lastRealtimeEventAt < REALTIME_RECENT_EVENT_MS) {
        stopFallbackPolling()
        return
      }
      startFallbackPolling()
    }, REALTIME_FALLBACK_DELAY_MS)

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
          lastRealtimeEventAt = Date.now()
          setConnected(true)
          stopFallbackPolling()
          void refreshState()
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeSubscribed = true
          lastRealtimeEventAt = Date.now()
          setConnected(true)
          stopFallbackPolling()
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
        '--standby-youtube-scale': playerScale,
      } as CSSProperties}
    >
      <section className={`${styles.screen} ${standby.dimmed ? styles.dimmed : ''} ${showYouTubePlayer ? styles.screenPlaying : ''}`}>
        <div className={styles.youtubeHost} aria-hidden={!showYouTubePlayer}>
          <div className={styles.youtubeFrameShell}>
            <div id="standby-youtube-player" className={styles.youtubePlayer} />
          </div>
        </div>

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

        {!audioUnlocked && (
          <button
            type="button"
            className={styles.unlockButton}
            onClick={unlockAudio}
          >
            <span>시연 시작</span>
            <small>{standby.youtubeId ? '영상과 소리를 켭니다' : '모드가 실행되면 영상과 소리가 이어집니다'}</small>
          </button>
        )}

        {playerError && (
          <button type="button" className={styles.retryButton} onClick={unlockAudio}>
            {playerError}
          </button>
        )}

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
      <div className={`${styles.generated} ${styles.homeScreen}`}>
        <div className={styles.homeTop}>
          <span>12:41 PM</span>
          <span>맑음 33°C</span>
        </div>
        <div className={styles.homeTiles}>
          <span>LG 채널</span>
          <span>HDMI</span>
          <span>USB</span>
        </div>
        <div className={styles.homeApps}>
          {['Netflix', 'wavve', 'TVING', 'WATCHA', 'TikTok TV', 'YouTube', 'Apps', 'ThinQ'].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <span className={styles.homePageDot} />
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
