'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export type PickerOption = {
  label: string
  value: string
}

type PickerSheetProps = {
  open: boolean
  title: string
  options: PickerOption[]
  selectedValue: string
  onSelect: (value: string) => void
  onClose: () => void
}

function getOptionClassName(isSelected: boolean) {
  return `min-h-[44px] w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
    isSelected
      ? 'bg-[#FFF1F1] font-semibold text-[#D84C4C]'
      : 'bg-white text-gray-800 hover:bg-gray-50'
  }`
}

export default function PickerSheet({
  open,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: PickerSheetProps) {
  const canUsePortal = typeof document !== 'undefined'

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    const originalTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.touchAction = originalTouchAction
    }
  }, [open])

  if (!canUsePortal || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        aria-label="닫기"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute bottom-0 left-1/2 z-10 flex max-h-[70dvh] w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl"
      >
        <div className="shrink-0 border-b border-[#E6E8EC] bg-white px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#202124]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-[#6B7280] transition hover:bg-[#F7F8FA]"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-white">
          <div className="flex max-h-[calc(70dvh-72px)] flex-col gap-1.5 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {options.map((option) => {
              const isSelected = selectedValue === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onSelect(option.value)
                    onClose()
                  }}
                  className={getOptionClassName(isSelected)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
