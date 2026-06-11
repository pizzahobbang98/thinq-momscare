import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { seedDemoData } from '@/lib/demo-seed'

const CHECKUP_SCHEDULE = [
  { week: 6, title: '첫 초음파', memo: '심박 확인' },
  { week: 11, title: '1차 기형아 검사', memo: 'NT 검사 (목덜미 투명대)' },
  { week: 16, title: '2차 기형아 검사', memo: '쿼드 검사 (AFP)' },
  { week: 20, title: '정밀 초음파', memo: '태아 기형 정밀 검사' },
  { week: 24, title: '임신성 당뇨 검사', memo: '50g 당부하 검사' },
  { week: 28, title: '빈혈·철분 검사', memo: '철분제 처방' },
  { week: 32, title: '태아 성장 초음파', memo: '태아 위치·체중 확인' },
  { week: 36, title: 'GBS 검사', memo: '분만 준비 시작' },
  { week: 38, title: '정기검진 (38주)', memo: '매주 정기검진 시작' },
  { week: 39, title: '정기검진 (39주)', memo: '' },
  { week: 40, title: '정기검진 (40주)', memo: '예정일' },
] as const

const AI_HOSPITAL_LABEL = 'AI 자동 생성'

const PRENATAL_CHECKUP = [
  { daysFromNow: 7, title: '기초 혈액검사', memo: '임신 전 건강 확인' },
  { daysFromNow: 14, title: '자궁경부암 검사', memo: '산전 기본 검사' },
  { daysFromNow: 21, title: '갑상선 기능 검사', memo: '임신 준비 필수 검사' },
  { daysFromNow: 30, title: '풍진 항체 검사', memo: '임신 전 예방접종 확인' },
] as const

type SetupStatus = 'pregnant' | 'preparing'

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

function toLocalDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function calculateDueDate(weeks: number) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (40 - weeks) * 7)
  return dueDate.toISOString().split('T')[0]
}

async function clearExistingData(
  supabase: SupabaseClient,
  wifeId: string,
): Promise<boolean> {
  const today = getTodayDateString()
  let allSucceeded = true

  const steps: { table: string; run: () => PromiseLike<{ error: unknown }> }[] = [
    {
      table: 'alerts',
      run: () => supabase.from('alerts').delete().eq('from_role', 'wife'),
    },
    {
      table: 'hearts',
      run: () =>
        supabase.from('hearts').delete().or('from_role.eq.husband,from_role.eq.wife'),
    },
    {
      table: 'messages',
      run: () =>
        supabase.from('messages').delete().or('from_role.eq.husband,from_role.eq.wife'),
    },
    {
      table: 'moods',
      run: () => supabase.from('moods').delete().eq('user_id', wifeId),
    },
    {
      table: 'symptom_logs',
      run: () => supabase.from('symptom_logs').delete().eq('user_id', wifeId),
    },
    {
      table: 'mode_runs',
      run: () => supabase.from('mode_runs').delete().eq('user_id', wifeId),
    },
    {
      table: 'device_events',
      run: () => supabase.from('device_events').delete().eq('user_id', wifeId),
    },
    {
      table: 'daily_cards',
      run: () => supabase.from('daily_cards').delete().lte('card_date', today),
    },
    {
      table: 'appointments',
      run: () => supabase.from('appointments').delete().eq('user_id', wifeId),
    },
  ]

  for (const step of steps) {
    try {
      const { error } = await step.run()
      if (error) {
        console.error(`[setup] ${step.table} 삭제 실패:`, error)
        allSucceeded = false
      } else {
        console.log(`[setup] ${step.table} 삭제 완료`)
      }
    } catch (error) {
      console.error(`[setup] ${step.table} 삭제 처리 실패:`, error)
      allSucceeded = false
    }
  }

  return allSucceeded
}

async function generateCheckupAppointments(
  supabase: SupabaseClient,
  weeks: number,
  wifeId: string,
): Promise<number> {
  try {
    const today = new Date()
    const appointmentsToInsert = CHECKUP_SCHEDULE.filter((checkup) => checkup.week > weeks).map(
      (checkup) => {
        const daysUntil = (checkup.week - weeks) * 7
        const checkupDate = new Date(today)
        checkupDate.setDate(today.getDate() + daysUntil)

        return {
          user_id: wifeId,
          title: checkup.title,
          hospital: AI_HOSPITAL_LABEL,
          memo: checkup.memo || null,
          appointment_date: toLocalDateString(checkupDate),
        }
      },
    )

    if (appointmentsToInsert.length === 0) {
      return 0
    }

    const { error: insertError } = await supabase
      .from('appointments')
      .insert(appointmentsToInsert)

    if (insertError) {
      console.error('AI 검진 일정 생성 실패:', insertError)
      return 0
    }

    return appointmentsToInsert.length
  } catch (error) {
    console.error('AI 검진 일정 생성 처리 실패:', error)
    return 0
  }
}

async function generatePrenatalCheckupAppointments(
  supabase: SupabaseClient,
  wifeId: string,
): Promise<number> {
  try {
    const today = new Date()
    const appointmentsToInsert = PRENATAL_CHECKUP.map((checkup) => {
      const checkupDate = new Date(today)
      checkupDate.setDate(today.getDate() + checkup.daysFromNow)

      return {
        user_id: wifeId,
        title: checkup.title,
        hospital: AI_HOSPITAL_LABEL,
        memo: checkup.memo,
        appointment_date: toLocalDateString(checkupDate),
      }
    })

    const { error: insertError } = await supabase
      .from('appointments')
      .insert(appointmentsToInsert)

    if (insertError) {
      console.error('산전검사 일정 생성 실패:', insertError)
      return 0
    }

    return appointmentsToInsert.length
  } catch (error) {
    console.error('산전검사 일정 생성 처리 실패:', error)
    return 0
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('필수 환경 변수가 설정되지 않았습니다.')
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    const body = (await request.json()) as {
      weeks?: number
      status?: string
      role?: string
      birthDate?: string
      babyName?: string
    }
    const status: SetupStatus = body.status === 'preparing' ? 'preparing' : 'pregnant'
    const weeks = body.weeks

    if (status === 'pregnant') {
      if (
        weeks === undefined ||
        !Number.isInteger(weeks) ||
        weeks < 1 ||
        weeks > 42
      ) {
        return NextResponse.json({ error: '유효한 임신 주차가 필요합니다.' }, { status: 400 })
      }
    } else if (weeks !== undefined && (!Number.isInteger(weeks) || weeks < 0 || weeks > 42)) {
      return NextResponse.json({ error: '유효하지 않은 주차 값입니다.' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const wifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

    if (!wifeId) {
      console.error('NEXT_PUBLIC_DEMO_WIFE_ID가 설정되지 않았습니다.')
    } else {
      await clearExistingData(supabase, wifeId)
    }

    if (status === 'pregnant' && weeks !== undefined) {
      const dueDate = calculateDueDate(weeks)
      const profileUpdate: Record<string, string> = { due_date: dueDate, status: 'pregnant' }
      if (body.babyName?.trim()) {
        profileUpdate.name = body.babyName.trim()
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(profileUpdate)
        .eq('role', 'wife')

      if (updateError) {
        console.warn('[setup] due_date/name/status 업데이트 실패:', updateError)
      }

      if (wifeId) {
        await seedDemoData(supabase, weeks, wifeId)
      }
    } else if (wifeId) {
      const { error: preparingUpdateError } = await supabase
        .from('users')
        .update({ status: 'preparing' })
        .eq('role', 'wife')

      if (preparingUpdateError) {
        console.warn('[setup] preparing status 업데이트 실패:', preparingUpdateError)
      }
    }

    if (body.role === 'wife' || body.role === 'husband') {
      const demoRoleId =
        body.role === 'wife'
          ? process.env.NEXT_PUBLIC_DEMO_WIFE_ID
          : process.env.NEXT_PUBLIC_DEMO_HUSBAND_ID

      if (demoRoleId && body.birthDate) {
        const { error: profileError } = await supabase
          .from('users')
          .update({ birth_date: body.birthDate })
          .eq('user_id', demoRoleId)

        if (profileError) {
          console.warn('[setup] birth_date 업데이트 실패:', profileError)
        }
      }
    }

    let checkupsCreated = 0
    if (wifeId) {
      checkupsCreated =
        status === 'preparing'
          ? await generatePrenatalCheckupAppointments(supabase, wifeId)
          : await generateCheckupAppointments(supabase, weeks!, wifeId)
    }

    return NextResponse.json({ success: true, checkupsCreated, dataCleared: true, status })
  } catch (error) {
    console.error('온보딩 설정 API 처리 실패:', error)
    return NextResponse.json({ error: '설정 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
