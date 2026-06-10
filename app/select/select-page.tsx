'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { withIga } from '@/lib/korean'
import { resolveOnboardingRole } from '@/lib/onboarding-profile'

function buildRoleHref(
  role: 'wife' | 'husband',
  name: string,
  status: string,
  weeks: string | null,
  fresh: string | null,
) {
  const params = new URLSearchParams({ name, status })
  if (weeks) params.set('weeks', weeks)
  if (fresh === 'true') params.set('fresh', 'true')
  return `/${role}?${params.toString()}`
}

function getSelectDescription(role: ReturnType<typeof resolveOnboardingRole>) {
  if (role === 'wife') return '엄마품 화면으로 이동할 수 있어요.'
  if (role === 'husband') return '아빠손길 화면으로 이동할 수 있어요.'
  return '사용할 화면을 선택해주세요.'
}

function SelectContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') ?? '아기'
  const status = searchParams.get('status') ?? 'preparing'
  const weeks = searchParams.get('weeks')
  const fresh = searchParams.get('fresh')
  const role = resolveOnboardingRole(searchParams.get('role'))

  const showWife = !role || role === 'wife'
  const showHusband = !role || role === 'husband'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-[430px] flex-col gap-8">
        <header>
          <h1 className="text-4xl font-bold text-white">ThinQ Mom</h1>
          <p className="mt-3 text-sm font-normal text-gray-400">
            반가워요! {withIga(name)} 기다리고 있어요
          </p>
          <p className="mt-2 text-sm text-gray-500">{getSelectDescription(role)}</p>
        </header>

        <div className="flex w-full flex-col gap-4">
          {showWife && (
            <Link
              href={buildRoleHref('wife', name, status, weeks, fresh)}
              className="block min-h-[44px] rounded-2xl border border-gray-700 border-l-4 border-l-rose-500 bg-white p-6 shadow-sm transition hover:scale-[1.02]"
            >
              <span className="text-4xl">🌸</span>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">아내 화면으로 가기</h2>
              <p className="mt-2 text-sm font-normal text-gray-500">
                기록하고, 돌봄 받고, 아기와 소통해요
              </p>
            </Link>
          )}

          {showHusband && (
            <Link
              href={buildRoleHref('husband', name, status, weeks, fresh)}
              className="block min-h-[44px] rounded-2xl border border-gray-700 border-l-4 border-l-blue-500 bg-white p-6 shadow-sm transition hover:scale-[1.02]"
            >
              <span className="text-4xl">💙</span>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">남편 화면으로 가기</h2>
              <p className="mt-2 text-sm font-normal text-gray-500">
                오늘의 추천과 집안일 제안을 확인해요
              </p>
            </Link>
          )}
        </div>

        {!role && (
          <Link
            href="/onboarding"
            className="text-center text-xs text-gray-500 underline-offset-2 transition hover:text-gray-400 hover:underline"
          >
            역할을 다시 선택하려면 온보딩으로 이동
          </Link>
        )}

        <Link
          href="/hub"
          className="min-h-[44px] text-center text-sm text-gray-400 underline-offset-2 transition hover:text-gray-300 hover:underline"
        >
          허브 화면으로 가기
        </Link>
      </div>
    </div>
  )
}

export default function SelectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <p className="text-sm text-gray-400">불러오는 중...</p>
        </div>
      }
    >
      <SelectContent />
    </Suspense>
  )
}
