import Link from 'next/link'

export default function Page() {
  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-pink-50 via-purple-50 to-pink-100">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 px-6 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-pink-700">ThinQ 맘스케어 🌸</h1>
          <p className="mt-2 text-sm text-purple-500">
            LG ThinQ 스마트홈과 함께하는 임산부 케어
          </p>
        </header>

        <div className="flex w-full flex-col gap-4">
          <Link
            href="/wife"
            className="block rounded-2xl border border-pink-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="text-4xl">👩</span>
            <h2 className="mt-3 text-xl font-semibold text-pink-600">아내</h2>
            <p className="mt-1 text-sm text-purple-400">
              증상 기록 · 입덧 모드 · 태동 카운터
            </p>
          </Link>

          <Link
            href="/husband"
            className="block rounded-2xl border border-pink-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="text-4xl">👨</span>
            <h2 className="mt-3 text-xl font-semibold text-pink-600">남편</h2>
            <p className="mt-1 text-sm text-purple-400">
              아내 상태 모니터링 · 케어 알림
            </p>
          </Link>
        </div>

        <Link
          href="/hub"
          className="text-xs text-purple-400 underline-offset-2 transition hover:text-purple-600 hover:underline"
        >
          허브 관리자
        </Link>
      </div>
    </div>
  )
}
