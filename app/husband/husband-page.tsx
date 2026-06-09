'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, DEMO_WIFE_ID, type Message } from '@/lib/supabase'
import { withIga } from '@/lib/korean'
import AppointmentCalendar, { type Appointment } from '@/components/AppointmentCalendar'
import Spinner from '@/components/Spinner'
import Toast from '@/components/Toast'
import DailySpotlightCard from '@/components/spotlight/DailySpotlightCard'
import {
  dismissToday,
  hasDismissedToday,
  makeFallbackHusbandSpotlight,
  type SpotlightContent,
} from '@/lib/spotlight'
import { useToast } from '@/hooks/useToast'

type DeviceStatus = {
  power: string
  mode: string
}

type DeviceEvent = {
  id: string
  user_id: string
  event_type: string
  triggered_by: string
  device_status: DeviceStatus
  created_at: string
}

type SymptomLog = {
  id: string
  user_id: string
  symptom_text: string
  parsed_category: string
  created_at: string
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

type DailyCard = {
  title: string
  content: string
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
  husband_card: string | null
  device_results: ModeRunDeviceResult[] | null
}

type SpotlightDailyCardRow = {
  title?: string | null
  content?: string | null
  created_at?: string | null
}

type SpotlightMessageRow = {
  id: string
  from_role: string
  content: string
  created_at: string
}

const QUICK_MISSION_MESSAGES = ['사랑해, 오늘도 수고해 💗']

type DadCareConfig = {
  emoji: string
  bgClass: string
  title: string
  message: string
  buttons: string[]
  hints: string[]
  phrase: string
}

const DAD_CARE_CONFIGS: Record<string, DadCareConfig> = {
  NAUSEA_MODE: {
    emoji: '🍋',
    bgClass: 'bg-rose-50',
    title: '입덧모드',
    message: '오늘은 냄새에 민감할 수 있는 날이에요.',
    buttons: ['냄새 적은 메뉴로 고를게 🍋', '저녁 정리는 내가 할게 🫶'],
    hints: ['강한 냄새가 나는 조리는 피하기', '환기는 짧게 먼저 도와주기', '가벼운 메뉴를 함께 고르기'],
    phrase: '오늘 저녁은 냄새 적은 걸로 같이 고르자 🍋',
  },
  SLEEP_MODE: {
    emoji: '😴',
    bgClass: 'bg-blue-50',
    title: '수면모드',
    message: '오늘은 조용한 밤 환경이 좋아요.',
    buttons: ['오늘은 조용히 쉬게 해줄게 😴', 'TV 소리 낮출게 🔊'],
    hints: ['TV와 알림 소리 줄이기', '밝은 조명은 낮추기', '먼저 쉬도록 집안 정리 맡기'],
    phrase: '정리는 내가 할게. 먼저 쉬어 😴',
  },
  HOUSEWORK_MODE: {
    emoji: '🧺',
    bgClass: 'bg-green-50',
    title: '가사케어 모드',
    message: '오늘은 움직이기 부담스러운 날이에요.',
    buttons: ['빨래는 내가 확인할게 🧺', '식기는 내가 정리할게 🧺'],
    hints: ['젖은 빨래와 무거운 물건 먼저 확인하기', '식기와 주방 정리 맡기', '청소는 짧고 조용하게 나눠 하기'],
    phrase: '빨래는 내가 확인할게. 지금은 쉬어 🧺',
  },
  TRAVEL_MODE: {
    emoji: '🚗',
    bgClass: 'bg-purple-50',
    title: '여행 모드',
    message: '오늘은 기분 전환이 필요한 날이에요.',
    buttons: ['같이 쉬자고 말할게 🚗', '간식 준비할게 🫶'],
    hints: ['대화보다 편한 동행을 먼저 제안하기', '가벼운 간식이나 음료 준비하기', '분위기 영상이나 음악을 함께 고르기'],
    phrase: '오늘은 그냥 집에서 같이 쉬자 🚗',
  },
  MORNING_BRIEFING: {
    emoji: '✨',
    bgClass: 'bg-yellow-50',
    title: '굿모닝 브리핑',
    message: '오늘 필요한 배려를 천천히 확인하면 좋아요.',
    buttons: ['오늘 필요한 건 내가 먼저 챙길게 🫶', '무리하지 말고 천천히 시작하자 💙'],
    hints: ['오늘 일정과 컨디션을 먼저 물어보기', '아침 식사는 부담 적게 준비하기', '집안일은 급한 것만 나눠 맡기'],
    phrase: '오늘 필요한 건 내가 먼저 챙길게',
  },
}

const DEFAULT_DAD_CARE_CONFIG: DadCareConfig = {
  emoji: '💙',
  bgClass: 'bg-blue-50',
  title: '아빠손길',
  message: '오늘 필요한 배려를 행동으로 준비해보세요.',
  buttons: ['오늘 필요한 건 내가 먼저 챙길게 🫶', '편하게 쉬어도 괜찮아 💙'],
  hints: ['먼저 묻고 필요한 일만 조용히 돕기', '냄새와 소음을 줄이기', '집안일은 짧게 나눠 맡기'],
  phrase: '오늘 필요한 건 내가 먼저 챙길게',
}

const DAD_SPOTLIGHT_CONTENT: Record<
  string,
  { headline: string; description: string; actions: { label: string }[] }
> = {
  NAUSEA_MODE: {
    headline: '오늘은 강한 냄새에 조금 더 신경 쓰면 좋아요.',
    description: '저녁 메뉴는 냄새가 적은 걸로 같이 고르고, 식사 후 정리는 먼저 맡아주세요.',
    actions: [{ label: '냄새 적은 메뉴로 고를게 🍽️' }, { label: '저녁 정리는 내가 할게 ✅' }],
  },
  SLEEP_MODE: {
    headline: '오늘은 늦은 시간 소음과 밝은 조명을 줄이면 좋아요.',
    description: '밤에는 TV 소리와 조명을 낮추고, 편히 쉴 수 있게 집 안 분위기를 차분하게 만들어주세요.',
    actions: [{ label: '오늘은 조용히 쉬게 해줄게 🌙' }, { label: 'TV 소리 낮출게 📺' }],
  },
  HOUSEWORK_MODE: {
    headline: '오늘은 바로 움직이기 부담스러운 날일 수 있어요.',
    description: '세탁물이나 식기처럼 바로 확인해야 하는 일은 먼저 살펴봐 주세요.',
    actions: [{ label: '빨래는 내가 확인할게 👕' }, { label: '식기는 내가 정리할게 🍽️' }],
  },
  TRAVEL_MODE: {
    headline: '오늘은 편한 쉼과 기분 전환이 도움이 될 수 있어요.',
    description: '큰 계획보다 함께 쉬자는 말과 가벼운 간식처럼 부담 없는 배려를 준비해보세요.',
    actions: [{ label: '같이 쉬자고 말할게 💑' }, { label: '간식 준비할게 🧃' }],
  },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatChatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAlertDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getSeverityBadge(severity: number) {
  if (severity >= 5) {
    return { label: '많이 위급해요 🩺', className: 'text-red-600 bg-red-100' }
  }
  if (severity >= 4) {
    return { label: '조금 위급해요 🩺', className: 'text-yellow-700 bg-yellow-100' }
  }
  return { label: '알림 🩺', className: 'text-gray-600 bg-gray-100' }
}

function formatDeviceStatus(event: DeviceEvent | null) {
  if (!event) return '아직 기록이 없어요'

  const { power } = event.device_status
  if (power === 'OFF') return '꺼져 있어요'

  return '켜져 있어요 🟢'
}

function isToday(iso: string) {
  return new Date(iso) >= new Date(getTodayStartISO())
}

function getBriefSpotlightText(text: string, sentenceLimit = 2) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const sentences = normalized.match(/[^.!?。！？]+[.!?。！？]?/g)
  if (!sentences) return normalized

  return sentences.slice(0, sentenceLimit).join(' ').trim()
}

function getDadSpotlightModeLabels(runs: Pick<ModeRun, 'mode' | 'mode_label'>[]) {
  return Array.from(
    new Set(
      runs
        .filter((run) => DAD_SPOTLIGHT_CONTENT[run.mode])
        .map((run) => run.mode_label || DAD_CARE_CONFIGS[run.mode]?.title)
        .filter((label): label is string => Boolean(label)),
    ),
  )
}

function buildDadSpotlightFromModeRun(run: ModeRun, todayRuns: ModeRun[]): SpotlightContent {
  const fallback = makeFallbackHusbandSpotlight()
  const modeContent = DAD_SPOTLIGHT_CONTENT[run.mode]
  const husbandCard = run.husband_card?.trim()

  return {
    ...fallback,
    headline: modeContent?.headline ?? fallback.headline,
    description:
      getBriefSpotlightText(husbandCard ?? modeContent?.description ?? fallback.description, 2) ||
      fallback.description,
    modeLabels: getDadSpotlightModeLabels(todayRuns),
    actions: modeContent?.actions ?? fallback.actions,
  }
}

function buildDadSpotlightFromText(text: string): SpotlightContent {
  const fallback = makeFallbackHusbandSpotlight()
  const description = getBriefSpotlightText(text, 2)

  if (!description) return fallback

  return {
    ...fallback,
    headline: fallback.headline,
    description,
    actions: fallback.actions ?? [{ label: '오늘 필요한 건 내가 먼저 챙길게 🫶' }],
  }
}

type HusbandTab = 'home' | 'status' | 'features'

type ExpandedCard =
  | 'mission'
  | 'appointment'
  | 'heart'
  | 'message'
  | 'alerts'
  | 'mood'
  | 'symptoms'
  | 'kick'
  | 'airpurifier'

type HusbandFeatureCard =
  | 'care-briefing'
  | 'care-card'
  | 'recommended-phrases'
  | 'routine-history'

const EXPANDED_CARD_TITLES: Record<ExpandedCard, string> = {
  mission: '오늘 아내 케어 미션',
  appointment: '다음 병원 예약일',
  heart: '마음 전하기',
  message: '메시지',
  alerts: '긴급 알림 히스토리',
  mood: '오늘 아내 기분',
  symptoms: '최근 증상 기록',
  kick: '오늘 태동 횟수',
  airpurifier: '공기청정기 상태',
}

const HUSBAND_FEATURE_CARD_TITLES: Record<HusbandFeatureCard, string> = {
  'care-briefing': '오늘의 배려 브리핑',
  'care-card': '오늘의 배려 카드',
  'recommended-phrases': '말해보면 좋은 한마디',
  'routine-history': '공유된 루틴 히스토리',
}

function CardTitleRow({
  title,
  cardId,
  onExpand,
  className = 'mb-4',
  titleClassName = 'text-base font-semibold text-gray-900',
}: {
  title: string
  cardId: ExpandedCard
  onExpand: (id: ExpandedCard) => void
  className?: string
  titleClassName?: string
}) {
  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      <h2 className={titleClassName}>{title}</h2>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onExpand(cardId)
        }}
        className="ml-auto shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
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
  cardId: HusbandFeatureCard
  onExpand: (id: HusbandFeatureCard) => void
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

type Alert = {
  id: string
  from_role: string
  severity: number
  message: string
  is_read: boolean
  created_at: string
}

type Mood = {
  id: string
  user_id: string
  mood: string
  emoji: string
  created_at: string
}

type MoodStyle = {
  bg: string
  border: string
  text: string
}

const MOOD_CARD_STYLES: Record<string, MoodStyle> = {
  '😊': { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-600' },
  '😌': { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-600' },
  '😔': { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-600' },
  '😣': { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-600' },
  '🤒': { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-600' },
}

const DEFAULT_MOOD_STYLE: MoodStyle = {
  bg: 'bg-gray-50',
  border: 'border-gray-300',
  text: 'text-gray-600',
}

function getMoodStyle(emoji?: string): MoodStyle {
  if (!emoji) return DEFAULT_MOOD_STYLE
  return MOOD_CARD_STYLES[emoji] ?? DEFAULT_MOOD_STYLE
}

function formatAppointmentDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function getDaysUntilAppointment(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const apptDate = new Date(dateStr)
  apptDate.setHours(0, 0, 0, 0)
  return Math.ceil((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function HusbandPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const babyName = searchParams.get('name')
  const isPreparing = searchParams.get('status') === 'preparing'
  const [latestDeviceEvent, setLatestDeviceEvent] = useState<DeviceEvent | null>(null)
  const [kickCount, setKickCount] = useState(0)
  const [diaryLogs, setDiaryLogs] = useState<SymptomLog[]>([])
  const [dailyCareCard, setDailyCareCard] = useState<DailyCard | null>(null)
  const [messageText, setMessageText] = useState('')
  const [messageHistory, setMessageHistory] = useState<Message[]>([])
  const [isMessageLoading, setIsMessageLoading] = useState(false)
  const [isMessageHistoryLoading, setIsMessageHistoryLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<HusbandTab>('home')
  const [unreadAlerts, setUnreadAlerts] = useState<Alert[]>([])
  const [alertHistory, setAlertHistory] = useState<Alert[]>([])
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)
  const [isHeartLoading, setIsHeartLoading] = useState(false)
  const [heartSent, setHeartSent] = useState(false)
  const [heartAnimating, setHeartAnimating] = useState(false)
  const [showMissionModal, setShowMissionModal] = useState(false)
  const [missionMessageSent, setMissionMessageSent] = useState(false)
  const [showSymptomModal, setShowSymptomModal] = useState(false)
  const [todayWifeMood, setTodayWifeMood] = useState<Mood | null>(null)
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [expandedCard, setExpandedCard] = useState<ExpandedCard | null>(null)
  const [expandedFeatureCard, setExpandedFeatureCard] = useState<HusbandFeatureCard | null>(null)
  const [modeRuns, setModeRuns] = useState<ModeRun[]>([])
  const [latestSystemMessage, setLatestSystemMessage] = useState<Message | null>(null)
  const [dadCareMessageSending, setDadCareMessageSending] = useState<string | null>(null)
  const [dailyDadSpotlight, setDailyDadSpotlight] = useState<SpotlightContent>(() => makeFallbackHusbandSpotlight())
  const [showDailyDadSpotlight, setShowDailyDadSpotlight] = useState(false)
  const [isDailyDadSpotlightClosing, setIsDailyDadSpotlightClosing] = useState(false)
  const heartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dailyDadSpotlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dailyDadSpotlightCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null)

  async function fetchNextAppointment() {
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

    setNextAppointment((data as Appointment) ?? null)
  }

  function navigateToSelect() {
    const query = searchParams.toString()
    router.push(query ? `/select?${query}` : '/select')
  }

  async function fetchDadModeRuns() {
    const { data, error } = await supabase
      .from('mode_runs')
      .select('id, mode, mode_label, created_at, husband_card, device_results')
      .eq('user_id', DEMO_WIFE_ID)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) {
      console.warn('아빠손길 mode_runs 조회 실패:', error)
      return
    }

    setModeRuns(((data as ModeRun[]) ?? []).slice(0, 8))
  }

  async function fetchLatestSystemMessage() {
    const { data, error } = await supabase
      .from('messages')
      .select('id, from_role, content, created_at')
      .eq('from_role', 'system')
      .gte('created_at', getTodayStartISO())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('오늘의 배려 브리핑 조회 실패:', error)
      return
    }

    setLatestSystemMessage((data as Message | null) ?? null)
  }

  async function fetchDadSpotlightFromTodayModeRuns() {
    try {
      const { data, error } = await supabase
        .from('mode_runs')
        .select('id, mode, mode_label, created_at, husband_card, device_results')
        .eq('user_id', DEMO_WIFE_ID)
        .gte('created_at', getTodayStartISO())
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.warn('Daily Dad Support Spotlight mode_runs 조회 실패:', error)
        return null
      }

      const runs = ((data as ModeRun[]) ?? []).filter((run) => run.husband_card?.trim())
      const latestRun = runs[0]
      return latestRun ? buildDadSpotlightFromModeRun(latestRun, runs) : null
    } catch (error) {
      console.warn('Daily Dad Support Spotlight mode_runs 조회 실패:', error)
      return null
    }
  }

  async function fetchDadSpotlightFromDailyCard() {
    try {
      const { data, error } = await supabase
        .from('daily_cards')
        .select('title, content, created_at')
        .eq('card_date', getTodayDateString())
        .eq('target_role', 'husband')
        .eq('card_type', 'MORNING_BRIEFING')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('Daily Dad Support Spotlight daily_cards 조회 실패:', error)
        return null
      }

      const card = (data as SpotlightDailyCardRow | null) ?? null
      return card?.content ? buildDadSpotlightFromText(card.content) : null
    } catch (error) {
      console.warn('Daily Dad Support Spotlight daily_cards 조회 실패:', error)
      return null
    }
  }

  async function fetchDadSpotlightFromTodayMessages() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, from_role, content, created_at')
        .in('from_role', ['system', 'husband'])
        .gte('created_at', getTodayStartISO())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('Daily Dad Support Spotlight messages 조회 실패:', error)
        return null
      }

      const message = (data as SpotlightMessageRow | null) ?? null
      return message?.content ? buildDadSpotlightFromText(message.content) : null
    } catch (error) {
      console.warn('Daily Dad Support Spotlight messages 조회 실패:', error)
      return null
    }
  }

  async function loadDailyDadSpotlight() {
    const spotlight =
      (await fetchDadSpotlightFromTodayModeRuns()) ??
      (await fetchDadSpotlightFromDailyCard()) ??
      (await fetchDadSpotlightFromTodayMessages()) ??
      makeFallbackHusbandSpotlight()

    setDailyDadSpotlight(spotlight)
    return spotlight
  }

  function closeDailyDadSpotlight() {
    if (isDailyDadSpotlightClosing) return

    dismissToday('husband')
    setIsDailyDadSpotlightClosing(true)
    if (dailyDadSpotlightCloseTimerRef.current) clearTimeout(dailyDadSpotlightCloseTimerRef.current)
    dailyDadSpotlightCloseTimerRef.current = setTimeout(() => {
      setShowDailyDadSpotlight(false)
      setIsDailyDadSpotlightClosing(false)
    }, 220)
  }

  function reopenDailyDadSpotlight() {
    if (dailyDadSpotlightTimerRef.current) clearTimeout(dailyDadSpotlightTimerRef.current)
    if (dailyDadSpotlightCloseTimerRef.current) clearTimeout(dailyDadSpotlightCloseTimerRef.current)
    setIsDailyDadSpotlightClosing(false)
    setShowDailyDadSpotlight(true)
  }

  useEffect(() => {
    async function fetchDailyCareCard() {
      const { data, error } = await supabase
        .from('daily_cards')
        .select('title, content')
        .eq('card_date', getTodayDateString())
        .eq('target_role', 'husband')
        .maybeSingle()

      if (error) {
        console.error('오늘의 케어 카드 조회 실패:', error)
        return
      }

      if (data) {
        setDailyCareCard(data as DailyCard)
      }
    }

    fetchDailyCareCard()
  }, [])

  useEffect(() => {
    fetchNextAppointment()
  }, [])

  useEffect(() => {
    async function fetchInitialData() {
      const [deviceResult, kickResult, diaryResult] = await Promise.all([
        supabase
          .from('device_events')
          .select('*')
          .eq('user_id', DEMO_WIFE_ID)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('symptom_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', DEMO_WIFE_ID)
          .eq('parsed_category', 'KICK')
          .gte('created_at', getTodayStartISO()),
        supabase
          .from('symptom_logs')
          .select('*')
          .eq('user_id', DEMO_WIFE_ID)
          .eq('parsed_category', 'DIARY')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (deviceResult.error) {
        console.error('공기청정기 상태 조회 실패:', deviceResult.error)
      } else if (deviceResult.data) {
        setLatestDeviceEvent(deviceResult.data as DeviceEvent)
      }

      if (kickResult.error) {
        console.error('태동 횟수 조회 실패:', kickResult.error)
      } else {
        setKickCount(kickResult.count ?? 0)
      }

      if (diaryResult.error) {
        console.error('증상 기록 조회 실패:', diaryResult.error)
      } else {
        setDiaryLogs((diaryResult.data as SymptomLog[]) ?? [])
      }
    }

    fetchInitialData()

    const channel = supabase
      .channel('husband-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_events',
          filter: `user_id=eq.${DEMO_WIFE_ID}`,
        },
        (payload) => {
          setLatestDeviceEvent(payload.new as DeviceEvent)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'symptom_logs',
          filter: `user_id=eq.${DEMO_WIFE_ID}`,
        },
        (payload) => {
          const log = payload.new as SymptomLog

          if (log.parsed_category === 'KICK' && isToday(log.created_at)) {
            setKickCount((prev) => prev + 1)
          }

          if (log.parsed_category === 'DIARY') {
            setDiaryLogs((prev) => [log, ...prev].slice(0, 5))
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime 구독 대기 중: husband-monitor', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    async function fetchTodayWifeMood() {
      const { data, error } = await supabase
        .from('moods')
        .select('id, user_id, mood, emoji, created_at')
        .eq('user_id', DEMO_WIFE_ID)
        .gte('created_at', getTodayStartISO())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('오늘 아내 기분 조회 실패:', error)
        return
      }

      if (data) {
        setTodayWifeMood(data as Mood)
      }
    }

    fetchTodayWifeMood()

    const channel = supabase
      .channel('husband-moods')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moods',
          filter: `user_id=eq.${DEMO_WIFE_ID}`,
        },
        (payload) => {
          const mood = payload.new as Mood
          if (isToday(mood.created_at)) {
            setTodayWifeMood(mood)
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime 구독 대기 중: husband-moods', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    async function fetchUnreadAlerts() {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, from_role, severity, message, is_read, created_at')
        .eq('from_role', 'wife')
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      console.log('alerts 조회 결과:', data, error)

      if (error) {
        console.error('긴급 알림 조회 실패:', error)
        return
      }

      setUnreadAlerts((data as Alert[]) ?? [])
    }

    async function fetchAlertHistory() {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, from_role, severity, message, is_read, created_at')
        .eq('from_role', 'wife')
        .order('created_at', { ascending: false })
        .limit(10)

      console.log('alerts 조회 결과:', data, error)

      if (error) {
        console.error('알림 히스토리 조회 실패:', error)
        return
      }

      setAlertHistory((data as Alert[]) ?? [])
    }

    fetchUnreadAlerts()
    fetchAlertHistory()

    const channel = supabase
      .channel('husband-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: 'from_role=eq.wife',
        },
        (payload) => {
          const alert = payload.new as Alert
          if (navigator.vibrate) {
            navigator.vibrate([300, 100, 300, 100, 300])
          }
          setAlertHistory((prev) => {
            if (prev.some((a) => a.id === alert.id)) return prev
            return [alert, ...prev].slice(0, 10)
          })
          if (!alert.is_read) {
            setUnreadAlerts((prev) => {
              if (prev.some((a) => a.id === alert.id)) return prev
              return [alert, ...prev]
            })
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime 구독 실패: husband-alerts')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleAcknowledgeAlert(alertId: string) {
    setAcknowledgingId(alertId)

    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId)

      if (error) throw error

      setUnreadAlerts((prev) => prev.filter((a) => a.id !== alertId))
      setAlertHistory((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)),
      )
    } catch (error) {
      console.error('긴급 알림 확인 실패:', error)
      showToast('알림 처리에 실패했어요', 'error')
    } finally {
      setAcknowledgingId(null)
    }
  }

  useEffect(() => {
    return () => {
      if (heartTimerRef.current) clearTimeout(heartTimerRef.current)
      if (dailyDadSpotlightTimerRef.current) clearTimeout(dailyDadSpotlightTimerRef.current)
      if (dailyDadSpotlightCloseTimerRef.current) clearTimeout(dailyDadSpotlightCloseTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('focusMessage') !== '1') return

    setActiveTab('home')
    const timer = setTimeout(() => {
      messageTextareaRef.current?.focus()
    }, 100)

    return () => clearTimeout(timer)
  }, [searchParams])

  useEffect(() => {
    if (isPreparing && activeTab === 'features') {
      setActiveTab('home')
    }
  }, [isPreparing, activeTab])

  useEffect(() => {
    if (isPreparing) return

    let cancelled = false
    const dismissed = hasDismissedToday('husband')
    const initialLoadTimer = setTimeout(() => {
      void fetchDadModeRuns()
      void fetchLatestSystemMessage()
      void loadDailyDadSpotlight().then(() => {
        if (cancelled || dismissed) return

        dailyDadSpotlightTimerRef.current = setTimeout(() => {
          if (cancelled) return
          setIsDailyDadSpotlightClosing(false)
          setShowDailyDadSpotlight(true)
        }, 300)
      })
    }, 0)

    const channel = supabase
      .channel(`husband-mode-runs-${crypto.randomUUID?.() ?? Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mode_runs',
          filter: `user_id=eq.${DEMO_WIFE_ID}`,
        },
        () => {
          void fetchDadModeRuns()
          void fetchLatestSystemMessage()
          void loadDailyDadSpotlight()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'from_role=eq.system',
        },
        (payload) => {
          const message = payload.new as Message
          if (isToday(message.created_at)) {
            setLatestSystemMessage(message)
            void loadDailyDadSpotlight()
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('mode_runs Realtime 구독 대기 중: husband-mode-runs', status)
        }
      })

    return () => {
      cancelled = true
      clearTimeout(initialLoadTimer)
      if (dailyDadSpotlightTimerRef.current) clearTimeout(dailyDadSpotlightTimerRef.current)
      supabase.removeChannel(channel)
    }
    // Existing page fetch helpers are intentionally kept local to preserve current behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreparing])

  async function fetchMessageHistory(silent = false) {
    if (!silent) setIsMessageHistoryLoading(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, from_role, content, created_at')
        .in('from_role', ['husband', 'wife'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setMessageHistory(((data ?? []) as Message[]).reverse())
    } catch (error) {
      console.error('메시지 히스토리 조회 실패:', error)
    } finally {
      if (!silent) setIsMessageHistoryLoading(false)
    }
  }

  useEffect(() => {
    void fetchMessageHistory(false)

    const channel = supabase
      .channel('husband-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message
          if (newMessage.from_role !== 'husband' && newMessage.from_role !== 'wife') return

          setMessageHistory((prev) => {
            if (prev.some((message) => message.id === newMessage.id)) return prev
            const next = [...prev, newMessage]
            return next.length > 10 ? next.slice(-10) : next
          })
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('메시지 Realtime 구독 대기 중: husband-messages', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleSendHeart() {
    setIsHeartLoading(true)

    try {
      const { error } = await supabase.from('hearts').insert({
        from_role: 'husband',
      })

      if (error) throw error

      setHeartAnimating(true)
      setHeartSent(true)

      if (heartTimerRef.current) clearTimeout(heartTimerRef.current)
      heartTimerRef.current = setTimeout(() => {
        setHeartSent(false)
        setHeartAnimating(false)
      }, 2000)
    } catch (error) {
      console.error('하트 전송 실패:', error)
      showToast('하트 전송에 실패했어요', 'error')
    } finally {
      setIsHeartLoading(false)
    }
  }

  async function handleSendMessage(contentOverride?: string) {
    const content = (contentOverride ?? messageText).trim()
    if (!content) return false

    setIsMessageLoading(true)

    try {
      const { error } = await supabase.from('messages').insert({
        from_role: 'husband',
        content,
      })

      if (error) throw error

      if (!contentOverride) {
        setMessageText('')
      }

      await fetchMessageHistory(true)
      if (!contentOverride) {
        showToast('메시지를 보냈어요 💌', 'success')
      }

      return true
    } catch (error) {
      console.error('응원 메시지 전송 실패:', error)
      showToast('메시지 전송에 실패했어요', 'error')
      return false
    } finally {
      setIsMessageLoading(false)
    }
  }

  async function handleQuickMissionMessage(text: string) {
    const success = await handleSendMessage(text)
    if (!success) return

    setMissionMessageSent(true)
    setTimeout(() => {
      setShowMissionModal(false)
      setMissionMessageSent(false)
    }, 1500)
  }

  async function handleQuickMissionMessageFromExpand(text: string) {
    const success = await handleSendMessage(text)
    if (!success) return

    setMissionMessageSent(true)
    setTimeout(() => {
      setExpandedCard(null)
      setMissionMessageSent(false)
    }, 1500)
  }

  async function sendDadCareMessage(content: string) {
    const message = content.trim()
    if (!message) return

    setDadCareMessageSending(message)
    try {
      const success = await handleSendMessage(message)
      if (success) {
        showToast('아내에게 메시지를 보냈어요', 'success')
      }
    } finally {
      setDadCareMessageSending(null)
    }
  }

  function getDadCareConfig(mode: string) {
    return DAD_CARE_CONFIGS[mode] ?? DEFAULT_DAD_CARE_CONFIG
  }

  function getTodayModeRuns() {
    return modeRuns.filter((run) => isToday(run.created_at))
  }

  function getUniqueTodayModes() {
    const seen = new Set<string>()
    return getTodayModeRuns().filter((run) => {
      if (seen.has(run.mode)) return false
      seen.add(run.mode)
      return true
    })
  }

  function renderDadCareCard(run: ModeRun, large = false, showExpand = true) {
    const config = getDadCareConfig(run.mode)
    return (
      <section key={run.id} className={`rounded-2xl border border-gray-100 p-5 shadow-sm ${config.bgClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`font-semibold text-gray-900 ${large ? 'text-lg' : 'text-sm'}`}>
              {config.emoji} {run.mode_label || config.title}
            </p>
            <p className={`mt-2 leading-relaxed text-gray-700 ${large ? 'text-base' : 'text-sm'}`}>
              {config.message}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-gray-600">
              {formatTime(run.created_at)}
            </span>
            {showExpand && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedFeatureCard('care-card')
                }}
                className="ml-auto text-sm text-gray-400 transition hover:text-gray-600"
                aria-label="확대"
              >
                ⛶
              </button>
            )}
          </div>
        </div>

        {large && (
          <ul className="mt-5 flex flex-col gap-2">
            {config.hints.map((hint) => (
              <li key={hint} className="flex items-start gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm text-gray-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                {hint}
              </li>
            ))}
          </ul>
        )}

        <div className={`mt-4 flex flex-col gap-2 ${large ? 'gap-3' : ''}`}>
          {config.buttons.map((buttonText) => (
            <button
              key={`${run.id}-${buttonText}`}
              type="button"
              onClick={() => void sendDadCareMessage(buttonText)}
              disabled={dadCareMessageSending !== null}
              className={`w-full rounded-2xl bg-white px-4 font-semibold text-gray-800 shadow-sm transition hover:bg-blue-50 disabled:opacity-60 ${
                large ? 'min-h-[56px] text-base' : 'min-h-[44px] text-sm'
              }`}
            >
              {dadCareMessageSending === buttonText ? <Spinner text="전송 중..." /> : buttonText}
            </button>
          ))}
        </div>
      </section>
    )
  }

  function renderActionHints() {
    const uniqueModes = getUniqueTodayModes()
    if (uniqueModes.length === 0) {
      return <p className="mt-3 text-sm text-gray-500">오늘은 아직 추천 행동이 없어요.</p>
    }

    return (
      <div className="mt-4 flex flex-col gap-4">
        {uniqueModes.map((run) => {
          const config = getDadCareConfig(run.mode)
          return (
            <div key={`hint-${run.id}`} className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">
                {config.emoji} {run.mode_label || config.title}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {config.hints.map((hint) => (
                  <li key={hint} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                    {hint}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    )
  }

  function renderSharedRoutines(all = false) {
    const runs = all ? modeRuns : getTodayModeRuns().slice(0, 5)
    if (runs.length === 0) {
      return <p className="mt-3 text-sm text-gray-500">오늘 공유된 루틴이 없어요.</p>
    }

    return (
      <ul className="mt-4 flex flex-col gap-3">
        {runs.map((run) => {
          const config = getDadCareConfig(run.mode)
          return (
            <li key={`routine-${run.id}`} className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  {config.emoji} {run.mode_label || config.title}
                </p>
                <span className="shrink-0 text-xs text-gray-400">{formatTime(run.created_at)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {run.husband_card || config.message}
              </p>
            </li>
          )
        })}
      </ul>
    )
  }

  function renderRecommendedPhrases() {
    const uniqueModes = getUniqueTodayModes()
    if (uniqueModes.length === 0) {
      return <p className="mt-3 text-sm text-gray-500">오늘 추천 멘트가 생기면 여기에 보여드릴게요.</p>
    }

    return (
      <div className="mt-4 flex flex-col gap-2">
        {uniqueModes.map((run) => {
          const config = getDadCareConfig(run.mode)
          return (
            <button
              key={`phrase-${run.id}`}
              type="button"
              onClick={() => void sendDadCareMessage(config.phrase)}
              disabled={dadCareMessageSending !== null}
              className="min-h-[44px] rounded-2xl border border-blue-100 bg-white px-4 py-3 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:bg-blue-50 disabled:opacity-60"
            >
              {dadCareMessageSending === config.phrase ? <Spinner text="전송 중..." /> : `"${config.phrase}"`}
            </button>
          )
        })}
      </div>
    )
  }

  function renderDadFeatureModalContent() {
    const todayRuns = getTodayModeRuns()

    if (expandedFeatureCard === 'care-briefing') {
      return latestSystemMessage ? (
        <div>
          <p className="text-base leading-relaxed text-gray-800">{latestSystemMessage.content}</p>
          <p className="mt-3 text-sm text-gray-400">{formatChatDateTime(latestSystemMessage.created_at)}</p>
        </div>
      ) : (
        <p className="text-base text-gray-500">오늘 아직 케어 알림이 없어요 🫶</p>
      )
    }

    if (expandedFeatureCard === 'care-card') {
      return todayRuns.length > 0 ? (
        <div className="flex flex-col gap-4">
          {todayRuns.map((run) => renderDadCareCard(run, true, false))}
        </div>
      ) : (
        <p className="text-base text-gray-500">오늘은 아직 추천 행동이 없어요.</p>
      )
    }

    if (expandedFeatureCard === 'recommended-phrases') {
      const uniqueModes = getUniqueTodayModes()
      return uniqueModes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {uniqueModes.map((run) => {
            const config = getDadCareConfig(run.mode)
            return (
              <button
                key={`expanded-phrase-${run.id}`}
                type="button"
                onClick={() => void sendDadCareMessage(config.phrase)}
                disabled={dadCareMessageSending !== null}
                className="min-h-[60px] rounded-2xl border border-blue-100 bg-white px-5 py-4 text-left text-base font-semibold leading-relaxed text-gray-800 shadow-sm transition hover:bg-blue-50 disabled:opacity-60"
              >
                {dadCareMessageSending === config.phrase ? <Spinner text="전송 중..." /> : `"${config.phrase}"`}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-base text-gray-500">오늘 추천 멘트가 생기면 여기에 보여드릴게요.</p>
      )
    }

    if (expandedFeatureCard === 'routine-history') {
      return renderSharedRoutines(true)
    }

    return null
  }

  function renderDadCareFeatures() {
    const todayRuns = getTodayModeRuns()

    return (
      <div className="flex flex-col gap-4 break-keep">
        <section className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
          <h2 className="text-lg font-bold text-gray-900">아빠손길 🫶</h2>
          <p className="mt-1 text-sm leading-relaxed text-blue-600">
            오늘 필요한 배려를 행동으로 알려드려요.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <FeatureTitleRow
            title="오늘의 배려 브리핑"
            cardId="care-briefing"
            onExpand={setExpandedFeatureCard}
          />
          {latestSystemMessage ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">{latestSystemMessage.content}</p>
              <p className="mt-2 text-xs text-gray-400">{formatChatDateTime(latestSystemMessage.created_at)}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-gray-500">오늘 아직 케어 알림이 없어요 🫶</p>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <div className="px-1">
            <FeatureTitleRow
              title="오늘의 배려 카드"
              cardId="care-card"
              onExpand={setExpandedFeatureCard}
            />
          </div>
          {todayRuns.length > 0 ? (
            todayRuns.map((run) => renderDadCareCard(run))
          ) : null}
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <FeatureTitleRow
            title="말해보면 좋은 한마디"
            cardId="recommended-phrases"
            onExpand={setExpandedFeatureCard}
          />
          <p className="mt-1 text-sm text-gray-500">누르면 아내 화면 메시지로 바로 전송돼요.</p>
          {renderRecommendedPhrases()}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <FeatureTitleRow
            title="공유된 루틴 히스토리"
            cardId="routine-history"
            onExpand={setExpandedFeatureCard}
          />
          {renderSharedRoutines()}
        </section>
      </div>
    )
  }

  function renderAlertHistoryList(large = false) {
    if (alertHistory.length === 0) {
      return <p className="text-center text-sm text-gray-500">긴급 알림이 없어요 🟢</p>
    }

    return (
      <ul>
        {alertHistory.map((alert, index) => {
          const severityBadge = getSeverityBadge(alert.severity)
          return (
            <li
              key={alert.id}
              className={`py-3 ${index < alertHistory.length - 1 ? 'border-b border-red-100' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className={`text-gray-500 ${large ? 'text-sm' : 'text-xs'}`}>
                  {formatAlertDateTime(alert.created_at)}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${severityBadge.className} ${large ? 'text-sm' : 'text-xs'}`}
                >
                  {severityBadge.label}
                </span>
              </div>
              <p className={`leading-relaxed text-gray-800 ${large ? 'text-base' : 'text-sm'}`}>
                {alert.message}
              </p>
              {alert.is_read && (
                <p className={`mt-2 text-gray-400 ${large ? 'text-sm' : 'text-xs'}`}>확인했어요 🟢</p>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  function renderSymptomList(large = false) {
    if (diaryLogs.length === 0) {
      return <p className="text-sm text-gray-500">아직 기록이 없어요</p>
    }

    return (
      <ul className={`flex flex-col ${large ? 'gap-4' : 'gap-3'}`}>
        {diaryLogs.map((log) => (
          <li key={log.id} className={`rounded-2xl bg-gray-50 ${large ? 'px-5 py-4' : 'px-4 py-3'}`}>
            <p className={`mb-1 text-gray-400 ${large ? 'text-sm' : 'text-xs'}`}>
              {formatTime(log.created_at)}
            </p>
            <p className={`leading-relaxed text-gray-700 ${large ? 'text-base' : 'text-sm'}`}>
              {log.symptom_text}
            </p>
          </li>
        ))}
      </ul>
    )
  }

  function renderMessageHistory(large = false) {
    if (isMessageHistoryLoading) {
      return <p className="text-center text-sm text-gray-400">메시지 불러오는 중...</p>
    }

    if (messageHistory.length === 0) {
      return <p className="text-center text-sm text-gray-400">아직 메시지가 없어요</p>
    }

    return (
      <div className={`space-y-3 ${large ? 'space-y-4' : ''}`}>
        {messageHistory.map((message) => {
          const isHusband = message.from_role === 'husband'
          return (
            <div
              key={message.id}
              className={`flex flex-col ${isHusband ? 'items-end' : 'items-start'}`}
            >
              <p
                className={`mb-1 text-gray-400 ${isHusband ? 'text-right' : 'text-left'} ${large ? 'text-sm' : 'text-xs'}`}
              >
                {isHusband ? '나' : '아내'} · {formatChatDateTime(message.created_at)}
              </p>
              <div
                className={`max-w-[85%] leading-relaxed ${
                  large ? 'px-5 py-3 text-base' : 'px-4 py-2.5 text-sm'
                } ${
                  isHusband
                    ? 'rounded-2xl rounded-tr-none bg-blue-500 text-white'
                    : 'rounded-2xl rounded-tl-none bg-rose-100 text-gray-800'
                }`}
              >
                {message.content}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const husbandTabs: { id: HusbandTab; label: string; icon: string }[] = [
    { id: 'home', label: '홈', icon: '🏠' },
    { id: 'status', label: '아내 상태', icon: '💙' },
    ...(isPreparing ? [] : [{ id: 'features' as const, label: '기능', icon: '✨' }]),
  ]

  const hasTodayDeviceEvent =
    latestDeviceEvent !== null && isToday(latestDeviceEvent.created_at)
  const hasTodayRealtimeActivity = hasTodayDeviceEvent || kickCount > 0
  const wifeMoodStyle = getMoodStyle(todayWifeMood?.emoji)
  const appointmentDaysLeft = nextAppointment
    ? getDaysUntilAppointment(nextAppointment.appointment_date)
    : null
  const { toast, showToast } = useToast()

  const activeUnreadAlert = unreadAlerts[0] ?? null

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {!isPreparing && (
        <DailySpotlightCard
          open={showDailyDadSpotlight}
          closing={isDailyDadSpotlightClosing}
          role="husband"
          title={dailyDadSpotlight.title}
          headline={dailyDadSpotlight.headline}
          description={dailyDadSpotlight.description}
          modeLabels={dailyDadSpotlight.modeLabels}
          actions={dailyDadSpotlight.actions?.map((action) => ({
            label: action.label,
            onClick: () => void sendDadCareMessage(action.label),
          }))}
          primaryLabel={dailyDadSpotlight.primaryLabel}
          secondaryLabel={dailyDadSpotlight.secondaryLabel}
          onClose={closeDailyDadSpotlight}
          onPrimary={closeDailyDadSpotlight}
        />
      )}
      {activeUnreadAlert && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 p-4 text-white shadow-xl">
          <h2 className="mb-2 text-base font-bold">긴급 알림 🩺</h2>
          <p className="text-sm leading-relaxed">{activeUnreadAlert.message}</p>
          <p className="mt-2 text-xs text-red-100">
            {formatAlertDateTime(activeUnreadAlert.created_at)}
          </p>
          <button
            type="button"
            onClick={() => handleAcknowledgeAlert(activeUnreadAlert.id)}
            disabled={acknowledgingId === activeUnreadAlert.id}
            className="mt-4 w-full rounded-2xl bg-white py-3 text-base font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-60"
          >
            {acknowledgingId === activeUnreadAlert.id ? <Spinner text="저장 중..." /> : '확인'}
          </button>
        </div>
      )}
      <div className="sticky top-0 z-10 bg-white">
        <header className="bg-blue-50 px-5 pb-4 pt-5">
          <button
            type="button"
            onClick={navigateToSelect}
            className="mb-3 text-sm text-gray-500 transition hover:text-gray-700"
          >
            ← 홈으로
          </button>
          <h1 className="text-xl font-bold text-gray-900">당신의 관심이 큰 힘이 돼요 💙</h1>
          {babyName && (
            <p className="mt-1 text-sm text-blue-400">{withIga(babyName)} 기다려요</p>
          )}
          <p className="mt-2 text-sm text-gray-400">{getTodayLabel()}</p>
          {!isPreparing && (
            <button
              type="button"
              onClick={reopenDailyDadSpotlight}
              className="mt-3 rounded-full border border-blue-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-white"
            >
              오늘 배려 카드 다시 보기
            </button>
          )}
        </header>
      </div>

      <main className="mx-auto flex w-full max-w-[430px] flex-col gap-4 px-5 pb-[calc(64px+env(safe-area-inset-bottom))] pt-5 break-keep">
        {activeTab === 'home' && (
          <>
            <div className="grid grid-cols-2 items-stretch gap-3">
              <section
                role="button"
                tabIndex={dailyCareCard ? 0 : -1}
                onClick={() => dailyCareCard && setShowMissionModal(true)}
                onKeyDown={(e) => {
                  if (dailyCareCard && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    setShowMissionModal(true)
                  }
                }}
                className={`flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${
                  dailyCareCard ? 'cursor-pointer transition hover:border-blue-200' : ''
                }`}
              >
                <CardTitleRow
                  title="오늘 아내를 위해 이렇게 해보세요 🫶"
                  cardId="mission"
                  onExpand={setExpandedCard}
                  className="mb-2"
                  titleClassName="text-sm font-semibold text-gray-900"
                />
                {dailyCareCard ? (
                  <>
                    <p className="mb-1 text-xs font-medium text-gray-700">{dailyCareCard.title}</p>
                    <p className="line-clamp-4 text-xs leading-relaxed text-gray-500">
                      {dailyCareCard.content}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">오늘 미션이 없어요</p>
                )}
              </section>

              <section
                role="button"
                tabIndex={0}
                onClick={() => setShowCalendarModal(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setShowCalendarModal(true)
                  }
                }}
                className="flex h-full cursor-pointer flex-col rounded-2xl border-t-4 border-blue-400 bg-blue-50 p-4 shadow-sm transition hover:opacity-90"
              >
                <CardTitleRow
                  title="다음 병원 일정 📅"
                  cardId="appointment"
                  onExpand={setExpandedCard}
                  className="mb-2"
                  titleClassName="text-sm font-semibold text-gray-900"
                />
                {nextAppointment ? (
                  <>
                    <p className="text-2xl">📅</p>
                    <p className="mt-2 text-base font-bold text-gray-900">{nextAppointment.title}</p>
                    {nextAppointment.hospital && (
                      <p className="mt-1 text-xs text-gray-600">{nextAppointment.hospital}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {formatAppointmentDate(nextAppointment.appointment_date)}
                    </p>
                    {appointmentDaysLeft !== null && (
                      <span
                        className={`mt-3 inline-block self-start rounded-full px-2.5 py-1 text-xs font-semibold ${
                          appointmentDaysLeft <= 3
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        D-{appointmentDaysLeft}일 남았어요
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500">예정된 병원 일정이 없어요 📅</p>
                )}
              </section>
            </div>

            <section className="rounded-2xl bg-rose-50 p-5">
              <CardTitleRow title="마음 전하기 💗" cardId="heart" onExpand={setExpandedCard} />
              <button
                type="button"
                onClick={handleSendHeart}
                disabled={isHeartLoading}
                className={`flex w-full flex-col items-center gap-2 rounded-2xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition duration-300 hover:bg-rose-600 disabled:opacity-60 ${
                  heartAnimating ? 'scale-125' : 'scale-100'
                }`}
              >
                <span className="text-4xl">💗</span>
                {isHeartLoading ? <Spinner text="전송 중..." /> : '사랑을 전할게요 💗'}
              </button>
              {heartSent && (
                <p className="mt-3 text-center text-sm font-semibold text-rose-500">
                  마음을 전했어요 💗
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="메시지 💌" cardId="message" onExpand={setExpandedCard} />

              <div className="mb-4 max-h-60 space-y-3 overflow-y-auto">
                {isMessageHistoryLoading ? (
                  <p className="text-center text-sm text-gray-400">메시지 불러오는 중...</p>
                ) : messageHistory.length === 0 ? (
                  <p className="text-center text-sm text-gray-400">아직 메시지가 없어요</p>
                ) : (
                  messageHistory.map((message) => {
                    const isHusband = message.from_role === 'husband'
                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col ${isHusband ? 'items-end' : 'items-start'}`}
                      >
                        <p className={`mb-1 text-xs text-gray-400 ${isHusband ? 'text-right' : 'text-left'}`}>
                          {isHusband ? '나' : '아내'} · {formatChatDateTime(message.created_at)}
                        </p>
                        <div
                          className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
                            isHusband
                              ? 'rounded-2xl rounded-tr-none bg-blue-500 text-white'
                              : 'rounded-2xl rounded-tl-none bg-rose-100 text-gray-800'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <textarea
                ref={messageTextareaRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="아내에게 메시지 보내기 💌"
                rows={3}
                className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={isMessageLoading || !messageText.trim()}
                className="mt-4 w-full rounded-2xl bg-blue-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60"
              >
                {isMessageLoading ? <Spinner text="전송 중..." /> : '보내기 📨'}
              </button>
            </section>
          </>
        )}

        {activeTab === 'status' && (
          <>
            <section className="rounded-2xl bg-red-50 p-5 shadow-sm">
              <CardTitleRow title="긴급 알림 기록 🩺" cardId="alerts" onExpand={setExpandedCard} />
              {renderAlertHistoryList()}
            </section>

            <section
              className={`rounded-2xl border-t-4 p-5 shadow-sm ${wifeMoodStyle.bg} ${wifeMoodStyle.border}`}
            >
              <CardTitleRow title="오늘 아내 기분 🌈" cardId="mood" onExpand={setExpandedCard} />
              {todayWifeMood ? (
                <div className="text-center">
                  <p className="text-5xl">{todayWifeMood.emoji}</p>
                  <p className={`mt-2 text-2xl font-bold ${wifeMoodStyle.text}`}>
                    {todayWifeMood.mood}
                  </p>
                </div>
              ) : (
                <p className="text-center text-sm text-gray-400">아직 기분을 기록하지 않았어요</p>
              )}
            </section>

            <section
              role="button"
              tabIndex={diaryLogs.length > 0 ? 0 : -1}
              onClick={() => diaryLogs.length > 0 && setShowSymptomModal(true)}
              onKeyDown={(e) => {
                if (diaryLogs.length > 0 && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  setShowSymptomModal(true)
                }
              }}
              className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${
                diaryLogs.length > 0 ? 'cursor-pointer transition hover:border-blue-200' : ''
              }`}
            >
              <CardTitleRow title="최근 아내가 기록한 것들" cardId="symptoms" onExpand={setExpandedCard} />
              {diaryLogs.length === 0 ? (
                <p className="text-sm text-gray-500">아직 기록이 없어요</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {diaryLogs.map((log) => (
                    <li key={log.id} className="rounded-xl bg-gray-50 px-4 py-3">
                      <p className="mb-1 text-xs text-gray-400">{formatTime(log.created_at)}</p>
                      <p className="line-clamp-2 text-sm text-gray-700">{log.symptom_text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <CardTitleRow title="오늘 아기 움직임 🐣" cardId="kick" onExpand={setExpandedCard} />
              <p className="text-center text-6xl font-bold text-gray-900">{kickCount}</p>
              <p className="mt-2 text-center text-sm text-gray-500">{kickCount}번 움직였어요</p>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <CardTitleRow
                title="공기청정기 상태"
                cardId="airpurifier"
                onExpand={setExpandedCard}
                className="mb-1"
                titleClassName="text-sm font-semibold text-gray-900"
              />
              <p className="text-center text-sm text-gray-700">
                {formatDeviceStatus(latestDeviceEvent)}
              </p>
            </section>

            {!hasTodayRealtimeActivity && unreadAlerts.length === 0 && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-center text-sm text-gray-400">아직 오늘 기록이 없어요</p>
              </section>
            )}
          </>
        )}

        {activeTab === 'features' && !isPreparing && renderDadCareFeatures()}
      </main>

      <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {husbandTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 transition ${
                activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'
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

            {expandedCard === 'mission' && (
              <div>
                {dailyCareCard ? (
                  <>
                    <div className="rounded-2xl bg-blue-50 px-4 py-5">
                      <h3 className="text-lg font-bold text-gray-900">{dailyCareCard.title}</h3>
                      <p className="mt-2 text-sm text-gray-500">{getTodayLabel()}</p>
                    </div>
                    <hr className="my-4 border-gray-100" />
                    <p className="text-base leading-relaxed text-gray-800">{dailyCareCard.content}</p>
                    <hr className="my-4 border-gray-100" />
                    <div className="rounded-2xl bg-rose-50 px-4 py-5">
                      {missionMessageSent ? (
                        <p className="text-center text-sm font-semibold text-rose-500">
                          메시지를 보냈어요 💌
                        </p>
                      ) : (
                        <>
                          <p className="mb-4 text-center text-sm text-gray-700">
                            미션 완료 후 아내에게 알려주세요 💌
                          </p>
                          <div className="flex flex-col gap-2">
                            {QUICK_MISSION_MESSAGES.map((text) => (
                              <button
                                key={text}
                                type="button"
                                onClick={() => void handleQuickMissionMessageFromExpand(text)}
                                disabled={isMessageLoading}
                                className="w-full rounded-2xl bg-white py-4 text-base font-semibold text-gray-800 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
                              >
                                {isMessageLoading ? <Spinner text="전송 중..." /> : text}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-base text-gray-500">오늘 미션이 없어요</p>
                )}
              </div>
            )}

            {expandedCard === 'appointment' && (
              <div>
                {nextAppointment ? (
                  <>
                    <p className="text-4xl">📅</p>
                    <p className="mt-4 text-2xl font-bold text-gray-900">{nextAppointment.title}</p>
                    {nextAppointment.hospital && (
                      <p className="mt-2 text-base text-gray-600">{nextAppointment.hospital}</p>
                    )}
                    <p className="mt-2 text-base text-gray-500">
                      {formatAppointmentDate(nextAppointment.appointment_date)}
                    </p>
                    {appointmentDaysLeft !== null && (
                      <span
                        className={`mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${
                          appointmentDaysLeft <= 3
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        D-{appointmentDaysLeft}일 남았어요
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-base text-gray-500">예정된 병원 일정이 없어요 📅</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedCard(null)
                    setShowCalendarModal(true)
                  }}
                  className="mt-6 w-full rounded-2xl bg-blue-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-600"
                >
                  달력으로 보기 📅
                </button>
              </div>
            )}

            {expandedCard === 'heart' && (
              <div>
                <button
                  type="button"
                  onClick={handleSendHeart}
                  disabled={isHeartLoading}
                  className={`flex w-full flex-col items-center gap-3 rounded-2xl bg-rose-500 py-8 text-lg font-semibold text-white shadow-sm transition duration-300 hover:bg-rose-600 disabled:opacity-60 ${
                    heartAnimating ? 'scale-125' : 'scale-100'
                  }`}
                >
                  <span className="text-6xl">💗</span>
                  {isHeartLoading ? <Spinner text="전송 중..." /> : '사랑을 전할게요 💗'}
                </button>
                {heartSent && (
                  <p className="mt-4 text-center text-base font-semibold text-rose-500">
                    마음을 전했어요 💗
                  </p>
                )}
              </div>
            )}

            {expandedCard === 'message' && (
              <div className="flex h-[calc(90vh-5rem)] flex-col">
                <div className="flex-1 overflow-y-auto pb-4">{renderMessageHistory(true)}</div>
                <div className="shrink-0 border-t border-gray-100 bg-white pt-4">
                  <textarea
                    ref={messageTextareaRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="아내에게 메시지 보내기 💌"
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={isMessageLoading || !messageText.trim()}
                    className="mt-3 w-full rounded-2xl bg-blue-500 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60"
                  >
                    {isMessageLoading ? <Spinner text="전송 중..." /> : '보내기 📨'}
                  </button>
                </div>
              </div>
            )}

            {expandedCard === 'alerts' && renderAlertHistoryList(true)}

            {expandedCard === 'mood' && (
              <div>
                {todayWifeMood ? (
                  <div className="text-center">
                    <p className="text-8xl">{todayWifeMood.emoji}</p>
                    <p className={`mt-4 text-3xl font-bold ${wifeMoodStyle.text}`}>
                      {todayWifeMood.mood}
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-base text-gray-400">아직 기분을 기록하지 않았어요</p>
                )}
              </div>
            )}

            {expandedCard === 'symptoms' && renderSymptomList(true)}

            {expandedCard === 'kick' && (
              <div>
                <p className="text-center text-8xl font-bold text-gray-900">{kickCount}</p>
                <p className="mt-4 text-center text-base text-gray-500">{kickCount}번 움직였어요</p>
              </div>
            )}

            {expandedCard === 'airpurifier' && (
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {formatDeviceStatus(latestDeviceEvent)}
                </p>
                {latestDeviceEvent && (
                  <p className="mt-4 text-sm text-gray-500">
                    마지막 업데이트 · {formatAlertDateTime(latestDeviceEvent.created_at)}
                  </p>
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
                {HUSBAND_FEATURE_CARD_TITLES[expandedFeatureCard]}
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

            {renderDadFeatureModalContent()}
          </div>
        </div>
      )}

      {showMissionModal && dailyCareCard && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50"
          onClick={() => setShowMissionModal(false)}
        >
          <div
            className="relative mx-4 mt-20 max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowMissionModal(false)}
              className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>

            <div className="rounded-2xl bg-blue-50 px-4 py-5 pr-10">
              <h2 className="text-xl font-bold text-gray-900">{dailyCareCard.title}</h2>
              <p className="mt-2 text-sm text-gray-500">{getTodayLabel()}</p>
            </div>

            <hr className="my-4 border-gray-100" />

            <p className="text-base leading-relaxed text-gray-800">{dailyCareCard.content}</p>

            <hr className="my-4 border-gray-100" />

            <div className="rounded-2xl bg-rose-50 px-4 py-5">
              {missionMessageSent ? (
                <p className="text-center text-sm font-semibold text-rose-500">
                  메시지를 보냈어요 💌
                </p>
              ) : (
                <>
                  <p className="mb-4 text-center text-sm text-gray-700">
                    미션 완료 후 아내에게 알려주세요 💌
                  </p>
                  <div className="flex flex-col gap-2">
                    {QUICK_MISSION_MESSAGES.map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => handleQuickMissionMessage(text)}
                        disabled={isMessageLoading}
                        className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        {isMessageLoading ? <Spinner text="전송 중..." /> : text}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showSymptomModal && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50"
          onClick={() => setShowSymptomModal(false)}
        >
          <div
            className="relative mx-4 mt-20 w-full max-w-sm max-h-[70vh] overflow-y-auto rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSymptomModal(false)}
              className="absolute right-4 top-4 text-xl text-gray-400 transition hover:text-gray-600"
              aria-label="닫기"
            >
              ✕
            </button>
            <h2 className="mb-4 pr-8 text-base font-semibold text-gray-900">최근 아내가 기록한 것들</h2>
            {diaryLogs.length === 0 ? (
              <p className="text-sm text-gray-500">아직 기록이 없어요</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {diaryLogs.map((log) => (
                  <li key={log.id} className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="mb-1 text-sm text-gray-400">{formatTime(log.created_at)}</p>
                    <p className="text-sm leading-relaxed text-gray-700">{log.symptom_text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <AppointmentCalendar
        open={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        role="husband"
        onAppointmentsChange={fetchNextAppointment}
      />
    </div>
  )
}
