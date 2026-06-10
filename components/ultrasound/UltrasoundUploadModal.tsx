'use client'

import { useEffect, useRef, useState } from 'react'
import Spinner from '@/components/Spinner'
import UltrasoundMemoryCardView from '@/components/ultrasound/UltrasoundMemoryCardView'
import { ULTRASOUND_DISCLAIMER } from '@/lib/pregnancy-fruit'
import { submitUltrasoundAnalyze } from '@/lib/ultrasound-client'
import type { UltrasoundAnalyzeResponse } from '@/lib/ultrasound-types'

const MAX_FILE_SIZE = 10 * 1024 * 1024

type UltrasoundUploadModalProps = {
  open: boolean
  onClose: () => void
  pregnancyWeek: number | null
  babyName: string | null
  onSaved: (result: UltrasoundAnalyzeResponse) => void
}

export default function UltrasoundUploadModal({
  open,
  onClose,
  pregnancyWeek,
  babyName,
  onSaved,
}: UltrasoundUploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UltrasoundAnalyzeResponse | null>(null)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function resetPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current)
      previewRef.current = null
    }
  }

  function resetState() {
    resetPreview()
    setPreview(null)
    setFile(null)
    setError(null)
    setResult(null)
    setVoiceError(null)
    setIsDragging(false)
    setIsLoading(false)
    setIsPlayingVoice(false)
    audioRef.current?.pause()
    audioRef.current = null
  }

  function handleClose() {
    resetState()
    onClose()
  }

  useEffect(() => {
    return () => {
      resetPreview()
      audioRef.current?.pause()
    }
  }, [])

  function handleFile(selected: File) {
    setError(null)
    setResult(null)
    setVoiceError(null)

    if (!selected.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    resetPreview()
    const previewUrl = URL.createObjectURL(selected)
    previewRef.current = previewUrl
    setPreview(previewUrl)
    setFile(selected)
  }

  async function handleSave() {
    if (!file) {
      setError('저장할 사진을 먼저 선택해 주세요.')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const submitResult = await submitUltrasoundAnalyze({
        file,
        pregnancyWeek,
        babyName,
        imagePreviewUrl: preview,
      })

      if (!submitResult.ok) {
        setError(submitResult.error)
        return
      }

      setResult(submitResult.data)
      onSaved(submitResult.data)
    } catch (saveError) {
      console.error('초음파 기록 저장 실패:', saveError)
      setError('기록 저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePlayVoice() {
    const text = result?.memoryCard.babyVoiceText ?? result?.babyVoiceText
    if (!text) return

    setVoiceError(null)
    setIsPlayingVoice(true)

    try {
      audioRef.current?.pause()

      if (result?.ttsAudioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${result.ttsAudioBase64}`)
        audioRef.current = audio
        audio.onended = () => {
          setIsPlayingVoice(false)
          audioRef.current = null
        }
        audio.onerror = () => {
          setIsPlayingVoice(false)
          audioRef.current = null
          setVoiceError('음성 생성에 실패했어요. 텍스트 기록은 저장됐어요.')
        }
        await audio.play()
        return
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('TTS failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setIsPlayingVoice(false)
        audioRef.current = null
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setIsPlayingVoice(false)
        audioRef.current = null
        setVoiceError('음성 생성에 실패했어요. 텍스트 기록은 저장됐어요.')
      }
      await audio.play()
    } catch (playError) {
      console.warn('아기 목소리 재생 실패:', playError)
      setVoiceError('음성 생성에 실패했어요. 텍스트 기록은 저장됐어요.')
      setIsPlayingVoice(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
      onClick={handleClose}
    >
      <div
        className="mx-4 mb-8 flex max-h-[90vh] w-full max-w-[430px] flex-col overflow-hidden rounded-3xl bg-white shadow-xl sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">우리 아기 초음파 기록</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] text-xl text-gray-400 transition hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const dropped = e.dataTransfer.files[0]
              if (dropped) handleFile(dropped)
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 transition ${
              isDragging
                ? 'border-rose-300 bg-rose-50'
                : 'border-gray-200 bg-gray-50 hover:border-rose-200 hover:bg-rose-50/40'
            }`}
          >
            <p className="text-sm font-medium text-gray-600">초음파 사진을 선택하거나 올려주세요</p>
            <p className="mt-2 text-xs text-gray-400">10MB 이하 이미지</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0]
                if (selected) handleFile(selected)
                e.target.value = ''
              }}
            />
          </div>

          {preview && (
            <div className="mt-4 overflow-hidden rounded-2xl bg-gray-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="초음파 미리보기" className="mx-auto max-h-56 object-contain" />
            </div>
          )}

          {!result && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || !file}
              className="mt-4 min-h-[44px] w-full rounded-2xl bg-gray-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60"
            >
              {isLoading ? <Spinner text="메모리 카드를 만드는 중..." /> : '메모리 카드 만들기'}
            </button>
          )}

          {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}

          {result?.memoryCard && (
            <div className="mt-4 space-y-3">
              <UltrasoundMemoryCardView
                card={result.memoryCard}
                imageUrl={result.imagePreviewUrl ?? preview}
              />
              <button
                type="button"
                onClick={handlePlayVoice}
                disabled={isPlayingVoice}
                className="min-h-[44px] w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-rose-200 disabled:opacity-60"
              >
                {isPlayingVoice ? <Spinner text="재생 중..." /> : '아기 메시지 듣기'}
              </button>
              {voiceError && (
                <p className="text-center text-xs text-amber-600">{voiceError}</p>
              )}
              {result.error && (
                <p className="text-center text-xs text-amber-600">{result.error}</p>
              )}
              {!result.savedToDb && (
                <p className="text-center text-xs text-amber-600">
                  {result.savedToStorage
                    ? '일부 저장 기능만 사용했어요.'
                    : '기기에 저장했어요. Supabase 연결이 없을 때 localStorage에 보관됩니다.'}
                </p>
              )}
              <p className="text-xs leading-relaxed text-gray-400">{ULTRASOUND_DISCLAIMER}</p>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] w-full rounded-2xl bg-gray-900 px-4 text-sm font-semibold text-white"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
