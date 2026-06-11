import type { BabyStage } from '@/lib/pregnancy'

type BabyStageIllustrationProps = {
  stage: BabyStage
  className?: string
}

const STAGE_PALETTE: Record<
  BabyStage,
  { fill: string; glow: string; accent: string; bg: string }
> = {
  seed: { fill: '#F9C784', glow: '#FFE8B8', accent: '#E8A849', bg: '#FFF8EB' },
  early: { fill: '#F5B7C4', glow: '#FFE4EC', accent: '#E8899E', bg: '#FFF5F7' },
  middle: { fill: '#F2A0B8', glow: '#FFD9E4', accent: '#D97F9A', bg: '#FFF0F4' },
  growth: { fill: '#E8A0C8', glow: '#F8D4EA', accent: '#C97EAE', bg: '#FDF0F7' },
  late: { fill: '#C9A0E8', glow: '#E8D4F8', accent: '#A87FD0', bg: '#F7F0FD' },
  ready: { fill: '#F5A0A0', glow: '#FFD4D4', accent: '#E07E7E', bg: '#FFF0F0' },
}

function SeedIllustration({ palette }: { palette: (typeof STAGE_PALETTE)['seed'] }) {
  return (
    <>
      <circle cx="60" cy="62" r="34" fill={palette.glow} opacity="0.85" />
      <circle cx="60" cy="62" r="10" fill={palette.fill} />
      <circle cx="60" cy="62" r="18" fill={palette.glow} opacity="0.55" />
      <circle cx="42" cy="48" r="3" fill={palette.accent} opacity="0.45" />
      <circle cx="78" cy="44" r="2.5" fill={palette.accent} opacity="0.35" />
      <circle cx="74" cy="72" r="2" fill={palette.accent} opacity="0.3" />
      <path
        d="M60 38 C56 30 48 28 44 34"
        stroke={palette.accent}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </>
  )
}

function EarlyIllustration({ palette }: { palette: (typeof STAGE_PALETTE)['early'] }) {
  return (
    <>
      <ellipse cx="60" cy="64" rx="36" ry="34" fill={palette.glow} opacity="0.8" />
      <ellipse cx="58" cy="66" rx="14" ry="18" fill={palette.fill} />
      <circle cx="72" cy="58" r="9" fill={palette.fill} opacity="0.95" />
      <circle cx="74" cy="56" r="2" fill={palette.accent} opacity="0.35" />
    </>
  )
}

function MiddleIllustration({ palette }: { palette: (typeof STAGE_PALETTE)['middle'] }) {
  return (
    <>
      <ellipse cx="60" cy="64" rx="38" ry="34" fill={palette.glow} opacity="0.75" />
      <ellipse cx="56" cy="68" rx="18" ry="22" fill={palette.fill} />
      <circle cx="74" cy="54" r="11" fill={palette.fill} />
      <path
        d="M44 72 Q56 78 68 74"
        stroke={palette.accent}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
    </>
  )
}

function GrowthIllustration({ palette }: { palette: (typeof STAGE_PALETTE)['growth'] }) {
  return (
    <>
      <ellipse cx="60" cy="64" rx="40" ry="34" fill={palette.glow} opacity="0.75" />
      <ellipse cx="54" cy="70" rx="22" ry="24" fill={palette.fill} />
      <circle cx="76" cy="50" r="13" fill={palette.fill} />
      <path d="M30 52 Q24 44 28 36" stroke={palette.accent} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M90 52 Q96 44 92 36" stroke={palette.accent} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
    </>
  )
}

function LateIllustration({ palette }: { palette: (typeof STAGE_PALETTE)['late'] }) {
  return (
    <>
      <ellipse cx="60" cy="64" rx="42" ry="34" fill={palette.glow} opacity="0.7" />
      <ellipse cx="52" cy="70" rx="24" ry="26" fill={palette.fill} />
      <circle cx="78" cy="48" r="14" fill={palette.fill} />
      <path
        d="M38 78 Q60 86 82 78"
        stroke={palette.accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
    </>
  )
}

function ReadyIllustration({ palette }: { palette: (typeof STAGE_PALETTE)['ready'] }) {
  return (
    <>
      <ellipse cx="60" cy="64" rx="42" ry="34" fill={palette.glow} opacity="0.75" />
      <ellipse cx="50" cy="70" rx="26" ry="28" fill={palette.fill} />
      <circle cx="80" cy="46" r="15" fill={palette.fill} />
      <path
        d="M60 24 C58 18 64 14 68 18 C72 14 78 18 76 24 C80 26 80 32 76 34 C78 40 72 44 68 40 C64 44 58 40 60 34 C56 32 56 26 60 24Z"
        fill={palette.accent}
        opacity="0.55"
      />
    </>
  )
}

export default function BabyStageIllustration({ stage, className = '' }: BabyStageIllustrationProps) {
  const palette = STAGE_PALETTE[stage]

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-2 rounded-full opacity-80"
        style={{ background: `radial-gradient(circle at 50% 45%, ${palette.glow}, ${palette.bg})` }}
      />
      <svg viewBox="0 0 120 120" className="relative h-full w-full" role="presentation">
        {stage === 'seed' && <SeedIllustration palette={palette} />}
        {stage === 'early' && <EarlyIllustration palette={palette} />}
        {stage === 'middle' && <MiddleIllustration palette={palette} />}
        {stage === 'growth' && <GrowthIllustration palette={palette} />}
        {stage === 'late' && <LateIllustration palette={palette} />}
        {stage === 'ready' && <ReadyIllustration palette={palette} />}
      </svg>
    </div>
  )
}

export function getStageCardTheme(stage: BabyStage) {
  const palette = STAGE_PALETTE[stage]
  return {
    background: `linear-gradient(135deg, ${palette.bg} 0%, #ffffff 55%, ${palette.glow} 100%)`,
    border: palette.glow,
    accent: palette.accent,
  }
}
