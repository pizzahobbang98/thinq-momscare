import Link from 'next/link'

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header>
          <h1 className="text-4xl font-bold text-white">ThinQ Mom</h1>
          <p className="mt-3 text-sm font-normal text-gray-400">
            LG ThinQ 스마트홈과 함께하는 임산부 케어
          </p>
        </header>

        <div className="flex w-full flex-col gap-4">
          <Link
            href="/wife"
            className="block rounded-2xl border border-gray-700 border-l-4 border-l-rose-500 bg-white p-6 shadow-sm transition hover:scale-[1.02]"
          >
            <span className="text-4xl">👩</span>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">아내</h2>
            <p className="mt-2 text-sm font-normal text-gray-500">
              증상 기록 · 입덧 모드 · 태동 카운터
            </p>
          </Link>

          <Link
            href="/husband"
            className="block rounded-2xl border border-gray-700 border-l-4 border-l-blue-500 bg-white p-6 shadow-sm transition hover:scale-[1.02]"
          >
            <span className="text-4xl">👨</span>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">남편</h2>
            <p className="mt-2 text-sm font-normal text-gray-500">
              아내 상태 모니터링 · 케어 알림
            </p>
          </Link>
        </div>

        <Link
          href="/hub"
          className="text-sm text-gray-400 underline-offset-2 transition hover:text-gray-300 hover:underline"
        >
          허브 관리자
        </Link>
      </div>
    </div>
  )
}
