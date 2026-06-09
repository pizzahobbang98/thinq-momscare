'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, DEMO_WIFE_ID, type Message, type UltrasoundRecord } from '@/lib/supabase'
import { withAya, withIga } from '@/lib/korean'
import { calculateCurrentWeeksFromDueDate } from '@/lib/pregnancy'
import { controlAirPurifier } from '@/lib/thinq-mock'
import AppointmentCalendar from '@/components/AppointmentCalendar'
import Spinner from '@/components/Spinner'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'

type NextAppt = {
  id: string
  title: string
  hospital: string | null
  appointment_date: string
}

function getTodayLabel() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function getTodayStartISO() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

function getTodayDateOnly() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMessageDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDaysUntilAppointment(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const apptDate = new Date(dateStr)
  apptDate.setHours(0, 0, 0, 0)
  return Math.ceil((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

type WifeTab = 'quick' | 'record' | 'care' | 'features'

type ExpandedCard =
  | 'mission'
  | 'care-pending'
  | 'message'
  | 'mood'
  | 'folic-acid'
  | 'kick'
  | 'nausea'
  | 'diary-input'
  | 'ai-diary'
  | 'ultrasound'
  | 'gallery'
  | 'appointment'
  | 'report'
  | 'heatmap'
  | 'chart'
  | 'kick-analysis'

type WifeFeatureCard =
  | 'morning-briefing'
  | 'condition-summary'
  | 'ai-prepared'
  | 'run-history'

const EXPANDED_CARD_TITLES: Record<ExpandedCard, string> = {
  mission: '오늘의 조언',
  'care-pending': '오늘의 조언',
  message: '남편 메시지',
  mood: '오늘 기분',
  'folic-acid': '임신 준비 중',
  kick: '태동 카운터',
  nausea: '입덧/수면 모드',
  'diary-input': '오늘 몸 상태 기록',
  'ai-diary': '오늘의 일기',
  ultrasound: '초음파 사진 분석',
  gallery: '초음파 갤러리',
  appointment: '병원 일정',
  report: '주간 리포트',
  heatmap: '태동 히트맵',
  chart: '이번 주 몸 상태',
  'kick-analysis': '태동 패턴 분석',
}

const WIFE_FEATURE_CARD_TITLES: Record<WifeFeatureCard, string> = {
  'morning-briefing': '오늘의 굿모닝 브리핑',
  'condition-summary': '최근 1주일 컨디션 요약',
  'ai-prepared': '오늘 AI가 준비한 것',
  'run-history': '실행 히스토리',
}

function CardTitleRow({
  title,
  cardId,
  onExpand,
  className = 'mb-4',
}: {
  title: string
  cardId: ExpandedCard
  onExpand: (id: ExpandedCard) => void
  className?: string
}) {
  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onExpand(cardId)
        }}
        className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
        aria-label="확대"
      >
        ⛶
      </button>
    </div>
  )
}

function FeatureTitleRow({
  title,
  cardId,
  onExpand,
}: {
  title: string
  cardId: WifeFeatureCard
  onExpand: (id: WifeFeatureCard) => void
}) {
  return (
    <div className="flex items-start gap-2">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onExpand(cardId)
        }}
        className="ml-auto text-sm text-gray-400 transition hover:text-gray-600"
        aria-label="확대"
      >
        ⛶
      </button>
    </div>
  )
}

type ModalType = 'mission' | 'message' | 'report' | 'kick' | 'carePending' | null

type TodayMood = {
  mood: string
  emoji: string
}

type ConditionMood = TodayMood & {
  created_at: string
}

const MOOD_OPTIONS: TodayMood[] = [
  { mood: '좋음', emoji: '😊' },
  { mood: '보통', emoji: '😌' },
  { mood: '우울', emoji: '😔' },
  { mood: '힘듦', emoji: '😣' },
  { mood: '아픔', emoji: '🤒' },
]

type DailyCard = {
  title: string
  content: string
}

type MorningBriefingCard = {
  title: string
  content: string
  created_at?: string
}

type ConditionSummary = {
  nauseaCount: number
  fatigueCount: number
  sleepCount: number
  averageSeverity: number
  totalLogs: number
  insights: string[]
}

type ModeRunDeviceResult = {
  device: string
  action: string
  label: string
  status: 'actual' | 'mock' | 'planned'
  thinqCommand?: string
}

type ModeRun = {
  id: string
  mode: string
  mode_label: string
  created_at: string
  wife_card: string | null
  reply?: string | null
  device_results: ModeRunDeviceResult[] | null
}

type MorningBriefingResponse = {
  success?: boolean
  wifeBriefing?: string
  husbandBriefing?: string
  audioBase64?: string
  recommendedModes?: string[]
  error?: string
}

type PregnancyStatus = 'pregnant' | 'preparing'

const PREPARING_CARE_DEFAULT: DailyCard = {
  title: '🌱 임신 준비 오늘의 조언',
  content:
    '규칙적인 엽산 섭취와 충분한 수면이 임신 준비의 첫걸음이에요. 오늘도 몸과 마음을 편히 챙겨주세요.',
}

function getPregnancyStatus(statusParam: string | null): PregnancyStatus {
  return statusParam === 'preparing' ? 'preparing' : 'pregnant'
}

function getDisplayCareCard(
  card: DailyCard | null,
  isPreparing: boolean,
  pregnancyWeeks: number | null,
): DailyCard | null {
  if (!card) return null
  if (isPreparing) {
    return {
      title: PREPARING_CARE_DEFAULT.title,
      content: card.content,
    }
  }

  const title =
    pregnancyWeeks && /\d+주차/.test(card.title)
      ? card.title.replace(/\d+주차/, `${pregnancyWeeks}주차`)
      : card.title

  return { ...card, title }
}

type AnalyzeResponse = {
  parsed_category: string
  severity: number
  advice: string
  error?: string
}

type DiaryResponse = {
  diary: string
  error?: string
}

type WeeklyReport = {
  summary: string
  symptoms: string
  device_usage: string
  recommendation: string
  encouragement: string
}

type ReportResponse = {
  report?: WeeklyReport
  error?: string
}

type KickStatus = 'normal' | 'low' | 'high'

type KickAnalysis = {
  today_count: number
  daily_average: number
  most_active_time: string
  pattern_comment: string
  status: KickStatus
  advice: string
}

type KickAnalysisResponse = {
  analysis?: KickAnalysis
  error?: string
}

type UltrasoundResult = {
  crl: string | null
  bpd: string | null
  fl: string | null
  estimated_size_cm: number
  estimated_weeks: number
  fruit_emoji: string
  fruit_name: string
  description: string
  size_basis: string
}

type UltrasoundResponse = {
  result?: UltrasoundResult
  error?: string
}

const MAX_ULTRASOUND_SIZE = 10 * 1024 * 1024

function formatGalleryDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  })
}

const KICK_STATUS_COLORS: Record<KickStatus, string> = {
  normal: 'text-green-500',
  low: 'text-yellow-500',
  high: 'text-blue-500',
}

const KICK_STATUS_LABELS: Record<KickStatus, string> = {
  normal: '정상',
  low: '적음',
  high: '많음',
}

type KickTimeSlot = 'dawn' | 'morning' | 'afternoon' | 'evening'

const KICK_TIME_SLOTS: KickTimeSlot[] = ['dawn', 'morning', 'afternoon', 'evening']

const KICK_TIME_SLOT_LABELS: Record<KickTimeSlot, string> = {
  dawn: '새벽',
  morning: '아침',
  afternoon: '오후',
  evening: '저녁',
}

type KickHeatmapData = {
  grid: number[][]
  totalCount: number
  mostActiveSlot: { label: string; count: number } | null
  mostActiveDay: { label: string; count: number } | null
}

function getKSTDateKey(date: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getKSTHour(iso: string) {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      hour: 'numeric',
      hour12: false,
    }).format(new Date(iso)),
  )
}

function getKickTimeSlot(hour: number): KickTimeSlot {
  if (hour >= 0 && hour < 6) return 'dawn'
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

function getDaysAgoFromKSTDate(dateKey: string, todayKey: string) {
  const [y1, m1, d1] = dateKey.split('-').map(Number)
  const [y2, m2, d2] = todayKey.split('-').map(Number)
  const dateMs = Date.UTC(y1, m1 - 1, d1)
  const todayMs = Date.UTC(y2, m2 - 1, d2)
  return Math.round((todayMs - dateMs) / (1000 * 60 * 60 * 24))
}

function getKSTStartOfDaysAgo(daysAgo: number) {
  const todayKey = getKSTDateKey()
  const [y, m, d] = todayKey.split('-').map(Number)
  const kstMidnightUtc = Date.UTC(y, m - 1, d - daysAgo) - 9 * 60 * 60 * 1000
  return new Date(kstMidnightUtc).toISOString()
}

function getKickHeatmapDayLabel(daysAgo: number) {
  if (daysAgo === 0) return '오늘'
  if (daysAgo === 1) return '어제'
  return `${daysAgo}일전`
}

function getKickHeatmapActiveDayLabel(daysAgo: number) {
  if (daysAgo === 0) return '오늘'
  return `${daysAgo}일 전`
}

function getKickHeatmapCellClass(count: number) {
  if (count === 0) return 'bg-gray-100'
  if (count === 1) return 'bg-rose-100'
  if (count === 2) return 'bg-rose-200'
  if (count === 3) return 'bg-rose-300'
  return 'bg-rose-500'
}

function buildKickHeatmap(logs: { created_at: string }[]): KickHeatmapData {
  const todayKey = getKSTDateKey()
  const grid = Array.from({ length: 7 }, () => [0, 0, 0, 0])

  for (const log of logs) {
    const dateKey = getKSTDateKey(new Date(log.created_at))
    const daysAgo = getDaysAgoFromKSTDate(dateKey, todayKey)
    if (daysAgo < 0 || daysAgo > 6) continue

    const slot = getKickTimeSlot(getKSTHour(log.created_at))
    const slotIndex = KICK_TIME_SLOTS.indexOf(slot)
    grid[daysAgo][slotIndex] += 1
  }

  const slotTotals = KICK_TIME_SLOTS.map((slot, index) => ({
    label: KICK_TIME_SLOT_LABELS[slot],
    count: grid.reduce((sum, row) => sum + row[index], 0),
  }))
  const maxSlotTotal = Math.max(...slotTotals.map((s) => s.count))
  const mostActiveSlot =
    maxSlotTotal > 0
      ? slotTotals.reduce((best, current) => (current.count > best.count ? current : best))
      : null

  const dayTotals = grid.map((row, daysAgo) => ({
    label: getKickHeatmapActiveDayLabel(daysAgo),
    count: row.reduce((sum, count) => sum + count, 0),
  }))
  const maxDayTotal = Math.max(...dayTotals.map((d) => d.count))
  const mostActiveDay =
    maxDayTotal > 0
      ? dayTotals.reduce((best, current) => (current.count > best.count ? current : best))
      : null

  const totalCount = grid.reduce((sum, row) => sum + row.reduce((rowSum, count) => rowSum + count, 0), 0)

  return { grid, totalCount, mostActiveSlot, mostActiveDay }
}

type SymptomLogTrend = {
  parsed_category: string
  symptom_text?: string
  severity: number | null
  created_at: string
}

type SymptomTrendDay = {
  daysAgo: number
  label: string
  avg: number | null
}

type SymptomCategoryCount = {
  category: string
  label: string
  count: number
  color: string
}

type SymptomTrendData = {
  dailySeverity: SymptomTrendDay[]
  categoryCounts: SymptomCategoryCount[]
  mostCommonSymptom: { label: string; count: number } | null
  hardestDay: { label: string; avgSeverity: number } | null
  weeklyCondition: '좋음' | '보통' | '힘듦'
  totalLogs: number
}

const SYMPTOM_CATEGORY_LABELS: Record<string, string> = {
  NAUSEA: '입덧',
  BACK_PAIN: '허리통증',
  SLEEP: '수면문제',
  FATIGUE: '피로감',
  HEADACHE: '두통',
  EMOTIONAL: '감정/스트레스',
  DIARY: '일반기록',
  OTHER: '기타',
}

const SYMPTOM_CATEGORY_EMOJIS: Record<string, string> = {
  NAUSEA: '🍋',
  BACK_PAIN: '💆',
  SLEEP: '😴',
  FATIGUE: '😓',
  HEADACHE: '🤕',
  EMOTIONAL: '💗',
  DIARY: '📝',
  OTHER: '📋',
}

const SYMPTOM_CATEGORY_COLORS: Record<string, string> = {
  NAUSEA: '#f472b6',
  BACK_PAIN: '#c084fc',
  SLEEP: '#60a5fa',
  FATIGUE: '#fb923c',
  HEADACHE: '#a78bfa',
  EMOTIONAL: '#f9a8d4',
  DIARY: '#9ca3af',
  OTHER: '#d1d5db',
}

const DEFAULT_SYMPTOM_CATEGORY_COLOR = '#d1d5db'

const SEVERITY_CONDITION_LABELS: Record<number, string> = {
  1: '😊 좋음',
  2: '🙂 괜찮음',
  3: '😌 보통',
  4: '😔 조금 힘듦',
  5: '😣 힘듦',
}

const WEEKLY_CONDITION_MESSAGES: Record<SymptomTrendData['weeklyCondition'], string> = {
  좋음: '이번 주 전반적으로 컨디션이 좋았어요 🌸',
  보통: '이번 주 평균적인 한 주였어요. 잘 버텼어요 💪',
  힘듦: '이번 주 많이 힘들었죠? 정말 수고했어요 🫶',
}

function getSymptomTrendDayLabel(daysAgo: number) {
  if (daysAgo === 0) return '오늘'
  if (daysAgo === 1) return '어제'
  return `${daysAgo}일전`
}

function getSymptomTrendActiveDayLabel(daysAgo: number) {
  if (daysAgo === 0) return '오늘'
  return `${daysAgo}일 전`
}

function getSeverityLineColor(avg: number) {
  if (avg <= 2) return '#4ade80'
  if (avg <= 3) return '#facc15'
  return '#f87171'
}

function getWeeklyCondition(avgSeverity: number): '좋음' | '보통' | '힘듦' {
  if (avgSeverity <= 2) return '좋음'
  if (avgSeverity <= 3) return '보통'
  return '힘듦'
}

function getOtherCategoryLabel(symptomText?: string) {
  const snippet = (symptomText ?? '').trim().slice(0, 10)
  return snippet || SYMPTOM_CATEGORY_LABELS.OTHER
}

function getSymptomCategoryLabel(category: string, symptomText?: string) {
  if (category.startsWith('OTHER:')) {
    return category.slice(6)
  }
  if (category === 'OTHER') {
    return getOtherCategoryLabel(symptomText)
  }
  return SYMPTOM_CATEGORY_LABELS[category] ?? getOtherCategoryLabel(symptomText)
}

function getSymptomCategoryEmoji(category: string) {
  const baseCategory = category.startsWith('OTHER:') ? 'OTHER' : category
  return SYMPTOM_CATEGORY_EMOJIS[baseCategory] ?? SYMPTOM_CATEGORY_EMOJIS.OTHER
}

function getSymptomCategoryColor(category: string) {
  const baseCategory = category.startsWith('OTHER:') ? 'OTHER' : category
  return SYMPTOM_CATEGORY_COLORS[baseCategory] ?? DEFAULT_SYMPTOM_CATEGORY_COLOR
}

function getSeverityConditionLabel(avg: number) {
  const rounded = Math.min(5, Math.max(1, Math.round(avg)))
  return SEVERITY_CONDITION_LABELS[rounded]
}

function buildSymptomTrend(logs: SymptomLogTrend[]): SymptomTrendData {
  const todayKey = getKSTDateKey()
  const dailyBuckets = Array.from({ length: 7 }, (_, index) => ({
    daysAgo: 6 - index,
    label: getSymptomTrendDayLabel(6 - index),
    severities: [] as number[],
  }))
  const categoryMap = new Map<string, number>()

  for (const log of logs) {
    const dateKey = getKSTDateKey(new Date(log.created_at))
    const daysAgo = getDaysAgoFromKSTDate(dateKey, todayKey)
    if (daysAgo < 0 || daysAgo > 6) continue

    const severity = log.severity ?? 1
    dailyBuckets[6 - daysAgo].severities.push(severity)

    const category = log.parsed_category || 'OTHER'
    const categoryKey =
      category === 'OTHER'
        ? `OTHER:${getOtherCategoryLabel(log.symptom_text)}`
        : category
    categoryMap.set(categoryKey, (categoryMap.get(categoryKey) ?? 0) + 1)
  }

  const dailySeverity = dailyBuckets.map((bucket) => ({
    daysAgo: bucket.daysAgo,
    label: bucket.label,
    avg:
      bucket.severities.length > 0
        ? bucket.severities.reduce((sum, value) => sum + value, 0) / bucket.severities.length
        : null,
  }))

  const categoryCounts = Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      label: getSymptomCategoryLabel(category),
      count,
      color: getSymptomCategoryColor(category),
    }))
    .sort((a, b) => b.count - a.count)

  const daysWithData = dailySeverity.filter((day) => day.avg !== null)
  const hardestDay =
    daysWithData.length > 0
      ? daysWithData.reduce((best, current) =>
          (current.avg ?? 0) > (best.avg ?? 0) ? current : best,
        )
      : null

  const allSeverities = logs
    .map((log) => log.severity ?? 1)
    .filter((severity) => severity >= 1 && severity <= 5)
  const weeklyAvg =
    allSeverities.length > 0
      ? allSeverities.reduce((sum, value) => sum + value, 0) / allSeverities.length
      : 0

  return {
    dailySeverity,
    categoryCounts,
    mostCommonSymptom: categoryCounts[0] ?? null,
    hardestDay: hardestDay
      ? {
          label: getSymptomTrendActiveDayLabel(hardestDay.daysAgo),
          avgSeverity: Math.round((hardestDay.avg ?? 0) * 10) / 10,
        }
      : null,
    weeklyCondition: allSeverities.length > 0 ? getWeeklyCondition(weeklyAvg) : '보통',
    totalLogs: logs.length,
  }
}

function SymptomSeverityLineChart({ dailySeverity }: { dailySeverity: SymptomTrendDay[] }) {
  const [hoveredDaysAgo, setHoveredDaysAgo] = useState<number | null>(null)
  const width = 300
  const height = 200
  const padLeft = 68
  const padRight = 12
  const padTop = 12
  const padBottom = 28
  const chartWidth = width - padLeft - padRight
  const chartHeight = height - padTop - padBottom

  const points = dailySeverity.map((day, index) => {
    const x = padLeft + (index / (dailySeverity.length - 1)) * chartWidth
    const y =
      day.avg !== null ? padTop + chartHeight - ((day.avg - 1) / 4) * chartHeight : null

    return { ...day, x, y }
  })

  const yTicks = [1, 2, 3, 4, 5]
  const hoveredPoint = points.find((point) => point.daysAgo === hoveredDaysAgo && point.y !== null)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      {yTicks.map((tick) => {
        const y = padTop + chartHeight - ((tick - 1) / 4) * chartHeight
        return (
          <g key={tick}>
            <line
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
            <text x={2} y={y + 3} fill="#9ca3af" fontSize={8}>
              {SEVERITY_CONDITION_LABELS[tick]}
            </text>
          </g>
        )
      })}

      {points.map((point, index) => {
        if (index === points.length - 1) return null
        const next = points[index + 1]
        const hasGap = point.y === null || next.y === null
        const y1 = point.y ?? padTop + chartHeight / 2
        const y2 = next.y ?? padTop + chartHeight / 2
        const segmentAvg =
          point.avg !== null && next.avg !== null
            ? (point.avg + next.avg) / 2
            : point.avg ?? next.avg ?? 3

        return (
          <line
            key={`segment-${point.daysAgo}`}
            x1={point.x}
            y1={y1}
            x2={next.x}
            y2={y2}
            stroke={hasGap ? '#d1d5db' : getSeverityLineColor(segmentAvg)}
            strokeWidth={2}
            strokeDasharray={hasGap ? '4 4' : undefined}
            strokeLinecap="round"
          />
        )
      })}

      {points.map((point) =>
        point.y !== null ? (
          <g key={`point-${point.daysAgo}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={10}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredDaysAgo(point.daysAgo)}
              onMouseLeave={() => setHoveredDaysAgo(null)}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredDaysAgo === point.daysAgo ? 5 : 4}
              fill={getSeverityLineColor(point.avg ?? 1)}
              stroke="#ffffff"
              strokeWidth={2}
              pointerEvents="none"
            />
          </g>
        ) : null,
      )}

      {hoveredPoint && hoveredPoint.y !== null && hoveredPoint.avg !== null && (
        <g pointerEvents="none">
          <rect
            x={hoveredPoint.x - 52}
            y={hoveredPoint.y - 36}
            width={104}
            height={28}
            rx={6}
            fill="#1f2937"
            opacity={0.92}
          />
          <text
            x={hoveredPoint.x}
            y={hoveredPoint.y - 24}
            fill="#ffffff"
            fontSize={9}
            textAnchor="middle"
          >
            {hoveredPoint.label}
          </text>
          <text
            x={hoveredPoint.x}
            y={hoveredPoint.y - 13}
            fill="#ffffff"
            fontSize={9}
            textAnchor="middle"
          >
            {getSeverityConditionLabel(hoveredPoint.avg)}
          </text>
        </g>
      )}

      {points.map((point) => (
        <text
          key={`label-${point.daysAgo}`}
          x={point.x}
          y={height - 6}
          fill="#9ca3af"
          fontSize={9}
          textAnchor="middle"
        >
          {point.label}
        </text>
      ))}
    </svg>
  )
}

export default function WifePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const babyName = searchParams.get('name')
  const urlWeeksParam = searchParams.get('weeks')
  const weeksFromUrl =
    urlWeeksParam && Number(urlWeeksParam) >= 1 && Number(urlWeeksParam) <= 42
      ? Number(urlWeeksParam)
      : null
  const [nauseaMessage, setNauseaMessage] = useState('')
  const [sleepMessage, setSleepMessage] = useState('')
  const [husbandMessage, setHusbandMessage] = useState<Message | null>(null)
  const [showSendMessageModal, setShowSendMessageModal] = useState(false)
  const [wifeMessageText, setWifeMessageText] = useState('')
  const [isWifeMessageLoading, setIsWifeMessageLoading] = useState(false)
  const [kickCount, setKickCount] = useState(0)
  const [diaryText, setDiaryText] = useState('')
  const [isNauseaLoading, setIsNauseaLoading] = useState(false)
  const [isSleepLoading, setIsSleepLoading] = useState(false)
  const [isKickLoading, setIsKickLoading] = useState(false)
  const [isDiaryLoading, setIsDiaryLoading] = useState(false)
  const [diaryAdvice, setDiaryAdvice] = useState<string | null>(null)
  const [aiDiary, setAiDiary] = useState('')
  const [isAiDiaryLoading, setIsAiDiaryLoading] = useState(false)
  const [dailyCareCard, setDailyCareCard] = useState<DailyCard | null>(null)
  const [weeksPregnant, setWeeksPregnant] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<WifeTab>('quick')
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null)
  const [isReportLoading, setIsReportLoading] = useState(false)
  const [kickAnalysis, setKickAnalysis] = useState<KickAnalysis | null>(null)
  const [kickAnalysisError, setKickAnalysisError] = useState<string | null>(null)
  const [isKickAnalysisLoading, setIsKickAnalysisLoading] = useState(false)
  const [kickHeatmapData, setKickHeatmapData] = useState<KickHeatmapData | null>(null)
  const [kickHeatmapError, setKickHeatmapError] = useState<string | null>(null)
  const [isKickHeatmapLoading, setIsKickHeatmapLoading] = useState(false)
  const [symptomTrendData, setSymptomTrendData] = useState<SymptomTrendData | null>(null)
  const [symptomTrendError, setSymptomTrendError] = useState<string | null>(null)
  const [isSymptomTrendLoading, setIsSymptomTrendLoading] = useState(false)
  const [showHeartOverlay, setShowHeartOverlay] = useState(false)
  const [heartOverlayVisible, setHeartOverlayVisible] = useState(false)
  const [todayMood, setTodayMood] = useState<TodayMood | null>(null)
  const [isMoodLoading, setIsMoodLoading] = useState(false)
  const [moodSavedMessage, setMoodSavedMessage] = useState(false)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [ultrasoundPreview, setUltrasoundPreview] = useState<string | null>(null)
  const [ultrasoundFile, setUltrasoundFile] = useState<File | null>(null)
  const [ultrasoundResult, setUltrasoundResult] = useState<UltrasoundResult | null>(null)
  const [ultrasoundError, setUltrasoundError] = useState<string | null>(null)
  const [isUltrasoundLoading, setIsUltrasoundLoading] = useState(false)
  const [isUltrasoundDragging, setIsUltrasoundDragging] = useState(false)
  const [galleryRecords, setGalleryRecords] = useState<UltrasoundRecord[]>([])
  const [galleryImageUrls, setGalleryImageUrls] = useState<Record<string, string>>({})
  const [isGalleryLoading, setIsGalleryLoading] = useState(false)
  const [selectedGalleryRecord, setSelectedGalleryRecord] = useState<UltrasoundRecord | null>(null)
  const [fullscreenGalleryImageUrl, setFullscreenGalleryImageUrl] = useState<string | null>(null)
  const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<ExpandedCard | null>(null)
  const [expandedFeatureCard, setExpandedFeatureCard] = useState<WifeFeatureCard | null>(null)
  const [nextAppt, setNextAppt] = useState<NextAppt | null>(null)
  const [showWifeCalendar, setShowWifeCalendar] = useState(false)
  const [isCardLoading, setIsCardLoading] = useState(false)
  const [isFolicAcidLoading, setIsFolicAcidLoading] = useState(false)
  const [folicAcidSaved, setFolicAcidSaved] = useState(false)
  const [morningBriefing, setMorningBriefing] = useState<MorningBriefingCard | null>(null)
  const [conditionSummary, setConditionSummary] = useState<ConditionSummary | null>(null)
  const [conditionLogs, setConditionLogs] = useState<SymptomLogTrend[]>([])
  const [conditionMoods, setConditionMoods] = useState<ConditionMood[]>([])
  const [modeRuns, setModeRuns] = useState<ModeRun[]>([])
  const [isBriefingLoading, setIsBriefingLoading] = useState(false)
  const [briefingAudio, setBriefingAudio] = useState('')
  const [expandedModeRunId, setExpandedModeRunId] = useState<string | null>(null)
  const adviceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ultrasoundInputRef = useRef<HTMLInputElement>(null)
  const ultrasoundPreviewRef = useRef<string | null>(null)
  const moodSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const momBriefingAudioRef = useRef<HTMLAudioElement | null>(null)
  const pregnancyWeeks = weeksPregnant ?? weeksFromUrl
  const apptDaysLeft = nextAppt ? getDaysUntilAppointment(nextAppt.appointment_date) : null
  const pregnancyStatus = getPregnancyStatus(searchParams.get('status'))
  const isPreparing = pregnancyStatus === 'preparing'
  const displayCareCard = getDisplayCareCard(dailyCareCard, isPreparing, pregnancyWeeks)
  const { toast, showToast } = useToast()

  function navigateToSelect() {
    const query = searchParams.toString()
    router.push(query ? `/select?${query}` : '/select')
  }

  function openSendMessageModal() {
    setWifeMessageText('')
    setShowSendMessageModal(true)
  }

  async function handleSendWifeMessage() {
    const content = wifeMessageText.trim()
    if (!content) return

    setIsWifeMessageLoading(true)

    try {
      const { error } = await supabase.from('messages').insert({
        from_role: 'wife',
        content,
      })

      if (error) throw error

      setShowSendMessageModal(false)
      setWifeMessageText('')
      showToast('메시지를 보냈어요 💌', 'success')
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      showToast('메시지 전송에 실패했어요', 'error')
    } finally {
      setIsWifeMessageLoading(false)
    }
  }

  async function fetchNextAppt() {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', DEMO_WIFE_ID)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .order('appointment_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('다음 병원 예약 조회 실패:', error)
      return
    }

    setNextAppt((data as NextAppt) ?? null)
  }

  useEffect(() => {
    fetchNextAppt()
  }, [])

  useEffect(() => {
    if (isPreparing && activeTab === 'features') {
      setActiveTab('quick')
    }
  }, [isPreparing, activeTab])

  useEffect(() => {
    return () => {
      if (adviceTimerRef.current) clearTimeout(adviceTimerRef.current)
      if (moodSavedTimerRef.current) clearTimeout(moodSavedTimerRef.current)
      momBriefingAudioRef.current?.pause()
      momBriefingAudioRef.current = null
      if (ultrasoundPreviewRef.current) {
        URL.revokeObjectURL(ultrasoundPreviewRef.current)
      }
    }
  }, [])

  useEffect(() => {
    async function fetchTodayMood() {
      const { data, error } = await supabase
        .from('moods')
        .select('mood, emoji')
        .eq('user_id', DEMO_WIFE_ID)
        .gte('created_at', getTodayStartISO())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('오늘 기분 조회 실패:', error)
        return
      }

      if (data) {
        setTodayMood(data as TodayMood)
      }
    }

    fetchTodayMood()
  }, [])

  function showDiaryAdvice(advice: string) {
    if (adviceTimerRef.current) clearTimeout(adviceTimerRef.current)
    setDiaryAdvice(advice)
    adviceTimerRef.current = setTimeout(() => setDiaryAdvice(null), 5000)
  }

  async function fetchDailyCareCard() {
    const { data, error } = await supabase
      .from('daily_cards')
      .select('title, content')
      .eq('card_date', getTodayDateString())
      .eq('target_role', 'wife')
      .or('card_type.is.null,card_type.neq.MORNING_BRIEFING')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('오늘의 케어 카드 조회 실패:', error)
      return null
    }

    if (data) {
      setDailyCareCard(data as DailyCard)
      return data as DailyCard
    }

    return null
  }

  useEffect(() => {
    void fetchDailyCareCard()
  }, [])

  async function fetchMorningBriefing() {
    const { data, error } = await supabase
      .from('daily_cards')
      .select('title, content, created_at')
      .eq('card_date', getTodayDateString())
      .eq('target_role', 'wife')
      .eq('card_type', 'MORNING_BRIEFING')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('굿모닝 브리핑 조회 실패:', error)
      return null
    }

    const card = (data as MorningBriefingCard | null) ?? null
    setMorningBriefing(card)
    return card
  }

  function buildMomConditionSummary(logs: SymptomLogTrend[], moods: TodayMood[]): ConditionSummary {
    const severities = logs
      .map((log) => log.severity ?? 1)
      .filter((severity) => severity >= 1 && severity <= 5)
    const nauseaCount = logs.filter((log) => log.parsed_category === 'NAUSEA').length
    const fatigueCount = logs.filter((log) => log.parsed_category === 'FATIGUE').length
    const sleepCount = logs.filter((log) => log.parsed_category === 'SLEEP').length
    const yesterdayStart = new Date(getTodayStartISO())
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const yesterdayLogs = logs.filter((log) => {
      const createdAt = new Date(log.created_at)
      return createdAt >= yesterdayStart && createdAt < new Date(getTodayStartISO())
    })
    const insights: string[] = []

    if (logs.length === 0 && moods.length === 0) {
      insights.push('아직 기록이 없어요. 오늘부터 시작해봐요 🌱')
    } else {
      if (fatigueCount > 0) insights.push('최근 일주일 동안 피로 신호가 조금 높았어요.')
      if (sleepCount > 0) insights.push('수면과 휴식이 필요한 흐름이 보여요.')
      if (nauseaCount > 0 || yesterdayLogs.some((log) => /냄새|입덧|울렁|메스꺼/.test(log.symptom_text ?? ''))) {
        insights.push('어제는 냄새 민감 기록이 있었어요.')
      }
      if (moods.some((mood) => mood.emoji === '😣' || mood.emoji === '🤒')) {
        insights.push('최근 컨디션이 무거운 날이 있었어요. 오늘은 천천히 시작해도 좋아요.')
      }
      if (insights.length === 0) {
        insights.push('최근 일주일은 큰 부담 신호 없이 차분하게 이어지고 있어요.')
      }
    }

    return {
      nauseaCount,
      fatigueCount,
      sleepCount,
      averageSeverity:
        severities.length > 0
          ? Math.round((severities.reduce((sum, value) => sum + value, 0) / severities.length) * 10) / 10
          : 0,
      totalLogs: logs.length,
      insights: insights.slice(0, 3),
    }
  }

  async function fetchMomConditionSummary() {
    const [symptomResult, moodResult] = await Promise.all([
      supabase
        .from('symptom_logs')
        .select('parsed_category, symptom_text, severity, created_at')
        .eq('user_id', DEMO_WIFE_ID)
        .gte('created_at', getKSTStartOfDaysAgo(6)),
      supabase
        .from('moods')
        .select('mood, emoji, created_at')
        .eq('user_id', DEMO_WIFE_ID)
        .gte('created_at', getKSTStartOfDaysAgo(6)),
    ])

    if (symptomResult.error || moodResult.error) {
      console.warn('엄마품 컨디션 요약 조회 실패:', symptomResult.error ?? moodResult.error)
      return
    }

    const logs = (symptomResult.data as SymptomLogTrend[]) ?? []
    const moods = (moodResult.data as ConditionMood[]) ?? []
    setConditionLogs(logs)
    setConditionMoods(moods)
    setConditionSummary(buildMomConditionSummary(logs, moods))
  }

  async function fetchMomModeRuns() {
    const { data, error } = await supabase
      .from('mode_runs')
      .select('id, mode, mode_label, created_at, wife_card, reply, device_results')
      .eq('user_id', DEMO_WIFE_ID)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.warn('엄마품 mode_runs 조회 실패:', error)
      return
    }

    setModeRuns((data as ModeRun[]) ?? [])
  }

  async function playMomBriefingAudio(base64: string) {
    try {
      momBriefingAudioRef.current?.pause()
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`)
      momBriefingAudioRef.current = audio
      audio.onended = () => {
        momBriefingAudioRef.current = null
      }
      audio.onerror = () => {
        momBriefingAudioRef.current = null
      }
      await audio.play()
    } catch (error) {
      console.error('브리핑 다시 듣기 실패:', error)
      showToast('브리핑 재생에 실패했어요', 'error')
    }
  }

  async function handleReplayMorningBriefing() {
    if (briefingAudio) {
      await playMomBriefingAudio(briefingAudio)
      return
    }

    await handleFetchMorningBriefing({ playAudio: true })
  }

  async function handleFetchMorningBriefing(options: { playAudio?: boolean } = {}) {
    setIsBriefingLoading(true)

    try {
      const response = await fetch('/api/briefing/morning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregnancyWeek: pregnancyWeeks ?? undefined }),
      })
      const data = (await response.json()) as MorningBriefingResponse

      if (!response.ok || !data.success || !data.wifeBriefing) {
        throw new Error(data.error ?? '굿모닝 브리핑 생성 실패')
      }

      setMorningBriefing({
        title: '오늘의 굿모닝 브리핑',
        content: data.wifeBriefing,
      })

      if (data.audioBase64) {
        setBriefingAudio(data.audioBase64)
        if (options.playAudio) {
          await playMomBriefingAudio(data.audioBase64)
        }
      }

      void fetchMomModeRuns()
      showToast('굿모닝 브리핑을 준비했어요', 'success')
    } catch (error) {
      console.error('굿모닝 브리핑 생성 실패:', error)
      showToast('굿모닝 브리핑을 준비하지 못했어요', 'error')
    } finally {
      setIsBriefingLoading(false)
    }
  }

  useEffect(() => {
    if (isPreparing) return

    void fetchMorningBriefing()
    void fetchMomConditionSummary()
    void fetchMomModeRuns()

    const channel = supabase
      .channel(`wife-mode-runs-${crypto.randomUUID?.() ?? Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mode_runs',
          filter: `user_id=eq.${DEMO_WIFE_ID}`,
        },
        () => {
          void fetchMomModeRuns()
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('mode_runs Realtime 구독 대기 중: wife-mode-runs', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isPreparing])

  async function fetchGalleryRecords() {
    setIsGalleryLoading(true)

    try {
      const { data, error } = await supabase
        .from('ultrasound_records')
        .select('*')
        .eq('user_id', DEMO_WIFE_ID)
        .order('created_at', { ascending: false })

      if (error) throw error

      const records = (data ?? []) as UltrasoundRecord[]
      setGalleryRecords(records)

      const urlEntries = await Promise.all(
        records.map(async (record) => {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('ultrasound-images')
            .createSignedUrl(record.image_path, 3600)

          if (urlError || !urlData?.signedUrl) {
            console.error('갤러리 이미지 URL 생성 실패:', urlError)
            return null
          }

          return [record.id, urlData.signedUrl] as const
        }),
      )

      setGalleryImageUrls(
        Object.fromEntries(urlEntries.filter((entry): entry is [string, string] => entry !== null)),
      )
    } catch (error) {
      console.error('초음파 갤러리 조회 실패:', error)
    } finally {
      setIsGalleryLoading(false)
    }
  }

  useEffect(() => {
    void fetchGalleryRecords()
  }, [])

  useEffect(() => {
    async function fetchPregnancyWeeks() {
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('due_date')
          .eq('role', 'wife')
          .maybeSingle()

        if (error) {
          console.error('임신 주차 조회 실패:', error)
          setWeeksPregnant(weeksFromUrl ?? (Number(urlWeeksParam) || 0))
          return
        }

        if (userData?.due_date) {
          setWeeksPregnant(calculateCurrentWeeksFromDueDate(userData.due_date))
        } else {
          setWeeksPregnant(weeksFromUrl ?? (Number(urlWeeksParam) || 0))
        }
      } catch (error) {
        console.error('임신 주차 조회 실패:', error)
        setWeeksPregnant(weeksFromUrl ?? (Number(urlWeeksParam) || 0))
      }
    }

    void fetchPregnancyWeeks()
  }, [weeksFromUrl, urlWeeksParam])

  useEffect(() => {
    async function fetchTodayKicks() {
      const { count, error } = await supabase
        .from('symptom_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', DEMO_WIFE_ID)
        .eq('parsed_category', 'KICK')
        .gte('created_at', getTodayStartISO())

      if (error) {
        console.error('태동 횟수 조회 실패:', error)
        return
      }

      setKickCount(count ?? 0)
    }

    fetchTodayKicks()
  }, [])

  useEffect(() => {
    async function fetchKickHeatmap() {
      setIsKickHeatmapLoading(true)
      setKickHeatmapError(null)

      try {
        const { data, error } = await supabase
          .from('symptom_logs')
          .select('created_at')
          .eq('user_id', DEMO_WIFE_ID)
          .eq('parsed_category', 'KICK')
          .gte('created_at', getKSTStartOfDaysAgo(6))

        if (error) throw error

        setKickHeatmapData(buildKickHeatmap((data as { created_at: string }[]) ?? []))
      } catch (error) {
        console.error('태동 히트맵 조회 실패:', error)
        setKickHeatmapError('태동 기록을 불러오지 못했어요')
        setKickHeatmapData(null)
      } finally {
        setIsKickHeatmapLoading(false)
      }
    }

    fetchKickHeatmap()
  }, [])

  useEffect(() => {
    async function fetchSymptomTrend() {
      setIsSymptomTrendLoading(true)
      setSymptomTrendError(null)

      try {
        const { data, error } = await supabase
          .from('symptom_logs')
          .select('parsed_category, symptom_text, severity, created_at')
          .eq('user_id', DEMO_WIFE_ID)
          .gte('created_at', getKSTStartOfDaysAgo(6))

        if (error) throw error

        setSymptomTrendData(buildSymptomTrend((data as SymptomLogTrend[]) ?? []))
      } catch (error) {
        console.error('증상 트렌드 조회 실패:', error)
        setSymptomTrendError('증상 기록을 불러오지 못했어요')
        setSymptomTrendData(null)
      } finally {
        setIsSymptomTrendLoading(false)
      }
    }

    fetchSymptomTrend()
  }, [])

  useEffect(() => {
    async function fetchHusbandMessage() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, from_role, content, created_at')
        .eq('from_role', 'husband')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('응원 메시지 조회 실패:', error)
        return
      }

      if (data) {
        setHusbandMessage(data as Message)
      }
    }

    fetchHusbandMessage()

    const channel = supabase
      .channel('wife-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'from_role=eq.husband',
        },
        (payload) => {
          setHusbandMessage(payload.new as Message)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'from_role=eq.wife',
        },
        (payload) => {
          console.log('아내 메시지 전송 확인:', payload.new)
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('메시지 Realtime 구독 대기 중: wife-messages', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('wife-hearts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hearts',
          filter: 'from_role=eq.husband',
        },
        () => {
          setShowHeartOverlay(true)
          setHeartOverlayVisible(false)

          requestAnimationFrame(() => {
            setHeartOverlayVisible(true)
          })

          if (heartOverlayTimerRef.current) clearTimeout(heartOverlayTimerRef.current)
          if (heartFadeTimerRef.current) clearTimeout(heartFadeTimerRef.current)

          heartOverlayTimerRef.current = setTimeout(() => {
            setHeartOverlayVisible(false)
            heartFadeTimerRef.current = setTimeout(() => {
              setShowHeartOverlay(false)
            }, 300)
          }, 3000)
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('하트 Realtime 구독 대기 중: wife-hearts', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (heartOverlayTimerRef.current) clearTimeout(heartOverlayTimerRef.current)
      if (heartFadeTimerRef.current) clearTimeout(heartFadeTimerRef.current)
    }
  }, [])

  async function handleFetchDailyCare() {
    setIsCardLoading(true)

    try {
      const response = await fetch('/api/cron/daily-care/test')

      if (!response.ok) {
        throw new Error('케어 카드 생성 실패')
      }

      const card = await fetchDailyCareCard()
      if (!card) {
        throw new Error('케어 카드 조회 실패')
      }

      setModalType(null)
    } catch (error) {
      console.error('케어 카드 받기 실패:', error)
      showToast('조언을 받지 못했어요', 'error')
    } finally {
      setIsCardLoading(false)
    }
  }

  async function handleMoodSelect(mood: string, emoji: string) {
    setIsMoodLoading(true)

    try {
      const { error } = await supabase.from('moods').insert({
        user_id: DEMO_WIFE_ID,
        mood,
        emoji,
      })

      if (error) throw error

      setTodayMood({ mood, emoji })
      setMoodSavedMessage(true)

      if (moodSavedTimerRef.current) clearTimeout(moodSavedTimerRef.current)
      moodSavedTimerRef.current = setTimeout(() => setMoodSavedMessage(false), 2000)
    } catch (error) {
      console.error('기분 기록 실패:', error)
      showToast('기분 기록에 실패했어요 🙏', 'error')
    } finally {
      setIsMoodLoading(false)
    }
  }

  async function handleNauseaMode() {
    setIsNauseaLoading(true)
    setNauseaMessage('')

    try {
      const { error: eventError } = await supabase.from('device_events').insert({
        user_id: DEMO_WIFE_ID,
        event_type: 'NAUSEA_MODE',
        triggered_by: 'APP',
        device_status: { power: 'ON', mode: 'TURBO' },
      })

      if (eventError) throw eventError

      await controlAirPurifier('NAUSEA_MODE')
      setNauseaMessage('공기청정기를 켰어요. 조금 나아지길 바라요 🍋')
      showToast('입덧 모드가 실행됐어요 🍋', 'success')
    } catch (error) {
      console.error('입덧 모드 활성화 실패:', error)
      showToast('입덧 모드 실행에 실패했어요', 'error')
    } finally {
      setIsNauseaLoading(false)
    }
  }

  async function handleSleepMode() {
    setIsSleepLoading(true)
    setSleepMessage('')

    try {
      await controlAirPurifier('SLEEP_MODE')

      const { error } = await supabase.from('device_events').insert({
        user_id: DEMO_WIFE_ID,
        event_type: 'SLEEP_MODE',
        triggered_by: 'APP',
        device_status: { power: 'ON', mode: 'SLEEP' },
      })

      if (error) throw error

      setSleepMessage('포근한 환경을 만들었어요. 푹 주무세요 😴')
    } catch (error) {
      console.error('수면 모드 활성화 실패:', error)
    } finally {
      setIsSleepLoading(false)
    }
  }

  async function handleFolicAcidCheck() {
    setIsFolicAcidLoading(true)

    try {
      const { error } = await supabase.from('symptom_logs').insert({
        user_id: DEMO_WIFE_ID,
        parsed_category: 'PREPARING',
        symptom_text: '엽산 복용',
      })

      if (error) throw error

      setFolicAcidSaved(true)
      showToast('엽산 복용이 기록됐어요 🌱', 'success')
    } catch (error) {
      console.error('엽산 복용 기록 실패:', error)
      showToast('기록에 실패했어요', 'error')
    } finally {
      setIsFolicAcidLoading(false)
    }
  }

  async function handleKick() {
    setIsKickLoading(true)

    try {
      const { error } = await supabase.from('symptom_logs').insert({
        user_id: DEMO_WIFE_ID,
        symptom_text: '태동',
        parsed_category: 'KICK',
      })

      if (error) throw error

      setKickCount((prev) => prev + 1)
      showToast('기록됐어요 🐣', 'success')
    } catch (error) {
      console.error('태동 기록 실패:', error)
      showToast('태동 기록에 실패했어요', 'error')
    } finally {
      setIsKickLoading(false)
    }
  }

  async function handleGenerateAiDiary() {
    setIsAiDiaryLoading(true)

    try {
      const response = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: getTodayStartISO() }),
      })

      const data = (await response.json()) as DiaryResponse

      if (!response.ok) {
        throw new Error(data.error ?? '일기 생성 실패')
      }

      setAiDiary(data.diary)
    } catch (error) {
      console.error('AI 일기 생성 실패:', error)
      showToast('일기 생성에 실패했어요', 'error')
    } finally {
      setIsAiDiaryLoading(false)
    }
  }

  async function handleDiarySave() {
    const text = diaryText.trim()
    if (!text) return

    setIsDiaryLoading(true)

    let parsed_category = 'DIARY'
    let severity = 1
    let advice: string | null = null

    try {
      try {
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        if (analyzeResponse.ok) {
          const data = (await analyzeResponse.json()) as AnalyzeResponse
          parsed_category = data.parsed_category ?? 'DIARY'
          severity = data.severity ?? 1
          advice = data.advice ?? null
        } else {
          const data = (await analyzeResponse.json()) as AnalyzeResponse
          console.error('증상 분석 실패:', data.error)
          showToast('AI가 확인하지 못했어요. 다시 시도해주세요', 'error')
        }
      } catch (error) {
        console.error('증상 분석 요청 실패:', error)
        showToast('AI가 확인하지 못했어요. 다시 시도해주세요', 'error')
      }

      const { error } = await supabase.from('symptom_logs').insert({
        user_id: DEMO_WIFE_ID,
        symptom_text: text,
        parsed_category,
        severity,
        advice,
      })

      if (error) throw error

      if (severity >= 2) {
        const { error: alertError } = await supabase.from('alerts').insert({
          from_role: 'wife',
          severity,
          message: text,
          is_read: false,
        })

        if (alertError) {
          console.error('긴급 알림 생성 실패:', alertError)
        }
      }

      setDiaryText('')
      if (advice) showDiaryAdvice(advice)
      showToast('오늘 한마디가 저장됐어요 ✨', 'success')
    } catch (error) {
      console.error('오늘 한마디 저장 실패:', error)
      showToast('증상 기록에 실패했어요 🙏', 'error')
    } finally {
      setIsDiaryLoading(false)
    }
  }

  function clearUltrasoundPreview() {
    if (ultrasoundPreviewRef.current) {
      URL.revokeObjectURL(ultrasoundPreviewRef.current)
      ultrasoundPreviewRef.current = null
    }
  }

  function handleUltrasoundFile(file: File) {
    setUltrasoundError(null)
    setUltrasoundResult(null)

    if (!file.type.startsWith('image/')) {
      setUltrasoundError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    if (file.size > MAX_ULTRASOUND_SIZE) {
      setUltrasoundError('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    clearUltrasoundPreview()
    const previewUrl = URL.createObjectURL(file)
    ultrasoundPreviewRef.current = previewUrl
    setUltrasoundPreview(previewUrl)
    setUltrasoundFile(file)
  }

  async function handleUltrasoundAnalyze() {
    if (!ultrasoundFile) {
      setUltrasoundError('분석할 사진을 먼저 업로드해 주세요.')
      return
    }

    setIsUltrasoundLoading(true)
    setUltrasoundError(null)
    setUltrasoundResult(null)

    try {
      const formData = new FormData()
      formData.append('image', ultrasoundFile)
      if (pregnancyWeeks && pregnancyWeeks > 0) {
        formData.append('weeks', String(pregnancyWeeks))
      }

      const response = await fetch('/api/ultrasound', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as UltrasoundResponse

      if (!response.ok || data.error || !data.result) {
        setUltrasoundError(data.error ?? '분석 실패')
        showToast('AI가 확인하지 못했어요. 다시 시도해주세요', 'error')
        return
      }

      setUltrasoundResult(data.result)
      await fetchGalleryRecords()
    } catch (error) {
      console.error('초음파 분석 실패:', error)
      setUltrasoundError('분석 실패')
      showToast('AI가 확인하지 못했어요. 다시 시도해주세요', 'error')
    } finally {
      setIsUltrasoundLoading(false)
    }
  }

  async function handleDeleteGalleryRecord(record: UltrasoundRecord) {
    setDeletingGalleryId(record.id)

    try {
      const { error: storageError } = await supabase.storage
        .from('ultrasound-images')
        .remove([record.image_path])

      if (storageError) throw storageError

      const { error: deleteError } = await supabase
        .from('ultrasound_records')
        .delete()
        .eq('id', record.id)

      if (deleteError) throw deleteError

      if (selectedGalleryRecord?.id === record.id) {
        setSelectedGalleryRecord(null)
        setFullscreenGalleryImageUrl(null)
      }

      await fetchGalleryRecords()
    } catch (error) {
      console.error('초음파 기록 삭제 실패:', error)
      showToast('삭제에 실패했어요', 'error')
    } finally {
      setDeletingGalleryId(null)
    }
  }

  async function handleGenerateReport() {
    setIsReportLoading(true)

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          pregnancyWeeks && pregnancyWeeks > 0 ? { weeks: pregnancyWeeks } : {},
        ),
      })

      const data = (await response.json()) as ReportResponse

      if (!response.ok) {
        throw new Error(data.error ?? '리포트 생성 실패')
      }

      if (data.report) {
        setWeeklyReport(data.report)
        setModalType('report')
      }
    } catch (error) {
      console.error('주간 리포트 생성 실패:', error)
    } finally {
      setIsReportLoading(false)
    }
  }

  async function handleKickAnalysis() {
    setIsKickAnalysisLoading(true)
    setKickAnalysisError(null)
    setKickAnalysis(null)

    try {
      const response = await fetch('/api/kick-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = (await response.json()) as KickAnalysisResponse

      if (!response.ok) {
        setKickAnalysisError(data.error ?? '태동 패턴 분석 실패')
        return
      }

      if (data.analysis) {
        setKickAnalysis(data.analysis)
        setModalType('kick')
      }
    } catch (error) {
      console.error('태동 패턴 분석 실패:', error)
      setKickAnalysisError('태동 패턴 분석 중 오류가 발생했습니다.')
    } finally {
      setIsKickAnalysisLoading(false)
    }
  }

  function renderGalleryGrid(large = false) {
    if (isGalleryLoading) {
      return (
        <div className="flex justify-center py-8">
          <Spinner text="갤러리 불러오는 중..." />
        </div>
      )
    }

    if (galleryRecords.length === 0) {
      return <p className="text-center text-sm text-gray-400">아직 초음파 기록이 없어요 🩺</p>
    }

    return (
      <div className={`grid gap-3 ${large ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
        {galleryRecords.map((record) => {
          const imageUrl = galleryImageUrls[record.id]
          return (
            <div
              key={record.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedGalleryRecord(record)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedGalleryRecord(record)
                }
              }}
              className="relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 transition hover:border-rose-200"
            >
              {record.weeks && (
                <span className="absolute left-2 top-2 z-10 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {record.weeks}주차
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDeleteGalleryRecord(record)
                }}
                disabled={deletingGalleryId === record.id}
                className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white transition hover:bg-black/70 disabled:opacity-60"
                aria-label="삭제"
              >
                ✕
              </button>
              <div className="aspect-square overflow-hidden bg-gray-100">
                {imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imageUrl}
                    alt={`${record.fruit_name} 초음파`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    이미지 없음
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className={`text-center ${large ? 'text-3xl' : 'text-2xl'}`}>{record.fruit_emoji}</p>
                <p className="mt-1 text-center text-xs text-gray-500">
                  {formatGalleryDate(record.created_at)}
                </p>
                <p className="mt-1 text-center text-xs font-medium text-gray-700">
                  {record.weeks ? `${record.weeks}주차 · ` : ''}
                  {record.fruit_name} 크기
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderUltrasoundUploadArea(large = false) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => ultrasoundInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              ultrasoundInputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setIsUltrasoundDragging(true)
          }}
          onDragLeave={() => setIsUltrasoundDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsUltrasoundDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) handleUltrasoundFile(file)
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
            large ? 'px-6 py-14' : 'px-4 py-8'
          } ${
            isUltrasoundDragging
              ? 'border-rose-400 bg-rose-50'
              : 'border-gray-200 bg-gray-50 hover:border-rose-300 hover:bg-rose-50/50'
          }`}
        >
          <p className={`font-medium text-gray-600 ${large ? 'text-base' : 'text-sm'}`}>
            사진을 여기에 올려주세요 🩺
          </p>
          <p className="mt-2 text-xs text-gray-400">클릭 또는 드래그 · 10MB 이하</p>
        </div>

        {ultrasoundPreview && (
          <div className="mt-4 flex justify-center rounded-2xl bg-gray-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ultrasoundPreview}
              alt="초음파 미리보기"
              className={`object-contain ${large ? 'max-h-72' : 'max-h-40'}`}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleUltrasoundAnalyze}
          disabled={isUltrasoundLoading || !ultrasoundFile}
          className={`mt-4 w-full rounded-2xl bg-rose-500 font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60 ${
            large ? 'py-5 text-lg' : 'py-4 text-base'
          }`}
        >
          {isUltrasoundLoading ? <Spinner text="사진을 살펴보는 중이에요..." /> : '분석 시작하기'}
        </button>

        {ultrasoundError && (
          <p className="mt-3 text-center text-sm text-red-500">{ultrasoundError}</p>
        )}

        {ultrasoundResult && (
          <div className={`mt-4 rounded-2xl bg-rose-50 ${large ? 'p-7' : 'p-5'}`}>
            <p className={`animate-bounce-once text-center ${large ? 'text-7xl' : 'text-6xl'}`}>
              {ultrasoundResult.fruit_emoji}
            </p>
            <p className={`mt-3 text-center font-bold text-gray-900 ${large ? 'text-2xl' : 'text-xl'}`}>
              {ultrasoundResult.fruit_name} 크기예요!
            </p>
            <p className={`mt-2 text-center text-gray-600 ${large ? 'text-base' : 'text-sm'}`}>
              약 {ultrasoundResult.estimated_size_cm}cm · 추정 {ultrasoundResult.estimated_weeks}주차
            </p>
            <p className="mt-1 text-center text-xs text-gray-500">🩺 {ultrasoundResult.size_basis}</p>
            <p className={`mt-4 text-center leading-relaxed text-gray-700 ${large ? 'text-base' : 'text-sm'}`}>
              {ultrasoundResult.description}
            </p>
          </div>
        )}
      </>
    )
  }

  function getMomModeEmoji(mode: string) {
    const emojis: Record<string, string> = {
      NAUSEA_MODE: '🍋',
      SLEEP_MODE: '😴',
      HOUSEWORK_MODE: '🧺',
      TRAVEL_MODE: '🚗',
      MORNING_BRIEFING: '✨',
    }
    return emojis[mode] ?? '✨'
  }

  function getConditionPercent(value: number, max = 5) {
    return Math.min(100, Math.round((value / max) * 100))
  }

  function getConditionColorClass(value: number) {
    if (value <= 1) return 'bg-green-400'
    if (value <= 3) return 'bg-yellow-400'
    return 'bg-rose-400'
  }

  function renderConditionMetric(label: string, value: number, helper: string, max = 5) {
    const width = getConditionPercent(value, max)
    return (
      <div className="rounded-xl bg-gray-50 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <span className="text-xs font-medium text-gray-500">{helper}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div
            className={`h-full rounded-full transition-all ${getConditionColorClass(value)}`}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    )
  }

  function getActualDeviceActions(run: ModeRun) {
    return (run.device_results ?? []).filter((action) => action.status === 'actual')
  }

  function renderMomModeRun(run: ModeRun, compact = false) {
    const actualActions = getActualDeviceActions(run)
    const isExpanded = expandedModeRunId === run.id
    return (
      <li key={run.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => compact && setExpandedModeRunId(isExpanded ? null : run.id)}
          className="min-h-[44px] w-full text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {getMomModeEmoji(run.mode)} {run.mode_label || run.mode}
              </p>
              <p className="mt-1 text-xs text-gray-400">{formatMessageDateTime(run.created_at)}</p>
            </div>
            {!compact && (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                실제 {actualActions.length}개
              </span>
            )}
          </div>
        </button>
        {!compact && run.wife_card && (
          <p className="mt-3 text-sm leading-relaxed text-gray-700">{run.wife_card}</p>
        )}
        {!compact && actualActions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {actualActions.map((action) => (
              <span
                key={`${run.id}-${action.device}-${action.action}`}
                className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
              >
                {action.label}
              </span>
            ))}
          </div>
        )}
        {compact && isExpanded && (
          <div className="mt-3 rounded-2xl bg-gray-50 p-4">
            <p className="text-sm leading-relaxed text-gray-700">{run.reply || run.wife_card || '실행 내용을 정리했어요.'}</p>
            {actualActions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {actualActions.map((action) => (
                  <span
                    key={`${run.id}-expanded-${action.device}-${action.action}`}
                    className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                  >
                    {action.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </li>
    )
  }

  function renderMomConditionInsights() {
    if (!conditionSummary) {
      return <p className="mt-3 text-sm text-gray-500">최근 컨디션 기록을 불러오는 중이에요</p>
    }

    return (
      <ul className="mt-4 space-y-2">
        {conditionSummary.insights.map((insight) => (
          <li key={insight} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
            {insight}
          </li>
        ))}
      </ul>
    )
  }

  function renderMomConditionDetails() {
    if (conditionLogs.length === 0 && conditionMoods.length === 0) {
      return <p className="mt-3 text-sm text-gray-500">최근 7일 상세 기록이 아직 없어요.</p>
    }

    const items = [
      ...conditionLogs.map((log) => ({
        id: `log-${log.created_at}-${log.symptom_text}`,
        created_at: log.created_at,
        title: log.parsed_category || '기록',
        content: log.symptom_text || '증상 기록',
        helper: log.severity ? `심각도 ${log.severity}` : '증상',
      })),
      ...conditionMoods.map((mood) => ({
        id: `mood-${mood.created_at}-${mood.emoji}`,
        created_at: mood.created_at,
        title: `${mood.emoji} ${mood.mood}`,
        content: '기분 기록',
        helper: '기분',
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return (
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl bg-gray-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <span className="shrink-0 text-xs text-gray-400">{formatMessageDateTime(item.created_at)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{item.content}</p>
            <p className="mt-1 text-xs text-gray-400">{item.helper}</p>
          </li>
        ))}
      </ul>
    )
  }

  function renderMomFeatureModalContent() {
    const todayModeRuns = modeRuns.filter((run) => new Date(run.created_at) >= new Date(getTodayStartISO()))

    if (expandedFeatureCard === 'morning-briefing') {
      return (
        <div>
          {morningBriefing ? (
            <>
              <p className="text-base leading-relaxed text-gray-800">{morningBriefing.content}</p>
              {morningBriefing.created_at && (
                <p className="mt-3 text-sm text-gray-400">{formatMessageDateTime(morningBriefing.created_at)}</p>
              )}
              <button
                type="button"
                onClick={() => void handleReplayMorningBriefing()}
                disabled={isBriefingLoading}
                className="mt-6 min-h-[52px] w-full rounded-2xl bg-rose-500 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isBriefingLoading ? <Spinner text="브리핑 준비 중이에요..." /> : '브리핑 듣기 🔊'}
              </button>
            </>
          ) : (
            <>
              <p className="text-base leading-relaxed text-gray-600">아직 오늘의 브리핑이 없어요.</p>
              <button
                type="button"
                onClick={() => void handleFetchMorningBriefing({ playAudio: true })}
                disabled={isBriefingLoading}
                className="mt-6 min-h-[52px] w-full rounded-2xl bg-rose-500 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isBriefingLoading ? <Spinner text="브리핑 준비 중이에요..." /> : '굿모닝 브리핑 받기'}
              </button>
            </>
          )}
        </div>
      )
    }

    if (expandedFeatureCard === 'condition-summary') {
      return (
        <div>
          {conditionSummary ? (
            <>
              <div className="grid gap-3">
                {renderConditionMetric('평균 컨디션 부담', conditionSummary.averageSeverity, `${conditionSummary.averageSeverity}/5`)}
                {renderConditionMetric('입덧 기록', conditionSummary.nauseaCount, `${conditionSummary.nauseaCount}회`, 7)}
                {renderConditionMetric('피로 기록', conditionSummary.fatigueCount, `${conditionSummary.fatigueCount}회`, 7)}
                {renderConditionMetric('수면 기록', conditionSummary.sleepCount, `${conditionSummary.sleepCount}회`, 7)}
              </div>
              <h3 className="mt-6 text-base font-semibold text-gray-900">인사이트</h3>
              {renderMomConditionInsights()}
              <h3 className="mt-6 text-base font-semibold text-gray-900">최근 7일 상세 내역</h3>
              {renderMomConditionDetails()}
            </>
          ) : (
            <p className="text-base text-gray-500">최근 컨디션 기록을 불러오는 중이에요.</p>
          )}
        </div>
      )
    }

    if (expandedFeatureCard === 'ai-prepared') {
      return todayModeRuns.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {todayModeRuns.map((run) => renderMomModeRun(run))}
        </ul>
      ) : (
        <p className="text-base text-gray-500">오늘 아직 실행된 케어가 없어요 🫶</p>
      )
    }

    if (expandedFeatureCard === 'run-history') {
      return modeRuns.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {modeRuns.map((run) => renderMomModeRun(run, true))}
        </ul>
      ) : (
        <p className="text-base text-gray-500">아직 실행된 루틴이 없어요</p>
      )
    }

    return null
  }

  function renderMomModeRunLegacy(run: ModeRun, compact = false) {
    const actualActions = getActualDeviceActions(run)
    return (
      <li key={run.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {getMomModeEmoji(run.mode)} {run.mode_label || run.mode}
            </p>
            <p className="mt-1 text-xs text-gray-400">{formatMessageDateTime(run.created_at)}</p>
          </div>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
            실제 {actualActions.length}개
          </span>
        </div>
        {!compact && run.wife_card && (
          <p className="mt-3 text-sm leading-relaxed text-gray-700">{run.wife_card}</p>
        )}
        {!compact && actualActions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {actualActions.map((action) => (
              <span
                key={`${run.id}-${action.device}-${action.action}`}
                className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
              >
                {action.label}
              </span>
            ))}
          </div>
        )}
      </li>
    )
  }

  function renderMomPumFeatures() {
    const todayModeRuns = modeRuns.filter((run) => new Date(run.created_at) >= new Date(getTodayStartISO()))

    return (
      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-rose-100 bg-rose-50 p-4 break-keep">
          <h2 className="text-lg font-bold text-gray-900">엄마품 🌸</h2>
          <p className="mt-1 text-sm leading-relaxed text-rose-600">
            ThinQ ON이 오늘 컨디션을 살피고 하루를 준비해드려요.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm break-keep">
          <FeatureTitleRow
            title="오늘의 굿모닝 브리핑 🔊"
            cardId="morning-briefing"
            onExpand={setExpandedFeatureCard}
          />
          {morningBriefing ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">{morningBriefing.content}</p>
              <button
                type="button"
                onClick={() => void handleReplayMorningBriefing()}
                disabled={isBriefingLoading}
                className="mt-4 min-h-[44px] w-full rounded-2xl bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isBriefingLoading ? <Spinner text="브리핑 준비 중이에요..." /> : '브리핑 다시 듣기 🔊'}
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-gray-500">아직 오늘의 브리핑이 없어요 🌅</p>
              <button
                type="button"
                onClick={() => void handleFetchMorningBriefing()}
                disabled={isBriefingLoading}
                className="mt-4 min-h-[44px] w-full rounded-2xl bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isBriefingLoading ? <Spinner text="브리핑 준비 중이에요..." /> : '굿모닝 브리핑 받기'}
              </button>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm break-keep">
          <FeatureTitleRow
            title="최근 1주일 컨디션 요약"
            cardId="condition-summary"
            onExpand={setExpandedFeatureCard}
          />
          {renderMomConditionInsights()}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm break-keep">
          <FeatureTitleRow
            title="오늘 AI가 준비한 것"
            cardId="ai-prepared"
            onExpand={setExpandedFeatureCard}
          />
          {todayModeRuns.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-3">
              {todayModeRuns.map((run) => renderMomModeRun(run))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">오늘 아직 실행된 케어가 없어요 🫶</p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm break-keep">
          <FeatureTitleRow
            title="실행 히스토리"
            cardId="run-history"
            onExpand={setExpandedFeatureCard}
          />
          {modeRuns.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-3">
              {modeRuns.map((run) => renderMomModeRun(run, true))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">아직 실행된 루틴이 없어요</p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm break-keep">
          <CardTitleRow title="AI 자동 다이어리 ✨" cardId="ai-diary" onExpand={setExpandedCard} className="mb-2" />
          <p className="mb-4 text-sm text-gray-500">기록 탭의 오늘 몸 상태를 바탕으로 일기를 만들어드려요</p>
          <button
            type="button"
            onClick={handleGenerateAiDiary}
            disabled={isAiDiaryLoading}
            className="min-h-[44px] w-full rounded-2xl bg-rose-500 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
          >
            {isAiDiaryLoading ? <Spinner text="일기 쓰는 중이에요..." /> : '일기 써주세요 ✨'}
          </button>
          {aiDiary && (
            <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-4">
              <p className="text-sm italic leading-relaxed text-gray-700">{aiDiary}</p>
            </div>
          )}
        </section>
      </div>
    )
  }

  const wifeTabs: { id: WifeTab; label: string; icon: string }[] = [
    { id: 'quick', label: '홈', icon: '🏠' },
    { id: 'record', label: '기록', icon: '📝' },
    { id: 'care', label: '케어', icon: '💗' },
    ...(isPreparing ? [] : [{ id: 'features' as const, label: '기능', icon: '✨' }]),
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="sticky top-0 z-10 bg-white">
        <header className="bg-rose-50 px-5 pb-4 pt-5">
          <button
            type="button"
            onClick={navigateToSelect}
            className="mb-3 text-sm text-gray-500 transition hover:text-gray-700"
          >
            ← 홈으로
          </button>
          <h1 className="text-xl font-bold text-gray-900">오늘도 잘하고 있어요 🌸</h1>
          {babyName && (
            <p className="mt-1 text-sm text-rose-400">{withAya(babyName)}, 화이팅!</p>
          )}
          <p className="mt-1 text-sm text-gray-400">{getTodayLabel()}</p>
          {!isPreparing && pregnancyWeeks !== null && pregnancyWeeks > 0 && (
            <p className="mt-1 text-sm text-rose-400">우리 아기 {pregnancyWeeks}주차예요 🐣</p>
          )}
          {isPreparing && (
            <p className="mt-1 text-sm text-gray-400">임신 준비 중 🌱</p>
          )}
        </header>
      </div>

      <main className="mx-auto flex w-full max-w-[430px] flex-col gap-4 px-5 pb-[calc(64px+env(safe-area-inset-bottom))] pt-5 break-keep">
        {activeTab === 'quick' && (
          <>
            {displayCareCard ? (
              <section
                role="button"
                tabIndex={0}
                onClick={() => setModalType('mission')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setModalType('mission')
                  }
                }}
                className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition ${
                  isPreparing
                    ? 'border-green-100 bg-green-50 hover:border-green-200'
                    : 'border-gray-100 bg-white hover:border-rose-200'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-gray-900">{displayCareCard.title}</h2>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedCard('mission')
                    }}
                    className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
                    aria-label="확대"
                  >
                    ⛶
                  </button>
                </div>
                <p className="line-clamp-3 text-sm leading-relaxed text-gray-500">{displayCareCard.content}</p>
              </section>
            ) : (
              <section
                role="button"
                tabIndex={0}
                onClick={() => setModalType('carePending')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setModalType('carePending')
                  }
                }}
                className={`cursor-pointer rounded-2xl border-t-4 p-5 text-center shadow-sm transition ${
                  isPreparing
                    ? 'border-green-300 bg-green-50 hover:border-green-400'
                    : 'border-rose-300 bg-rose-50 hover:border-rose-400'
                }`}
              >
                <div className="flex items-start gap-2 text-left">
                  <div className="flex-1 text-center">
                    <p className="text-2xl">{isPreparing ? '🌱' : '✨'}</p>
                    <h2 className="mt-2 text-base font-semibold text-gray-900">
                      {isPreparing ? '오늘의 준비 조언을 준비하고 있어요 🌱' : '오늘의 조언을 준비하고 있어요 ✨'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedCard('care-pending')
                    }}
                    className="ml-auto text-sm text-gray-400 transition hover:text-gray-600"
                    aria-label="확대"
                  >
                    ⛶
                  </button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  {isPreparing ? (
                    <>
                      매일 아침 7시에
                      <br />
                      임신 준비 맞춤 조언이 와요
                    </>
                  ) : (
                    <>
                      매일 아침 7시에
                      <br />
                      맞춤 조언이 와요
                    </>
                  )}
                </p>
              </section>
            )}

            {isPreparing ? (
              <section className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
                <CardTitleRow
                  title="임신 준비 중 🌱"
                  cardId="folic-acid"
                  onExpand={setExpandedCard}
                />
                <button
                  type="button"
                  onClick={() => void handleFolicAcidCheck()}
                  disabled={isFolicAcidLoading}
                  className="w-full rounded-2xl bg-green-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-green-600 disabled:opacity-60"
                >
                  {isFolicAcidLoading ? <Spinner text="저장 중..." /> : '엽산 챙겼어요 🌱'}
                </button>
                {folicAcidSaved && (
                  <p className="mt-3 text-center text-sm text-green-600">오늘 엽산 복용이 기록됐어요 ✨</p>
                )}
              </section>
            ) : null}

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow
                title={isPreparing ? '오늘 컨디션 기록' : '오늘 기분이 어때요? 🌈'}
                cardId="mood"
                onExpand={setExpandedCard}
              />
              <div className="grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map((option) => {
                  const isSelected = todayMood?.mood === option.mood
                  return (
                    <button
                      key={option.mood}
                      type="button"
                      onClick={() => handleMoodSelect(option.mood, option.emoji)}
                      disabled={isMoodLoading}
                      className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-center transition disabled:opacity-60 ${
                        isSelected
                          ? 'border border-rose-500 bg-rose-50'
                          : 'border border-transparent bg-gray-50'
                      }`}
                    >
                      <span className="text-xl">{option.emoji}</span>
                      <span className="text-xs text-gray-700">{option.mood}</span>
                    </button>
                  )
                })}
              </div>
              {moodSavedMessage && (
                <p className="mt-3 text-center text-sm text-rose-500">오늘 기분이 기록됐어요 ✨</p>
              )}
            </section>

            {husbandMessage ? (
              <section className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-sm">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setModalType('message')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setModalType('message')
                    }
                  }}
                  className="cursor-pointer transition hover:opacity-90"
                >
                  <CardTitleRow title="남편의 메시지 💌" cardId="message" onExpand={setExpandedCard} className="mb-2" />
                  <p className="line-clamp-2 text-sm leading-relaxed text-gray-700">{husbandMessage.content}</p>
                </div>
                <button
                  type="button"
                  onClick={openSendMessageModal}
                  className="mt-4 w-full rounded-2xl bg-rose-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
                >
                  답장하기 💌
                </button>
              </section>
            ) : (
              <section className="rounded-2xl bg-gray-50 p-5 text-center shadow-sm">
                <CardTitleRow
                  title="남편에게 따뜻한 메시지내보는거 어떠신가요? 💌"
                  cardId="message"
                  onExpand={setExpandedCard}
                  className="mb-2 text-left"
                />
                <button
                  type="button"
                  onClick={openSendMessageModal}
                  className="mt-4 w-full rounded-2xl bg-rose-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
                >
                  먼저 메시지 보내기 💌
                </button>
              </section>
            )}

            {!isPreparing && (
              <>
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <CardTitleRow title="지금 힘드신가요? 🍋" cardId="nausea" onExpand={setExpandedCard} />
                  <button
                    type="button"
                    onClick={handleNauseaMode}
                    disabled={isNauseaLoading}
                    className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                  >
                    {isNauseaLoading ? <Spinner text="실행 중..." /> : '입덧 모드 켜기 🍋'}
                  </button>
                  {nauseaMessage && (
                    <p className="mt-3 text-sm text-gray-500">{nauseaMessage}</p>
                  )}
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <CardTitleRow title="잠자리 모드 😴" cardId="nausea" onExpand={setExpandedCard} className="mb-4" />
                  <button
                    type="button"
                    onClick={handleSleepMode}
                    disabled={isSleepLoading}
                    className="w-full rounded-2xl bg-violet-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-violet-600 disabled:opacity-60"
                  >
                    {isSleepLoading ? <Spinner text="실행 중..." /> : '잠자리 모드 켜기 😴'}
                  </button>
                  {sleepMessage && (
                    <p className="mt-3 text-sm text-gray-500">{sleepMessage}</p>
                  )}
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <CardTitleRow title="아기가 움직였어요! 🐣" cardId="kick" onExpand={setExpandedCard} className="mb-1" />
                  <p className="mb-4 text-center text-6xl font-bold text-gray-900">{kickCount}</p>
                  <p className="mb-5 text-center text-sm text-gray-500">오늘 {kickCount}번 느꼈어요</p>
                  <button
                    type="button"
                    onClick={handleKick}
                    disabled={isKickLoading}
                    className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                  >
                    {isKickLoading ? <Spinner text="저장 중..." /> : '지금 느꼈어요!'}
                  </button>
                </section>
              </>
            )}
          </>
        )}

        {activeTab === 'record' && (
          <>
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="오늘 몸 상태 기록하기 📝" cardId="diary-input" onExpand={setExpandedCard} />
              <textarea
                value={diaryText}
                onChange={(e) => setDiaryText(e.target.value)}
                placeholder="오늘 어떠셨어요? 편하게 적어주세요"
                rows={4}
                className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="button"
                onClick={handleDiarySave}
                disabled={isDiaryLoading || !diaryText.trim()}
                className="mt-4 w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isDiaryLoading ? <Spinner text="AI가 읽어보고 있어요..." /> : '저장하기'}
              </button>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="초음파 사진 분석하기 🩺" cardId="ultrasound" onExpand={setExpandedCard} className="mb-2" />
              <p className="mb-4 text-sm text-gray-500">사진을 올리면 아기 크기를 알려드려요</p>

              <div
                role="button"
                tabIndex={0}
                onClick={() => ultrasoundInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    ultrasoundInputRef.current?.click()
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsUltrasoundDragging(true)
                }}
                onDragLeave={() => setIsUltrasoundDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsUltrasoundDragging(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleUltrasoundFile(file)
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition ${
                  isUltrasoundDragging
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-gray-200 bg-gray-50 hover:border-rose-300 hover:bg-rose-50/50'
                }`}
              >
                <p className="text-sm font-medium text-gray-600">사진을 여기에 올려주세요 🩺</p>
                <p className="mt-2 text-xs text-gray-400">클릭 또는 드래그 · 10MB 이하</p>
                <input
                  ref={ultrasoundInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUltrasoundFile(file)
                    e.target.value = ''
                  }}
                />
              </div>

              {ultrasoundPreview && (
                <div className="mt-4 flex justify-center rounded-2xl bg-gray-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ultrasoundPreview}
                    alt="초음파 미리보기"
                    className="max-h-40 object-contain"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleUltrasoundAnalyze}
                disabled={isUltrasoundLoading || !ultrasoundFile}
                className="mt-4 w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isUltrasoundLoading ? <Spinner text="사진을 살펴보는 중이에요..." /> : '분석 시작하기'}
              </button>

              {ultrasoundError && (
                <p className="mt-3 text-center text-sm text-red-500">{ultrasoundError}</p>
              )}

              {ultrasoundResult && (
                <div className="mt-4 rounded-2xl bg-rose-50 p-5">
                  <p className="animate-bounce-once text-center text-6xl">{ultrasoundResult.fruit_emoji}</p>
                  <p className="mt-3 text-center text-xl font-bold text-gray-900">
                    {ultrasoundResult.fruit_name} 크기예요!
                  </p>
                  <p className="mt-2 text-center text-sm text-gray-600">
                    약 {ultrasoundResult.estimated_size_cm}cm · 추정 {ultrasoundResult.estimated_weeks}주차
                  </p>
                  <p className="mt-1 text-center text-xs text-gray-500">
                    🩺 {ultrasoundResult.size_basis}
                  </p>

                  {(ultrasoundResult.crl || ultrasoundResult.bpd || ultrasoundResult.fl) && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {ultrasoundResult.crl && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-700">
                          CRL {ultrasoundResult.crl}
                        </span>
                      )}
                      {ultrasoundResult.bpd && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-700">
                          BPD {ultrasoundResult.bpd}
                        </span>
                      )}
                      {ultrasoundResult.fl && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-700">
                          FL {ultrasoundResult.fl}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-4 text-center text-sm leading-relaxed text-gray-700">
                    {ultrasoundResult.description}
                  </p>

                  <p className="mt-4 text-center text-xs text-gray-400">
                    참고용이에요. 정확한 내용은 의사 선생님께 물어보세요 🩺
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="초음파 기록 갤러리 🩺" cardId="gallery" onExpand={setExpandedCard} />

              {isGalleryLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner text="갤러리 불러오는 중..." />
                </div>
              ) : galleryRecords.length === 0 ? (
                <p className="text-center text-sm text-gray-400">아직 초음파 기록이 없어요 🩺</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {galleryRecords.map((record) => {
                    const imageUrl = galleryImageUrls[record.id]
                    return (
                      <div
                        key={record.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedGalleryRecord(record)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedGalleryRecord(record)
                          }
                        }}
                        className="relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 transition hover:border-rose-200"
                      >
                        {record.weeks && (
                          <span className="absolute left-2 top-2 z-10 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                            {record.weeks}주차
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDeleteGalleryRecord(record)
                          }}
                          disabled={deletingGalleryId === record.id}
                          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white transition hover:bg-black/70 disabled:opacity-60"
                          aria-label="삭제"
                        >
                          ✕
                        </button>

                        <div className="aspect-square overflow-hidden bg-gray-100">
                          {imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={imageUrl}
                              alt={`${record.fruit_name} 초음파`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-gray-400">
                              이미지 없음
                            </div>
                          )}
                        </div>

                        <div className="p-3">
                          <p className="text-center text-2xl">{record.fruit_emoji}</p>
                          <p className="mt-1 text-center text-xs text-gray-500">
                            {formatGalleryDate(record.created_at)}
                          </p>
                          <p className="mt-1 text-center text-xs font-medium text-gray-700">
                            {record.weeks ? `${record.weeks}주차 · ` : ''}
                            {record.fruit_name} 크기
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {diaryAdvice && (
              <section className="rounded-2xl border border-gray-100 bg-rose-50 p-5 shadow-sm">
                <p className="text-sm leading-relaxed text-gray-700">✨ {diaryAdvice}</p>
              </section>
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="오늘의 일기 만들기 ✨" cardId="ai-diary" onExpand={setExpandedCard} className="mb-2" />
              <p className="mb-4 text-sm text-gray-500">오늘 기록한 것들로 일기를 써드려요</p>
              <button
                type="button"
                onClick={handleGenerateAiDiary}
                disabled={isAiDiaryLoading}
                className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isAiDiaryLoading ? <Spinner text="일기 쓰는 중이에요..." /> : '일기 써주세요 ✨'}
              </button>
              {aiDiary && (
                <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-4">
                  <p className="text-sm italic leading-relaxed text-gray-700">{aiDiary}</p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border-t-4 border-blue-400 bg-blue-50 p-5 shadow-sm">
              <CardTitleRow
                title={isPreparing ? '산전 검사 예약 📅' : '병원 일정 📅'}
                cardId="appointment"
                onExpand={setExpandedCard}
              />
              {nextAppt ? (
                <div>
                  <p className="text-lg font-bold text-gray-900">{nextAppt.title}</p>
                  {nextAppt.hospital && (
                    <p className="mt-1 text-sm text-gray-600">{nextAppt.hospital}</p>
                  )}
                  {apptDaysLeft !== null && (
                    <span
                      className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        apptDaysLeft <= 3
                          ? 'bg-red-100 text-red-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      D-{apptDaysLeft}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">예약된 일정이 없어요</p>
              )}
              <button
                type="button"
                onClick={() => setShowWifeCalendar(true)}
                className="mt-4 w-full rounded-2xl bg-white py-3 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-blue-100"
              >
                달력으로 보기 📅
              </button>
            </section>
          </>
        )}

        {activeTab === 'care' && (
          <>
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="이번 주 돌아보기 📋" cardId="report" onExpand={setExpandedCard} />
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isReportLoading}
                className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isReportLoading ? <Spinner text="이번 주를 돌아보는 중이에요..." /> : '리포트 받기 📝'}
              </button>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="아기 움직임 기록 🐣" cardId="heatmap" onExpand={setExpandedCard} className="mb-2" />
              <p className="mb-4 text-sm text-gray-500">최근 7일간 아기가 언제 많이 움직였는지 보여줘요</p>
              {isKickHeatmapLoading ? (
                <div className="py-8">
                  <Spinner text="불러오는 중..." />
                </div>
              ) : kickHeatmapError ? (
                <p className="text-center text-sm text-gray-400">{kickHeatmapError}</p>
              ) : !kickHeatmapData || kickHeatmapData.totalCount === 0 ? (
                <p className="text-center text-sm text-gray-500">아직 태동 기록이 없어요 🐣</p>
              ) : (
                <>
                  <div className="grid grid-cols-5 gap-1">
                    <div />
                    {KICK_TIME_SLOTS.map((slot) => (
                      <p key={slot} className="text-center text-xs text-gray-500">
                        {KICK_TIME_SLOT_LABELS[slot]}
                      </p>
                    ))}
                    {kickHeatmapData.grid.map((row, daysAgo) => (
                      <div key={daysAgo} className="contents">
                        <p className="flex items-center text-xs text-gray-400">
                          {getKickHeatmapDayLabel(daysAgo)}
                        </p>
                        {row.map((count, slotIndex) => (
                          <div
                            key={`${daysAgo}-${slotIndex}`}
                            className={`flex aspect-square w-full items-center justify-center rounded text-xs font-medium ${getKickHeatmapCellClass(count)} ${
                              count >= 4 ? 'text-white' : count > 0 ? 'text-gray-700' : 'text-transparent'
                            }`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-gray-700">
                    {kickHeatmapData.mostActiveSlot && (
                      <p>
                        가장 활발한 시간대: {kickHeatmapData.mostActiveSlot.label} (총{' '}
                        {kickHeatmapData.mostActiveSlot.count}회)
                      </p>
                    )}
                    {kickHeatmapData.mostActiveDay && (
                      <p>
                        가장 활발한 날: {kickHeatmapData.mostActiveDay.label} (총{' '}
                        {kickHeatmapData.mostActiveDay.count}회)
                      </p>
                    )}
                    <p>이번 주 총 태동: {kickHeatmapData.totalCount}회</p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded-sm bg-gray-100" />
                      0회
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded-sm bg-rose-100" />
                      1회
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded-sm bg-rose-200" />
                      2~3회
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded-sm bg-rose-500" />
                      4회+
                    </span>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="이번 주 몸 상태 🩺" cardId="chart" onExpand={setExpandedCard} />
              {isSymptomTrendLoading ? (
                <div className="py-8">
                  <Spinner text="불러오는 중..." />
                </div>
              ) : symptomTrendError ? (
                <p className="text-center text-sm text-gray-400">{symptomTrendError}</p>
              ) : !symptomTrendData || symptomTrendData.totalLogs === 0 ? (
                <p className="text-center text-sm text-gray-500">아직 증상 기록이 없어요</p>
              ) : (
                <>
                  <div className="rounded-xl bg-white p-2">
                    <p className="mb-2 text-xs font-medium text-gray-500">날짜별 컨디션</p>
                    <SymptomSeverityLineChart dailySeverity={symptomTrendData.dailySeverity} />
                  </div>

                  <div className="mt-5 rounded-xl bg-white p-2">
                    <p className="mb-3 text-xs font-medium text-gray-500">증상 카테고리 분포</p>
                    <div className="space-y-2">
                      {symptomTrendData.categoryCounts.map((item) => {
                        const maxCount = symptomTrendData.categoryCounts[0]?.count ?? 1
                        const widthPercent = Math.max((item.count / maxCount) * 100, 8)
                        return (
                          <div key={item.category} className="flex items-center gap-2">
                            <span className="w-24 shrink-0 text-xs text-gray-600">
                              {getSymptomCategoryEmoji(item.category)} {item.label}
                            </span>
                            <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${widthPercent}%`, backgroundColor: item.color }}
                              />
                            </div>
                            <span className="w-6 shrink-0 text-right text-xs text-gray-500">
                              {item.count}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm leading-relaxed text-gray-700">
                    {symptomTrendData.mostCommonSymptom && (
                      <p>
                        요즘 {withIga(symptomTrendData.mostCommonSymptom.label)} 가장 자주 있었어요
                      </p>
                    )}
                    {symptomTrendData.hardestDay && (
                      <p>
                        {symptomTrendData.hardestDay.label}이 제일 힘든 날이었어요. 수고했어요 🫶
                      </p>
                    )}
                    <p>{WEEKLY_CONDITION_MESSAGES[symptomTrendData.weeklyCondition]}</p>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="아기 움직임 분석 🐣" cardId="kick-analysis" onExpand={setExpandedCard} />
              <button
                type="button"
                onClick={handleKickAnalysis}
                disabled={isKickAnalysisLoading}
                className="w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isKickAnalysisLoading ? <Spinner text="아기 움직임을 살펴보는 중이에요..." /> : '분석해보기 🐣'}
              </button>
            </section>

            {kickAnalysisError && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-center text-sm text-gray-400">{kickAnalysisError}</p>
              </section>
            )}

          </>
        )}

        {activeTab === 'features' && !isPreparing && renderMomPumFeatures()}
      </main>

      <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {wifeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 transition ${
                activeTab === tab.id ? 'text-rose-500' : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {expandedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setExpandedCard(null)}
        >
          <div
            className="fixed bottom-0 left-1/2 h-[90vh] w-full max-w-[430px] -translate-x-1/2 overflow-y-auto rounded-t-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">
                {EXPANDED_CARD_TITLES[expandedCard]}
              </h2>
              <button
                type="button"
                onClick={() => setExpandedCard(null)}
                className="shrink-0 text-xl text-gray-400 transition hover:text-gray-600"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {expandedCard === 'mission' && displayCareCard && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{displayCareCard.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-gray-700">{displayCareCard.content}</p>
              </div>
            )}

            {expandedCard === 'care-pending' && (
              <div>
                <p className="text-base leading-relaxed text-gray-600">
                  {isPreparing
                    ? '매일 아침 7시에 임신 준비 맞춤 조언이 와요'
                    : '매일 아침 7시에 맞춤 조언이 와요'}
                </p>
                <button
                  type="button"
                  onClick={() => void handleFetchDailyCare()}
                  disabled={isCardLoading}
                  className="mt-6 w-full rounded-2xl bg-rose-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {isCardLoading ? '조언을 만들고 있어요... ✨' : '지금 바로 받기 ✨'}
                </button>
              </div>
            )}

            {expandedCard === 'message' && (
              <div>
                {husbandMessage ? (
                  <>
                    <p className="text-lg leading-relaxed text-gray-800">{husbandMessage.content}</p>
                    <p className="mt-3 text-sm text-gray-400">
                      {formatMessageDateTime(husbandMessage.created_at)}
                    </p>
                  </>
                ) : (
                  <p className="text-base text-gray-600">
                    남편에게 따뜻한 메시지내보는거 어떠신가요? 💌
                  </p>
                )}
                <button
                  type="button"
                  onClick={openSendMessageModal}
                  className="mt-6 w-full rounded-2xl bg-rose-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-rose-600"
                >
                  {husbandMessage ? '답장하기 💌' : '먼저 메시지 보내기 💌'}
                </button>
              </div>
            )}

            {expandedCard === 'mood' && (
              <div>
                <div className="grid grid-cols-5 gap-3">
                  {MOOD_OPTIONS.map((option) => {
                    const isSelected = todayMood?.mood === option.mood
                    return (
                      <button
                        key={option.mood}
                        type="button"
                        onClick={() => handleMoodSelect(option.mood, option.emoji)}
                        disabled={isMoodLoading}
                        className={`flex flex-col items-center gap-2 rounded-2xl px-2 py-5 text-center transition disabled:opacity-60 ${
                          isSelected
                            ? 'border border-rose-500 bg-rose-50'
                            : 'border border-transparent bg-gray-50'
                        }`}
                      >
                        <span className="text-3xl">{option.emoji}</span>
                        <span className="text-sm text-gray-700">{option.mood}</span>
                      </button>
                    )
                  })}
                </div>
                {moodSavedMessage && (
                  <p className="mt-4 text-center text-base text-rose-500">오늘 기분이 기록됐어요 ✨</p>
                )}
              </div>
            )}

            {expandedCard === 'folic-acid' && (
              <div>
                <p className="mb-5 text-base leading-relaxed text-gray-600">
                  임신 준비 중에는 작은 루틴을 꾸준히 이어가는 것이 중요해요.
                </p>
                <button
                  type="button"
                  onClick={() => void handleFolicAcidCheck()}
                  disabled={isFolicAcidLoading}
                  className="w-full rounded-2xl bg-green-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-green-600 disabled:opacity-60"
                >
                  {isFolicAcidLoading ? <Spinner text="저장 중..." /> : '엽산 챙겼어요 🌱'}
                </button>
                {folicAcidSaved && (
                  <p className="mt-4 text-center text-base text-green-600">오늘 엽산 복용이 기록됐어요 ✨</p>
                )}
              </div>
            )}

            {expandedCard === 'nausea' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">지금 힘드신가요? 🍋</h3>
                  <button
                    type="button"
                    onClick={handleNauseaMode}
                    disabled={isNauseaLoading}
                    className="w-full rounded-2xl bg-rose-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                  >
                    {isNauseaLoading ? <Spinner text="실행 중..." /> : '입덧 모드 켜기 🍋'}
                  </button>
                  {nauseaMessage && <p className="mt-3 text-base text-gray-500">{nauseaMessage}</p>}
                </div>
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">잠자리 모드 😴</h3>
                  <button
                    type="button"
                    onClick={handleSleepMode}
                    disabled={isSleepLoading}
                    className="w-full rounded-2xl bg-violet-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-violet-600 disabled:opacity-60"
                  >
                    {isSleepLoading ? <Spinner text="실행 중..." /> : '잠자리 모드 켜기 😴'}
                  </button>
                  {sleepMessage && <p className="mt-3 text-base text-gray-500">{sleepMessage}</p>}
                </div>
              </div>
            )}

            {expandedCard === 'kick' && (
              <div>
                <p className="text-center text-8xl font-bold text-gray-900">{kickCount}</p>
                <p className="mb-6 mt-2 text-center text-base text-gray-500">오늘 {kickCount}번 느꼈어요</p>
                <button
                  type="button"
                  onClick={handleKick}
                  disabled={isKickLoading}
                  className="w-full rounded-2xl bg-rose-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {isKickLoading ? <Spinner text="저장 중..." /> : '지금 느꼈어요!'}
                </button>
              </div>
            )}

            {expandedCard === 'diary-input' && (
              <div>
                <textarea
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  placeholder="오늘 어떠셨어요? 편하게 적어주세요"
                  rows={10}
                  className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-100"
                />
                <button
                  type="button"
                  onClick={handleDiarySave}
                  disabled={isDiaryLoading || !diaryText.trim()}
                  className="mt-4 w-full rounded-2xl bg-rose-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {isDiaryLoading ? <Spinner text="AI가 읽어보고 있어요..." /> : '저장하기'}
                </button>
              </div>
            )}

            {expandedCard === 'ai-diary' && (
              <div>
                <p className="mb-4 text-base text-gray-500">오늘 기록한 것들로 일기를 써드려요</p>
                <button
                  type="button"
                  onClick={handleGenerateAiDiary}
                  disabled={isAiDiaryLoading}
                  className="w-full rounded-2xl bg-rose-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {isAiDiaryLoading ? <Spinner text="일기 쓰는 중이에요..." /> : '일기 써주세요 ✨'}
                </button>
                {aiDiary && (
                  <div className="mt-6 rounded-2xl bg-gray-50 px-5 py-5">
                    <p className="text-base italic leading-relaxed text-gray-700">{aiDiary}</p>
                  </div>
                )}
              </div>
            )}

            {expandedCard === 'ultrasound' && (
              <div>
                <p className="mb-4 text-base text-gray-500">사진을 올리면 아기 크기를 알려드려요</p>
                {renderUltrasoundUploadArea(true)}
              </div>
            )}

            {expandedCard === 'gallery' && renderGalleryGrid(true)}

            {expandedCard === 'appointment' && (
              <div>
                {nextAppt ? (
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{nextAppt.title}</p>
                    {nextAppt.hospital && (
                      <p className="mt-2 text-base text-gray-600">{nextAppt.hospital}</p>
                    )}
                    {apptDaysLeft !== null && (
                      <span
                        className={`mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${
                          apptDaysLeft <= 3
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        D-{apptDaysLeft}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-base text-gray-500">예약된 일정이 없어요</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedCard(null)
                    setShowWifeCalendar(true)
                  }}
                  className="mt-6 w-full rounded-2xl bg-white py-4 text-base font-semibold text-blue-600 shadow-sm transition hover:bg-blue-100"
                >
                  달력으로 보기 📅
                </button>
              </div>
            )}

            {expandedCard === 'report' && (
              <div>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={isReportLoading}
                  className="w-full rounded-2xl bg-rose-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {isReportLoading ? <Spinner text="이번 주를 돌아보는 중이에요..." /> : '리포트 받기 📝'}
                </button>
                {weeklyReport && (
                  <div className="mt-6 space-y-5 divide-y divide-gray-100">
                    <div className="pb-4">
                      <p className="mb-2 text-sm text-gray-400">📋 이번 주 요약</p>
                      <p className="text-lg font-semibold text-gray-900">{weeklyReport.summary}</p>
                    </div>
                    <div className="py-4">
                      <p className="mb-2 text-sm text-gray-400">🤒 증상 패턴</p>
                      <p className="text-base leading-relaxed text-gray-700">{weeklyReport.symptoms}</p>
                    </div>
                    <div className="py-4">
                      <p className="mb-2 text-sm text-gray-400">🟢 기기 사용</p>
                      <p className="text-base leading-relaxed text-gray-700">{weeklyReport.device_usage}</p>
                    </div>
                    <div className="py-4">
                      <p className="mb-2 text-sm text-gray-400">✨ 다음 주 추천</p>
                      <p className="whitespace-pre-line text-base leading-relaxed text-gray-700">
                        {weeklyReport.recommendation}
                      </p>
                    </div>
                    <div className="pt-4">
                      <p className="mb-2 text-sm text-rose-400">응원 메시지 💌</p>
                      <p className="text-base font-medium leading-relaxed text-rose-700">
                        {weeklyReport.encouragement}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {expandedCard === 'heatmap' && (
              <div>
                <p className="mb-4 text-base text-gray-500">최근 7일간 아기가 언제 많이 움직였는지 보여줘요</p>
                {isKickHeatmapLoading ? (
                  <div className="py-8">
                    <Spinner text="불러오는 중..." />
                  </div>
                ) : kickHeatmapError ? (
                  <p className="text-center text-base text-gray-400">{kickHeatmapError}</p>
                ) : !kickHeatmapData || kickHeatmapData.totalCount === 0 ? (
                  <p className="text-center text-base text-gray-500">아직 태동 기록이 없어요 🐣</p>
                ) : (
                  <>
                    <div className="grid grid-cols-5 gap-2">
                      <div />
                      {KICK_TIME_SLOTS.map((slot) => (
                        <p key={slot} className="text-center text-sm text-gray-500">
                          {KICK_TIME_SLOT_LABELS[slot]}
                        </p>
                      ))}
                      {kickHeatmapData.grid.map((row, daysAgo) => (
                        <div key={daysAgo} className="contents">
                          <p className="flex items-center text-sm text-gray-400">
                            {getKickHeatmapDayLabel(daysAgo)}
                          </p>
                          {row.map((count, slotIndex) => (
                            <div
                              key={`${daysAgo}-${slotIndex}`}
                              className={`flex aspect-square w-full items-center justify-center rounded text-sm font-medium ${getKickHeatmapCellClass(count)} ${
                                count >= 4 ? 'text-white' : count > 0 ? 'text-gray-700' : 'text-transparent'
                              }`}
                            >
                              {count > 0 ? count : ''}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 space-y-2 text-base text-gray-700">
                      {kickHeatmapData.mostActiveSlot && (
                        <p>
                          가장 활발한 시간대: {kickHeatmapData.mostActiveSlot.label} (총{' '}
                          {kickHeatmapData.mostActiveSlot.count}회)
                        </p>
                      )}
                      {kickHeatmapData.mostActiveDay && (
                        <p>
                          가장 활발한 날: {kickHeatmapData.mostActiveDay.label} (총{' '}
                          {kickHeatmapData.mostActiveDay.count}회)
                        </p>
                      )}
                      <p>이번 주 총 태동: {kickHeatmapData.totalCount}회</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {expandedCard === 'chart' && (
              <div>
                {isSymptomTrendLoading ? (
                  <div className="py-8">
                    <Spinner text="불러오는 중..." />
                  </div>
                ) : symptomTrendError ? (
                  <p className="text-center text-base text-gray-400">{symptomTrendError}</p>
                ) : !symptomTrendData || symptomTrendData.totalLogs === 0 ? (
                  <p className="text-center text-base text-gray-500">아직 증상 기록이 없어요</p>
                ) : (
                  <>
                    <div className="rounded-xl bg-white p-3">
                      <p className="mb-3 text-sm font-medium text-gray-500">날짜별 컨디션</p>
                      <SymptomSeverityLineChart dailySeverity={symptomTrendData.dailySeverity} />
                    </div>
                    <div className="mt-6 rounded-xl bg-white p-3">
                      <p className="mb-4 text-sm font-medium text-gray-500">증상 카테고리 분포</p>
                      <div className="space-y-3">
                        {symptomTrendData.categoryCounts.map((item) => {
                          const maxCount = symptomTrendData.categoryCounts[0]?.count ?? 1
                          const widthPercent = Math.max((item.count / maxCount) * 100, 8)
                          return (
                            <div key={item.category} className="flex items-center gap-3">
                              <span className="w-28 shrink-0 text-sm text-gray-600">
                                {getSymptomCategoryEmoji(item.category)} {item.label}
                              </span>
                              <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${widthPercent}%`, backgroundColor: item.color }}
                                />
                              </div>
                              <span className="w-8 shrink-0 text-right text-sm text-gray-500">
                                {item.count}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="mt-5 space-y-2 text-base leading-relaxed text-gray-700">
                      {symptomTrendData.mostCommonSymptom && (
                        <p>
                          요즘 {withIga(symptomTrendData.mostCommonSymptom.label)} 가장 자주 있었어요
                        </p>
                      )}
                      {symptomTrendData.hardestDay && (
                        <p>
                          {symptomTrendData.hardestDay.label}이 제일 힘든 날이었어요. 수고했어요 🫶
                        </p>
                      )}
                      <p>{WEEKLY_CONDITION_MESSAGES[symptomTrendData.weeklyCondition]}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {expandedCard === 'kick-analysis' && (
              <div>
                <button
                  type="button"
                  onClick={handleKickAnalysis}
                  disabled={isKickAnalysisLoading}
                  className="w-full rounded-2xl bg-rose-500 py-5 text-lg font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {isKickAnalysisLoading ? (
                    <Spinner text="아기 움직임을 살펴보는 중이에요..." />
                  ) : (
                    '분석해보기 🐣'
                  )}
                </button>
                {kickAnalysisError && (
                  <p className="mt-4 text-center text-base text-gray-400">{kickAnalysisError}</p>
                )}
                {kickAnalysis && (
                  <div className="mt-6">
                    <div className="mb-5 grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-rose-50 px-4 py-5 text-center">
                        <p className="text-sm text-gray-500">오늘 태동</p>
                        <p className="mt-1 text-3xl font-bold text-gray-900">{kickAnalysis.today_count}회</p>
                      </div>
                      <div className="rounded-2xl bg-rose-50 px-4 py-5 text-center">
                        <p className="text-sm text-gray-500">7일 평균</p>
                        <p className="mt-1 text-3xl font-bold text-gray-900">{kickAnalysis.daily_average}회</p>
                      </div>
                    </div>
                    <p className="mb-2 text-base text-gray-700">
                      가장 활발한 시간대:{' '}
                      <span className="font-semibold text-gray-900">{kickAnalysis.most_active_time}</span>
                    </p>
                    <p className={`mb-4 text-base font-semibold ${KICK_STATUS_COLORS[kickAnalysis.status]}`}>
                      상태: {KICK_STATUS_LABELS[kickAnalysis.status]}
                    </p>
                    <p className="mb-4 border-t border-gray-100 pt-4 text-base leading-relaxed text-gray-700">
                      {kickAnalysis.pattern_comment}
                    </p>
                    <p className="border-t border-gray-100 pt-4 text-base font-medium text-gray-700">
                      ✨ {kickAnalysis.advice}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {expandedFeatureCard && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setExpandedFeatureCard(null)}
        >
          <div
            className="fixed bottom-0 left-1/2 h-[90vh] w-full max-w-[430px] -translate-x-1/2 overflow-y-auto rounded-t-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">
                {WIFE_FEATURE_CARD_TITLES[expandedFeatureCard]}
              </h2>
              <button
                type="button"
                onClick={() => setExpandedFeatureCard(null)}
                className="shrink-0 text-xl text-gray-400 transition hover:text-gray-600"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {renderMomFeatureModalContent()}
          </div>
        </div>
      )}

      {modalType && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50"
          onClick={() => setModalType(null)}
        >
          <div
            className={`relative mx-4 mt-20 w-full max-w-sm overflow-y-auto rounded-3xl p-6 ${
              modalType === 'message'
                ? 'max-h-[70vh] bg-rose-50'
                : modalType === 'report'
                  ? 'max-h-[80vh] bg-white'
                  : 'max-h-[70vh] bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>

            {modalType === 'mission' && displayCareCard && (
              <>
                <h2 className="pr-8 text-base font-semibold text-gray-900">{displayCareCard.title}</h2>
                <p className="mt-1 text-sm text-gray-400">{getTodayDateOnly()}</p>
                <hr className="my-4 border-gray-100" />
                <p className="text-sm leading-relaxed text-gray-700">{displayCareCard.content}</p>
                <hr className="my-4 border-gray-100" />
                <div className="rounded-xl bg-rose-50 p-4 text-center">
                  <p className="text-sm font-medium text-rose-500">오늘 하루도 잘 하고 있어요 🌸</p>
                  <p className="mt-2 text-sm text-rose-500">작은 것 하나씩, 천천히 해나가면 돼요</p>
                </div>
              </>
            )}

            {modalType === 'message' && husbandMessage && (
              <>
                <h2 className="mb-4 pr-8 text-base font-semibold text-rose-700">남편의 메시지 💌</h2>
                <p className="text-lg leading-relaxed text-gray-800">{husbandMessage.content}</p>
                <p className="mt-4 text-xs text-rose-400">
                  {formatMessageDateTime(husbandMessage.created_at)}
                </p>
              </>
            )}

            {modalType === 'carePending' && (
              <>
                <h2 className="pr-8 text-base font-semibold text-gray-900">
                  {isPreparing
                    ? '오늘의 준비 조언을 준비하고 있어요 🌱'
                    : '오늘의 조언을 준비하고 있어요 ✨'}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  {isPreparing
                    ? '매일 아침 7시에 임신 준비 맞춤 조언이 와요'
                    : '매일 아침 7시에 맞춤 조언이 와요'}
                </p>
                <button
                  type="button"
                  onClick={() => void handleFetchDailyCare()}
                  disabled={isCardLoading}
                  className="mt-6 w-full rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {isCardLoading ? '조언을 만들고 있어요... ✨' : '지금 바로 받기 ✨'}
                </button>
              </>
            )}

            {modalType === 'report' && weeklyReport && (
              <div className="divide-y divide-gray-100 pr-2">
                <div className="pb-4">
                  <p className="mb-2 text-sm text-gray-400">📋 이번 주 요약</p>
                  <p className="text-lg font-semibold text-gray-900">{weeklyReport.summary}</p>
                </div>
                <div className="py-4">
                  <p className="mb-2 text-sm text-gray-400">🤒 증상 패턴</p>
                  <p className="text-sm leading-relaxed text-gray-700">{weeklyReport.symptoms}</p>
                </div>
                <div className="py-4">
                  <p className="mb-2 text-sm text-gray-400">🟢 기기 사용</p>
                  <p className="text-sm leading-relaxed text-gray-700">{weeklyReport.device_usage}</p>
                </div>
                <div className="py-4">
                  <p className="mb-2 text-sm text-gray-400">✨ 다음 주 추천</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {weeklyReport.recommendation}
                  </p>
                </div>
                <div className="pt-4">
                  <p className="mb-2 text-sm text-rose-400">응원 메시지 💌</p>
                  <p className="text-sm font-medium leading-relaxed text-rose-700">
                    {weeklyReport.encouragement}
                  </p>
                </div>
              </div>
            )}

            {modalType === 'kick' && kickAnalysis && (
              <div className="pr-2">
                <h2 className="mb-4 pr-8 text-base font-semibold text-gray-900">아기 움직임 분석 🐣</h2>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-rose-50 px-3 py-4 text-center">
                    <p className="text-xs text-gray-500">오늘 태동</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{kickAnalysis.today_count}회</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-4 text-center">
                    <p className="text-xs text-gray-500">7일 평균</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{kickAnalysis.daily_average}회</p>
                  </div>
                </div>
                <p className="mb-2 text-sm text-gray-700">
                  가장 활발한 시간대:{' '}
                  <span className="font-semibold text-gray-900">{kickAnalysis.most_active_time}</span>
                </p>
                <p className={`mb-4 text-sm font-semibold ${KICK_STATUS_COLORS[kickAnalysis.status]}`}>
                  상태: {KICK_STATUS_LABELS[kickAnalysis.status]}
                </p>
                <p className="mb-4 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-700">
                  {kickAnalysis.pattern_comment}
                </p>
                <p className="border-t border-gray-100 pt-4 text-sm font-medium text-gray-700">
                  ✨ {kickAnalysis.advice}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showHeartOverlay && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-pink-500/20 transition-opacity duration-300 ${
            heartOverlayVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="text-center">
            <p className="text-6xl">💗</p>
            <p className="mt-4 text-lg font-semibold text-gray-900">남편이 사랑을 보냈어요 💗</p>
          </div>
        </div>
      )}

      {showWifeCalendar && (
        <AppointmentCalendar
          role="wife"
          onClose={() => setShowWifeCalendar(false)}
          onUpdate={fetchNextAppt}
        />
      )}

      {selectedGalleryRecord && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50"
          onClick={() => {
            setSelectedGalleryRecord(null)
            setFullscreenGalleryImageUrl(null)
          }}
        >
          <div
            className="relative mx-4 mt-12 max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedGalleryRecord(null)
                setFullscreenGalleryImageUrl(null)
              }}
              className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteGalleryRecord(selectedGalleryRecord)}
              disabled={deletingGalleryId === selectedGalleryRecord.id}
              className="absolute right-12 top-4 text-sm text-red-400 transition hover:text-red-600 disabled:opacity-60"
            >
              삭제
            </button>

            <div className="overflow-hidden rounded-2xl bg-gray-100">
              {galleryImageUrls[selectedGalleryRecord.id] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={galleryImageUrls[selectedGalleryRecord.id]}
                  alt={`${selectedGalleryRecord.fruit_name} 초음파`}
                  className="w-full cursor-zoom-in object-contain transition hover:opacity-90"
                  onClick={() =>
                    setFullscreenGalleryImageUrl(galleryImageUrls[selectedGalleryRecord.id])
                  }
                />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                  이미지를 불러오지 못했어요
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-5xl">{selectedGalleryRecord.fruit_emoji}</p>
            <p className="mt-2 text-center text-lg font-bold text-gray-900">
              {selectedGalleryRecord.fruit_name}
            </p>
            <p className="mt-1 text-center text-sm text-gray-600">
              약 {selectedGalleryRecord.size_cm}cm
              {selectedGalleryRecord.weeks ? ` · ${selectedGalleryRecord.weeks}주차` : ''}
            </p>
            <p className="mt-1 text-center text-xs text-gray-500">
              🩺 {selectedGalleryRecord.size_basis}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-700">
              {selectedGalleryRecord.description}
            </p>
            <p className="mt-4 text-center text-xs text-gray-400">
              {formatGalleryDate(selectedGalleryRecord.created_at)}
            </p>
          </div>
        </div>
      )}

      {fullscreenGalleryImageUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
          onClick={() => setFullscreenGalleryImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenGalleryImageUrl(null)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:bg-black/70"
            aria-label="닫기"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenGalleryImageUrl}
            alt="초음파 확대"
            className="max-h-full max-w-full object-contain p-4"
          />
        </div>
      )}

      {showSendMessageModal && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50"
          onClick={() => setShowSendMessageModal(false)}
        >
          <div
            className="relative mx-4 mt-20 w-full max-w-sm rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSendMessageModal(false)}
              className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>

            <h2 className="mb-4 pr-8 text-base font-semibold text-gray-900">남편에게 메시지 보내기 💌</h2>
            <textarea
              value={wifeMessageText}
              onChange={(e) => setWifeMessageText(e.target.value)}
              placeholder="남편에게 하고 싶은 말을 적어주세요 💌"
              rows={4}
              className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSendMessageModal(false)}
                disabled={isWifeMessageLoading}
                className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleSendWifeMessage()}
                disabled={isWifeMessageLoading || !wifeMessageText.trim()}
                className="flex-1 rounded-2xl bg-rose-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isWifeMessageLoading ? <Spinner text="전송 중..." /> : '보내기 📨'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
