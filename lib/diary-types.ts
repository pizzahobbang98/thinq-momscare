import type { DiaryEntry } from '@/lib/supabase'

export type DiaryGenerateResponse = {
  success: boolean
  entry?: DiaryEntry
  savedToDb: boolean
  error?: string
}
