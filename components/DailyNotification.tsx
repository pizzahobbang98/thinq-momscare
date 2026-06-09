'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface DailyNotificationProps {
  role: 'wife' | 'husband'
  pregnancyWeek: number
  onClose: () => void
}

type NotificationData = {
  title: string
  message: string
  emoji: string
  week: number
}

const AUTO_CLOSE_MS = 5000
const FADE_OUT_MS = 300

const ROLE_STYLES = {
  wife: {
    background: 'linear-gradient(135deg, #FFF0F3 0%, #FFE4E8 50%, #FFDDE6 100%)',
    title: 'text-rose-600',
    body: 'text-rose-900',
    badge: 'bg-rose-100 text-rose-500',
    close: 'text-rose-400 hover:text-rose-600',
    progress: 'bg-rose-300',
    loading: 'text-rose-500',
  },
  husband: {
    background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #BFDBFE 100%)',
    title: 'text-blue-600',
    body: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-500',
    close: 'text-blue-400 hover:text-blue-600',
    progress: 'bg-blue-300',
    loading: 'text-blue-500',
  },
} as const

const SESSION_KEYS = {
  wife: 'wife_notification_shown',
  husband: 'husband_notification_shown',
} as const

export default function DailyNotification({ role, pregnancyWeek, onClose }: DailyNotificationProps) {
  const styles = ROLE_STYLES[role]
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<NotificationData | null>(null)
  const [closing, setClosing] = useState(false)
  const [progressActive, setProgressActive] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const closingRef = useRef(false)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const handleClose = useCallback(() => {
    if (closingRef.current) return

    closingRef.current = true
    setClosing(true)
    setProgressActive(false)

    fadeTimerRef.current = setTimeout(() => {
      onCloseRef.current()
    }, FADE_OUT_MS)
  }, [])

  useEffect(() => {
    mountedRef.current = true

    async function fetchNotification() {
      try {
        const response = await fetch('/api/daily-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, pregnancyWeek }),
        })

        const result = (await response.json()) as NotificationData & {
          success?: boolean
          error?: string
        }

        if (!mountedRef.current) return

        if (!response.ok || !result.success) {
          onCloseRef.current()
          return
        }

        setData({
          title: result.title,
          message: result.message,
          emoji: result.emoji,
          week: result.week,
        })
        sessionStorage.setItem(SESSION_KEYS[role], 'true')
        setLoading(false)

        requestAnimationFrame(() => {
          setProgressActive(true)
        })

        closeTimerRef.current = setTimeout(() => {
          handleClose()
        }, AUTO_CLOSE_MS)
      } catch {
        if (mountedRef.current) {
          onCloseRef.current()
        }
      }
    }

    void fetchNotification()

    return () => {
      mountedRef.current = false
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [handleClose, pregnancyWeek, role])

  if (!loading && !data) return null

  return (
    <div
      className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm transition-opacity duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: styles.background }}
      role="dialog"
      aria-modal="true"
      aria-label="오늘의 알림"
    >
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col items-center justify-center">
        <button
          type="button"
          onClick={handleClose}
          className={`absolute right-0 top-0 text-2xl transition ${styles.close}`}
          aria-label="닫기"
        >
          ✕
        </button>

        <div className="w-full max-w-sm rounded-3xl border border-white/80 bg-white/60 p-8 shadow-xl backdrop-blur-sm">
          {loading ? (
            <div className="flex flex-col items-center">
              <svg
                className={`mb-4 h-12 w-12 animate-spin ${styles.loading}`}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className={`text-sm ${styles.loading}`}>오늘의 알림을 준비하고 있어요...</p>
            </div>
          ) : (
            data && (
              <>
                <p className="mb-4 text-6xl">{data.emoji}</p>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm ${styles.badge}`}
                >
                  {data.week}주차
                </span>
                <h2 className={`mt-3 text-xl font-bold ${styles.title}`}>{data.title}</h2>
                <p className={`mt-3 text-sm leading-relaxed ${styles.body}`}>{data.message}</p>
              </>
            )
          )}
        </div>

        {!loading && data && (
          <div className="absolute bottom-0 left-0 right-0 h-[4px] overflow-hidden bg-white/40">
            <div
              className={`h-full ${styles.progress}`}
              style={{
                width: progressActive ? '0%' : '100%',
                transition: progressActive ? `width ${AUTO_CLOSE_MS}ms linear` : 'none',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
