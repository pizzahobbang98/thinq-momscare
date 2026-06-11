import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { hubModeToSimulationRoutine } from '@/lib/simulation-routine-bridge'

const HUB_EXECUTION_SOURCES = ['hub_voice', 'hub_text', 'voice', 'text', 'hub']

type LatestModeRun = {
  id: string
  mode: string
  mode_label: string | null
  input_text: string | null
  source: string | null
  created_at: string
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

  if (!supabaseUrl || !supabaseKey || !demoWifeId) {
    return NextResponse.json(
      { error: '공유 시연 상태 서버 설정이 필요합니다.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('mode_runs')
    .select('id, mode, mode_label, input_text, source, created_at')
    .eq('user_id', demoWifeId)
    .in('source', HUB_EXECUTION_SOURCES)
    .not('input_text', 'is', null)
    .neq('input_text', '')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<LatestModeRun>()

  if (error) {
    console.warn('[demo-state] latest mode_runs 조회 실패:', error)
    return NextResponse.json(
      { error: '최신 케어 상태를 불러오지 못했습니다.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (!data) {
    return NextResponse.json(
      { state: null },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const routineId = hubModeToSimulationRoutine(data.mode, {
    inputText: data.input_text ?? undefined,
  })

  return NextResponse.json(
    {
      state: {
        id: data.id,
        mode: data.mode,
        modeLabel: data.mode_label,
        routineId,
        source: data.source,
        createdAt: data.created_at,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
