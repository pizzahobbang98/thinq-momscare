// LG ThinQ ON 스타일 스플래시
export function SplashScreen() {
  return (
    <div className="splash">
      <div className="splash-center">
        <div className="splash-logo">
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden>
            {/* 집 + 하트 로고 마크 */}
            <path
              d="M42 12 L72 36 L72 70 a4 4 0 0 1 -4 4 L16 74 a4 4 0 0 1 -4 -4 L12 36 Z"
              fill="none"
              stroke="url(#splashGrad)"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M42 58 C38 53 28 47 28 39.5 C28 34 32.5 31 36.5 31 C39 31 41 32.4 42 34.2 C43 32.4 45 31 47.5 31 C51.5 31 56 34 56 39.5 C56 47 46 53 42 58 Z"
              fill="url(#splashGrad)"
            />
            <defs>
              <linearGradient id="splashGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f3739b" />
                <stop offset="100%" stopColor="#a50034" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="splash-title">맘스케어</h1>
        <p className="splash-sub">임신준비부터 육아까지, 집이 함께 돌봐요</p>
        <div className="splash-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
      <footer className="splash-footer">
        <span className="thinq-badge">LG ThinQ ON</span>
      </footer>
    </div>
  );
}
