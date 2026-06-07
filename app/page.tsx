import Link from 'next/link'

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-pink-100 via-rose-50 to-purple-100">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 px-6 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-pink-600">ThinQ Mom 🌸</h1>
          <p className="mt-2 text-sm text-purple-600">
            LG ThinQ 스마트홈과 함께하는 임산부 케어
          </p>
        </header>

        <div className="flex w-full flex-col gap-4">
          <Link
            href="/wife"
            className="block rounded-2xl border border-pink-200 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:border-pink-300 hover:shadow-lg"
          >
            <span className="text-4xl">👩</span>
            <h2 className="mt-3 text-xl font-semibold text-pink-600">아내</h2>
            <p className="mt-1 text-sm text-purple-500">
              증상 기록 · 입덧 모드 · 태동 카운터
            </p>
          </Link>

          <Link
            href="/husband"
            className="block rounded-2xl border border-pink-200 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:border-pink-300 hover:shadow-lg"
          >
            <span className="text-4xl">👨</span>
            <h2 className="mt-3 text-xl font-semibold text-pink-600">남편</h2>
            <p className="mt-1 text-sm text-purple-500">
              아내 상태 모니터링 · 케어 알림
            </p>
          </Link>
        </div>

        <Link
          href="/hub"
          className="text-xs text-purple-500 underline-offset-2 transition hover:text-purple-700 hover:underline"
        >
          허브 관리자
        </Link>
      </div>
    </div>
  )
}
