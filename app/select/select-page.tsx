'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { withIga } from '@/lib/korean'

function buildRoleHref(role: 'wife' | 'husband', name: string, status: string, weeks: string | null) {
  const params = new URLSearchParams({ name, status })
  if (weeks) params.set('weeks', weeks)
  return `/${role}?${params.toString()}`
}

function SelectContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') ?? '아기'
  const status = searchParams.get('status') ?? 'preparing'
  const weeks = searchParams.get('weeks')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header>
          <h1 className="text-4xl font-bold text-white">ThinQ Mom</h1>
          <p className="mt-3 text-sm font-normal text-gray-400">
            반가워요! {withIga(name)} 기다리고 있어요 🌸
          </p>
        </header>

        <div className="flex w-full flex-col gap-4">
          <Link
            href={buildRoleHref('wife', name, status, weeks)}
            className="block rounded-2xl border border-gray-700 border-l-4 border-l-rose-500 bg-white p-6 shadow-sm transition hover:scale-[1.02]"
          >
            <span className="text-4xl">👩</span>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">아내</h2>
            <p className="mt-2 text-sm font-normal text-gray-500">
              기록하고, 돌봄 받고, 아기와 소통해요
            </p>
          </Link>

          <Link
            href={buildRoleHref('husband', name, status, weeks)}
            className="block rounded-2xl border border-gray-700 border-l-4 border-l-blue-500 bg-white p-6 shadow-sm transition hover:scale-[1.02]"
          >
            <span className="text-4xl">👨</span>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">남편</h2>
            <p className="mt-2 text-sm font-normal text-gray-500">
              아내 상태를 확인하고, 함께 케어해요
            </p>
          </Link>
        </div>

        <Link
          href="/hub"
          className="text-sm text-gray-400 underline-offset-2 transition hover:text-gray-300 hover:underline"
        >
          허브 화면으로 가기 🖥️
        </Link>
      </div>
    </div>
  )
}

export default function SelectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <p className="text-sm text-gray-400">불러오는 중...</p>
        </div>
      }
    >
      <SelectContent />
    </Suspense>
  )
}
