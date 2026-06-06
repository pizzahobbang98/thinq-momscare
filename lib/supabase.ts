import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// 데모용 고정 ID (로그인 없이 사용)
export const DEMO_WIFE_ID    = process.env.NEXT_PUBLIC_DEMO_WIFE_ID!
export const DEMO_HUSBAND_ID = process.env.NEXT_PUBLIC_DEMO_HUSBAND_ID!