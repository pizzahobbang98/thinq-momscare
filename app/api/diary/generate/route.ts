import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { OPENAI_MODELS } from '@/lib/openai-models'
import { calculateCurrentWeeksFromDueDate } from '@/lib/pregnancy'
import {
  buildFallbackDiary,
  DIARY_SYSTEM_PROMPT,
  PREPARING_HUSBAND_DIARY_SYSTEM_PROMPT,
  PREPARING_DIARY_SYSTEM_PROMPT,
  PREGNANT_HUSBAND_DIARY_SYSTEM_PROMPT,
  getSevenDaysAgoISO,
  mergeDiaryModeRuns,
  parseGptDiaryResponse,
  type DiaryContext,
  type DiaryGenerateResult,
  type DiaryModeRun,
  type DiarySymptomLog,
  type DiaryDeviceEvent,
  type DiaryUltrasoundRecord,
  type DiaryMoodRecord,
} from '@/lib/diary'
import type { DiaryGenerateRequest, DiaryGenerateResponse } from '@/lib/diary-types'

const HUB_CONVERSATION_SOURCES = [
  'hub_voice',
  'hub_text',
  'voice',
  'text',
  'hub',
  'example_chip_mobile',
]

async function safeQuery<T>(label: string, query: PromiseLike<{ data: T | null; error: unknown }>) {
  try {
    const { data, error } = await query
    if (error) {
      console.warn(`${label} 조회 실패:`, error)
      return [] as unknown as T
    }
    return (data ?? []) as unknown as T
  } catch (error) {
    console.warn(`${label} 조회 예외:`, error)
    return [] as unknown as T
  }
}

function isPreparingModeRun(run: DiaryModeRun) {
  const signals = Array.isArray(run.signals) ? run.signals : []
  return signals.includes('상태:preparing') || signals.includes('임신 준비')
}

function modeRunMatchesRole(run: DiaryModeRun, role: 'wife' | 'husband') {
  const signals = Array.isArray(run.signals) ? run.signals : []
  if (role === 'husband') return signals.includes('역할:husband')
  return !signals.includes('역할:husband')
}

function shortText(value: string | null | undefined, maxLength = 120) {
  return (value ?? '')
    .replace(/ThinQ\s*Mom/gi, '')
    .replace(/ThinQ\s*ON/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function getDiaryReasoningEffort(model: string) {
  const gpt5Minor = /^gpt-5\.(\d+)/.exec(model)?.[1]
  return gpt5Minor && Number(gpt5Minor) >= 1 ? 'none' as const : 'low' as const
}

function buildFastDiaryPrompt(context: DiaryContext) {
  const recentUtterances = context.modeRuns
    .filter((run) => shortText(run.input_text))
    .slice(0, 4)
    .map((run) => ({
      at: run.created_at,
      mode: run.mode_label || run.mode,
      said: shortText(run.input_text, 110),
      reply: shortText(run.reply, 80),
      devices: (run.device_results ?? [])
        .slice(0, 2)
        .map((item) => `${item.device}/${item.action}`),
    }))

  const symptoms = context.symptomLogs
    .filter((log) => !['AUTO_DIARY', 'DIARY'].includes(log.parsed_category))
    .slice(0, 3)
    .map((log) => ({
      at: log.created_at,
      category: log.parsed_category,
      text: shortText(log.symptom_text, 90),
    }))

  const ultrasound = context.pregnancyStatus === 'pregnant'
    ? context.ultrasoundRecords.slice(0, 1).map((record) => ({
      at: record.created_at,
      weeks: record.weeks,
      fruit: record.fruit_name,
      note: shortText(record.diary_snippet ?? record.ai_message ?? record.description, 100),
    }))
    : []

  const moods = context.moods.slice(0, 2).map((mood) => ({
    at: mood.created_at,
    mood: `${mood.emoji} ${mood.mood}`,
  }))

  return JSON.stringify({
    instruction: '사용자 발화와 실행 기록을 바탕으로 오늘의 1인칭 일기를 JSON으로 작성하세요.',
    user: {
      pregnancyStatus: context.pregnancyStatus,
      role: context.role,
      pregnancyWeek: context.pregnancyStatus === 'pregnant' ? context.pregnancyWeek : null,
      babyName: context.pregnancyStatus === 'pregnant' ? context.babyName : null,
      cycleLength: context.pregnancyStatus === 'preparing' ? context.cycleLength ?? null : null,
      lastPeriodStartDate:
        context.pregnancyStatus === 'preparing' ? context.lastPeriodStartDate ?? null : null,
    },
    recentUtterances,
    symptoms,
    ultrasound,
    moods,
    required: {
      reflectUserUtterance: true,
      varyByPregnancyStatusAndRole: true,
      avoidMedicalJudgment: true,
      output: { title: 'string', content: '320~520 Korean chars', summary: 'string', usedModes: ['string'] },
    },
  })
}

type ExistingDiaryRow = {
  id: string
  created_at: string
  source_summary: string | null
  pregnancy_week: number | null
}

const PREPARING_FORBIDDEN_TERMS = [
  '아기',
  '태명',
  '태아',
  '아기 성장',
  '임신 주차',
  '16주',
  '초음파',
  '입덧',
  '태동',
  '출산',
  '산모',
  '분만',
  '태아 상태',
  '태아 성장',
]

function hasPreparingForbiddenTerms(value: string) {
  return PREPARING_FORBIDDEN_TERMS.some((term) => value.includes(term))
}

function enforceDiaryStatusRules(
  generated: DiaryGenerateResult,
  context: DiaryContext,
): DiaryGenerateResult {
  const text = [generated.title, generated.content, generated.summary, generated.usedModes.join(' ')].join('\n')
  if (text.includes('ThinQ Mom') || text.includes('엄복동')) return buildFallbackDiary(context)
  if (context.pregnancyStatus !== 'preparing') return generated
  return hasPreparingForbiddenTerms(text) ? buildFallbackDiary(context) : generated
}

function getKoreaDiaryDateKey(value?: string | null) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return year && month && day ? `${year}-${month}-${day}` : new Date().toISOString().slice(0, 10)
}

function getKoreaDateUtcRange(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00+09:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

function parseSourceSummary(value: string | null | undefined) {
  try {
    return value ? JSON.parse(value) as { pregnancyStatus?: string; role?: string; diaryDate?: string } : {}
  } catch {
    return {}
  }
}

function existingDiaryMatchesContext(
  row: ExistingDiaryRow,
  options: {
    pregnancyStatus: 'preparing' | 'pregnant'
    role: 'wife' | 'husband'
    pregnancyWeek: number | null
    diaryDate: string
  },
) {
  const source = parseSourceSummary(row.source_summary)
  const rowStatus = source.pregnancyStatus === 'preparing'
    ? 'preparing'
    : source.pregnancyStatus === 'pregnant'
      ? 'pregnant'
      : row.pregnancy_week === null
        ? 'preparing'
        : 'pregnant'
  const rowRole = source.role === 'husband' ? 'husband' : 'wife'
  const sourceDateMatches = source.diaryDate === undefined || source.diaryDate === options.diaryDate
  const weekMatches =
    options.pregnancyStatus === 'preparing' ||
    row.pregnancy_week === options.pregnancyWeek ||
    row.pregnancy_week === null ||
    options.pregnancyWeek === null

  return (
    rowStatus === options.pregnancyStatus &&
    rowRole === options.role &&
    sourceDateMatches &&
    weekMatches
  )
}

async function persistGeneratedDiary(options: {
  supabaseUrl: string
  supabaseKey: string
  demoWifeId: string
  generated: DiaryGenerateResult
  pregnancyWeek: number | null
  babyName: string | null
  pregnancyStatus: 'preparing' | 'pregnant'
  role: 'wife' | 'husband'
  diaryDate: string
}): Promise<{ id: string; created_at: string; storage: 'diary_entries' | 'symptom_logs' } | null> {
  try {
    const supabase = createClient(options.supabaseUrl, options.supabaseKey)
    const sourcePayload = JSON.stringify({
      summary: options.generated.summary,
      ...JSON.parse(options.generated.sourceSummary),
      pregnancyStatus: options.pregnancyStatus,
      role: options.role,
      diaryDate: options.diaryDate,
      demoUserId: options.demoWifeId,
      source: 'ai_diary',
      generatedBy: 'ai_diary_generate',
      createdByAction: 'manual_update',
      isSeed: false,
      isAutoGenerated: false,
    })

    const baseRecord = {
      user_id: options.demoWifeId,
      title: options.generated.title,
      content: options.generated.content,
      pregnancy_week: options.pregnancyWeek,
      baby_name: options.babyName,
      source_summary: sourcePayload,
      used_modes: options.generated.usedModes,
    }

    const { startIso, endIso } = getKoreaDateUtcRange(options.diaryDate)
    const existingResult = await supabase
      .from('diary_entries')
      .select('id, created_at, source_summary, pregnancy_week')
      .eq('user_id', options.demoWifeId)
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(30)

    const existing = ((existingResult.data ?? []) as ExistingDiaryRow[]).find((row) =>
      existingDiaryMatchesContext(row, {
        pregnancyStatus: options.pregnancyStatus,
        role: options.role,
        pregnancyWeek: options.pregnancyWeek,
        diaryDate: options.diaryDate,
      }),
    )

    if (existing) {
      const updateResult = await supabase
        .from('diary_entries')
        .update(baseRecord)
        .eq('id', existing.id)
        .eq('user_id', options.demoWifeId)
        .select('id, created_at')
        .single()

      if (!updateResult.error) {
        console.log(`[ai-diary] upsert update diary_entries id=${existing.id} date=${options.diaryDate}`)
        return {
          id: String(updateResult.data.id),
          created_at: String(updateResult.data.created_at),
          storage: 'diary_entries',
        }
      }

      console.warn('diary_entries 업데이트 실패, insert fallback 시도:', updateResult.error.message)
    }

    const insertResult = await supabase
      .from('diary_entries')
      .insert(baseRecord)
      .select('id, created_at')
      .single()

    if (insertResult.error) {
      console.warn('diary_entries 저장 실패, symptom_logs fallback 시도:', insertResult.error.message)
      const existingFallbackResult = await supabase
        .from('symptom_logs')
        .select('id, created_at')
        .eq('user_id', options.demoWifeId)
        .eq('parsed_category', 'AUTO_DIARY')
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const fallbackResult = existingFallbackResult.data?.id
        ? await supabase.from('symptom_logs')
          .update({
            symptom_text: options.generated.content,
            parsed_category: 'AUTO_DIARY',
          })
          .eq('id', existingFallbackResult.data.id)
          .eq('user_id', options.demoWifeId)
          .select('id, created_at')
          .single()
        : await supabase.from('symptom_logs').insert({
          user_id: options.demoWifeId,
          symptom_text: options.generated.content,
          parsed_category: 'AUTO_DIARY',
        })
          .select('id, created_at')
          .single()

      if (fallbackResult.error) {
        console.warn('AUTO_DIARY fallback 저장 실패:', fallbackResult.error.message)
        return null
      }

      return {
        id: String(fallbackResult.data.id),
        created_at: String(fallbackResult.data.created_at),
        storage: 'symptom_logs',
      }
    }

    return {
      id: String(insertResult.data.id),
      created_at: String(insertResult.data.created_at),
      storage: 'diary_entries',
    }
  } catch (error) {
    console.warn('다이어리 백그라운드 저장 실패:', error)
    return null
  }
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID
  const apiKey = process.env.OPENAI_API_KEY

  let pregnancyWeek: number | null = null
  let babyName: string | null = null
  let pregnancyStatus: 'preparing' | 'pregnant' = 'pregnant'
  let role: 'wife' | 'husband' = 'wife'
  let diaryDate = getKoreaDiaryDateKey()
  let cycleLength: number | null = null
  let lastPeriodStartDate: string | null = null

  try {
    const body = (await request.json().catch(() => ({}))) as DiaryGenerateRequest
    pregnancyStatus = body.pregnancyStatus === 'preparing' ? 'preparing' : 'pregnant'
    role = body.role === 'husband' ? 'husband' : 'wife'
    diaryDate = getKoreaDiaryDateKey(body.diaryDate)
    cycleLength =
      typeof body.cycleLength === 'number' && Number.isFinite(body.cycleLength)
        ? Math.min(99, Math.max(1, Math.round(body.cycleLength)))
        : null
    lastPeriodStartDate =
      typeof body.lastPeriodStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.lastPeriodStartDate)
        ? body.lastPeriodStartDate
        : null

    if (body.pregnancyWeek && body.pregnancyWeek >= 1 && body.pregnancyWeek <= 42) {
      pregnancyWeek = Math.round(body.pregnancyWeek)
    }
    babyName = body.babyName?.trim() || null

    const requestStartedAt = Date.now()
    const contextStartedAt = Date.now()
    const since = getSevenDaysAgoISO()
    const supabase =
      supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

    let modeRuns: DiaryModeRun[] = []
    let symptomLogs: DiarySymptomLog[] = []
    let deviceEvents: DiaryDeviceEvent[] = []
    let ultrasoundRecords: DiaryUltrasoundRecord[] = []
    let moods: DiaryMoodRecord[] = []

    const clientHubCareLogs = (body.hubCareLogs ?? []).filter(
      (run) => run?.mode && run?.created_at,
    )
    const scopedClientHubCareLogs = clientHubCareLogs.filter((run) =>
      (pregnancyStatus === 'preparing' ? isPreparingModeRun(run) : !isPreparingModeRun(run))
      && modeRunMatchesRole(run, role),
    )

    if (supabase && demoWifeId) {
      const needsProfile = (pregnancyStatus === 'pregnant' && !pregnancyWeek) || !babyName
      const profilePromise = needsProfile
        ? supabase
          .from('users')
          .select('due_date, name')
          .eq('role', 'wife')
          .maybeSingle()
        : Promise.resolve({ data: null, error: null })

      const [
        profileResult,
        remoteModeRuns,
        remoteSymptomLogs,
        remoteDeviceEvents,
        remoteUltrasoundRecords,
        remoteMoods,
      ] = await Promise.all([
        profilePromise,
        safeQuery<DiaryModeRun[]>('mode_runs', supabase
          .from('mode_runs')
          .select(
            'mode, mode_label, input_text, signals, reply, wife_card, husband_card, device_results, created_at',
          )
          .in('source', HUB_CONVERSATION_SOURCES)
          .not('input_text', 'is', null)
          .neq('input_text', '')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10)),
        safeQuery<DiarySymptomLog[]>('symptom_logs', supabase
          .from('symptom_logs')
          .select('symptom_text, parsed_category, severity, created_at')
          .eq('user_id', demoWifeId)
          .gte('created_at', since)
          .neq('parsed_category', 'AUTO_DIARY')
          .order('created_at', { ascending: false })
          .limit(5)),
        safeQuery<DiaryDeviceEvent[]>('device_events', supabase
          .from('device_events')
          .select('event_type, triggered_by, device_status, created_at')
          .eq('user_id', demoWifeId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(4)),
        pregnancyStatus === 'pregnant'
          ? safeQuery<DiaryUltrasoundRecord[]>('ultrasound_records', supabase
            .from('ultrasound_records')
            .select('fruit_name, weeks, description, ai_message, diary_snippet, created_at')
            .eq('user_id', demoWifeId)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(2))
          : Promise.resolve([]),
        safeQuery<DiaryMoodRecord[]>('moods', supabase
          .from('moods')
          .select('mood, emoji, created_at')
          .eq('user_id', demoWifeId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(3)),
      ])

      if (profileResult.error) {
        console.warn('공유 임신 프로필 조회 실패:', profileResult.error)
      }
      if (profileResult.data?.due_date && pregnancyStatus === 'pregnant' && !pregnancyWeek) {
        pregnancyWeek = calculateCurrentWeeksFromDueDate(profileResult.data.due_date)
      }
      if (profileResult.data?.name && !babyName) {
        babyName = profileResult.data.name.trim() || null
      }

      const statusScopedRemoteRuns = remoteModeRuns.filter((run) =>
        (pregnancyStatus === 'preparing' ? isPreparingModeRun(run) : !isPreparingModeRun(run))
        && modeRunMatchesRole(run, role),
      )
      modeRuns = mergeDiaryModeRuns(statusScopedRemoteRuns, scopedClientHubCareLogs)
      symptomLogs = remoteSymptomLogs
      deviceEvents = remoteDeviceEvents
      ultrasoundRecords = remoteUltrasoundRecords
      moods = remoteMoods
    } else if (scopedClientHubCareLogs.length > 0) {
      modeRuns = mergeDiaryModeRuns([], scopedClientHubCareLogs)
    }
    console.log(`[ai-diary] fetch context ${Date.now() - contextStartedAt}ms`)

    const context: DiaryContext = {
      pregnancyStatus,
      role,
      pregnancyWeek: pregnancyStatus === 'pregnant' ? pregnancyWeek : null,
      babyName: pregnancyStatus === 'pregnant' ? babyName : null,
      cycleLength,
      lastPeriodStartDate,
      modeRuns,
      symptomLogs,
      deviceEvents,
      ultrasoundRecords: pregnancyStatus === 'pregnant' ? ultrasoundRecords : [],
      moods,
    }

    let generated: DiaryGenerateResult = buildFallbackDiary(context)

    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey })
        const openaiStartedAt = Date.now()
        const completion = await openai.chat.completions.create({
          model: OPENAI_MODELS.text,
          messages: [
            {
              role: 'system',
              content: pregnancyStatus === 'preparing'
                ? role === 'husband'
                  ? PREPARING_HUSBAND_DIARY_SYSTEM_PROMPT
                  : PREPARING_DIARY_SYSTEM_PROMPT
                : role === 'husband'
                  ? PREGNANT_HUSBAND_DIARY_SYSTEM_PROMPT
                  : DIARY_SYSTEM_PROMPT,
            },
            { role: 'user', content: buildFastDiaryPrompt(context) },
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 520,
          reasoning_effort: getDiaryReasoningEffort(OPENAI_MODELS.text),
          verbosity: 'low',
        })
        console.log(`[ai-diary] openai ${Date.now() - openaiStartedAt}ms`)

        const content = completion.choices[0]?.message?.content
        if (content) {
          const parsed = parseGptDiaryResponse(content, context)
          if (parsed) generated = parsed
        }
      } catch (error) {
        console.warn('GPT 다이어리 생성 실패, fallback 사용:', error)
      }
    }
    generated = enforceDiaryStatusRules(generated, context)

    const saveStartedAt = Date.now()
    const persisted = supabaseUrl && supabaseKey && demoWifeId
      ? await persistGeneratedDiary({
        supabaseUrl,
        supabaseKey,
        demoWifeId,
        generated,
        pregnancyWeek,
        babyName: pregnancyStatus === 'pregnant' ? babyName : null,
        pregnancyStatus,
        role,
        diaryDate,
      })
      : null
    console.log(`[ai-diary] save ${Date.now() - saveStartedAt}ms`)

    const response: DiaryGenerateResponse = {
      success: true,
      entry: {
        id: persisted?.id ?? `demo-${Date.now()}`,
        title: generated.title,
        content: generated.content,
        summary: generated.summary,
        pregnancy_week: pregnancyStatus === 'pregnant' ? pregnancyWeek : null,
        baby_name: pregnancyStatus === 'pregnant' ? babyName : null,
        source_summary: JSON.stringify({
          ...parseSourceSummary(generated.sourceSummary),
          pregnancyStatus,
          role,
          diaryDate,
          demoUserId: demoWifeId ?? null,
          source: 'ai_diary',
          generatedBy: 'ai_diary_generate',
          createdByAction: 'manual_update',
          isSeed: false,
          isAutoGenerated: false,
        }),
        used_modes: generated.usedModes,
        created_at: persisted?.created_at ?? new Date().toISOString(),
        created_by_action: 'manual_update',
        generated_by: 'ai_diary_generate',
        source: 'ai_diary',
        is_seed: false,
        is_auto_generated: false,
        is_demo: !persisted,
      },
      savedToDb: persisted?.storage === 'diary_entries',
      storage: persisted?.storage ?? null,
    }

    console.log(`[ai-diary] total ${Date.now() - requestStartedAt}ms`)
    return NextResponse.json(response)
  } catch (error) {
    console.error('다이어리 generate API 처리 실패:', error)

    const fallbackContext: DiaryContext = {
      pregnancyStatus,
      role,
      pregnancyWeek: pregnancyStatus === 'pregnant' ? pregnancyWeek : null,
      babyName: pregnancyStatus === 'pregnant' ? babyName : null,
      cycleLength,
      lastPeriodStartDate,
      modeRuns: [],
      symptomLogs: [],
      deviceEvents: [],
      ultrasoundRecords: [],
      moods: [],
    }
    const fallback = buildFallbackDiary(fallbackContext)

    const response: DiaryGenerateResponse = {
      success: true,
      entry: {
        id: `demo-${Date.now()}`,
        title: fallback.title,
        content: fallback.content,
        summary: fallback.summary,
        pregnancy_week: pregnancyStatus === 'pregnant' ? pregnancyWeek : null,
        baby_name: pregnancyStatus === 'pregnant' ? babyName : null,
        source_summary: JSON.stringify({
          ...parseSourceSummary(fallback.sourceSummary),
          pregnancyStatus,
          role,
          diaryDate,
          demoUserId: demoWifeId ?? null,
          source: 'ai_diary',
          generatedBy: 'ai_diary_generate',
          createdByAction: 'manual_update',
          isSeed: false,
          isAutoGenerated: false,
        }),
        used_modes: fallback.usedModes,
        created_at: new Date().toISOString(),
        created_by_action: 'manual_update',
        generated_by: 'ai_diary_generate',
        source: 'ai_diary',
        is_seed: false,
        is_auto_generated: false,
        is_demo: true,
      },
      savedToDb: false,
      storage: null,
      error: '일부 기능을 시연용 기본값으로 대체했어요.',
    }

    return NextResponse.json(response)
  }
}

export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

  if (!supabaseUrl || !supabaseKey || !demoWifeId) {
    return NextResponse.json({ success: false, error: 'Supabase is not configured.' }, { status: 503 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string
      storage?: 'diary_entries' | 'symptom_logs' | null
    }
    const id = body.id?.trim()

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 일기 id가 없습니다.' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const storage = body.storage ?? 'diary_entries'

    if (storage === 'symptom_logs') {
      const { error } = await supabase
        .from('symptom_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', demoWifeId)
        .eq('parsed_category', 'AUTO_DIARY')

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', demoWifeId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.warn('생성된 오늘 다이어리 삭제 실패:', error)
    return NextResponse.json({ success: false, error: '일기 삭제 실패' }, { status: 500 })
  }
}
