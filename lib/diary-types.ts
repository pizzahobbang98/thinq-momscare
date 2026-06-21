import type { DiaryEntry } from '@/lib/supabase'
import type { DiaryModeRun } from '@/lib/diary'

export type DiaryHubCareLogInput = DiaryModeRun

export type DiaryGenerateRequest = {
  pregnancyWeek?: number
  babyName?: string
  pregnancyStatus?: 'preparing' | 'pregnant'
  role?: 'wife' | 'husband'
  diaryDate?: string
  hubCareLogs?: DiaryHubCareLogInput[]
}

export type DiaryGenerateResponse = {
  success: boolean
  entry?: DiaryEntry
  savedToDb: boolean
  storage?: 'diary_entries' | 'symptom_logs' | null
  error?: string
}
