import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// 데모용 고정 ID (로그인 없이 사용)
export const DEMO_WIFE_ID    = process.env.NEXT_PUBLIC_DEMO_WIFE_ID!
export const DEMO_HUSBAND_ID = process.env.NEXT_PUBLIC_DEMO_HUSBAND_ID!

export type MessageRole = 'husband' | 'wife'

export type UserProfile = {
  user_id: string
  role: MessageRole
  name?: string | null
  due_date?: string | null
  birth_date?: string | null
  status?: string | null
}

export type Message = {
  id: string
  from_role: MessageRole
  content: string
  created_at: string
}

export type DiaryEntry = {
  id: string
  title: string
  content: string
  summary?: string | null
  pregnancy_week: number | null
  baby_name: string | null
  source_summary?: string | null
  used_modes?: string[] | string | null
  created_at: string
  is_demo?: boolean
}

export type ModeRunDeviceResult = {
  device: string
  action: string
  label?: string
  status: 'actual' | 'mock' | 'planned'
  success?: boolean
  error?: string
  sceneName?: string
  simulationText?: string
}

export type ModeRun = {
  id: string
  user_id?: string
  mode: string
  mode_label: string
  created_at: string
  source?: string | null
  input_text?: string | null
  signals?: string[] | null
  reply?: string | null
  wife_card?: string | null
  husband_card?: string | null
  device_results?: ModeRunDeviceResult[] | null
}

export type UltrasoundRecord = {
  id: string
  user_id: string
  image_path: string
  weeks: number | null
  fruit_emoji: string
  fruit_name: string
  size_cm: number | null
  size_basis: string | null
  description: string
  ai_message?: string | null
  baby_voice_text?: string | null
  fruit_description?: string | null
  tts_audio_url?: string | null
  created_at: string
  /** 시연용 로컬 fallback */
  is_demo?: boolean
  local_image_url?: string
}
