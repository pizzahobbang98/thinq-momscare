export type DiaryModeRun = {
  mode: string
  mode_label: string
  input_text?: string | null
  signals?: string[] | null
  reply?: string | null
  wife_card?: string | null
  husband_card?: string | null
  device_results?:
    | {
        device: string
        action: string
        label?: string
        status?: string
      }[]
    | null
  created_at: string
}

export type DiarySymptomLog = {
  symptom_text: string
  parsed_category: string
  severity?: number | null
  created_at: string
}

export type DiaryDeviceEvent = {
  event_type: string
  triggered_by: string
  device_status?: Record<string, unknown> | null
  created_at: string
}

export type DiaryUltrasoundRecord = {
  fruit_name: string
  weeks: number | null
  description?: string | null
  ai_message?: string | null
  diary_snippet?: string | null
  created_at: string
}

export type DiaryMoodRecord = {
  mood: string
  emoji: string
  created_at: string
}

export type DiaryContext = {
  pregnancyStatus: 'preparing' | 'pregnant'
  role: 'wife' | 'husband'
  pregnancyWeek: number | null
  babyName: string | null
  modeRuns: DiaryModeRun[]
  symptomLogs: DiarySymptomLog[]
  deviceEvents: DiaryDeviceEvent[]
  ultrasoundRecords: DiaryUltrasoundRecord[]
  moods: DiaryMoodRecord[]
}

export type DiaryGenerateResult = {
  title: string
  content: string
  summary: string
  usedModes: string[]
  sourceSummary: string
}

export const DIARY_SYSTEM_PROMPT = `너는 임산부의 하루를 대신 정리해주는 따뜻한 다이어리 작성 도우미입니다.
아래 최근 7일 상태 기록, 허브 대화 기록, 케어 모드 실행 기록, 가전 실행 기록을 바탕으로
임산부가 직접 쓴 것 같은 1인칭 다이어리를 작성하세요.

조건:
- 한국어
- 1인칭
- 따뜻하지만 과하지 않게
- 보고서나 분석문처럼 쓰지 말 것
- 'AI가', '시스템이', '데이터에 따르면', '분석', 'Mother Together' 같은 표현 금지
- 제품명(ThinQ ON, ThinQ Mom 등)은 직접 언급하지 말 것 (광고처럼 보이지 않게, 그냥 공기청정기·조명·화면 같은 일상 표현으로)
- 임신 주차와 태명을 자연스럽게 한 번만 언급
- 오늘 실행된 모드가 있으면 자연스럽게 포함
- 공기청정기·조명·화면이 도와준 느낌은 제품명 없이 자연스럽게 포함
- 남편에게 공유된 행동 제안은 직접 노출하지 말고, '고마운 배려를 기대하게 되었다' 정도로 순화
- 초음파 기록이 있으면 감성적으로 한 줄만 포함 (의학적 크기·수치·CRL/BPD/FL 표현 금지)
- 성장 기록용 해석만 사용하고 의료적 판단처럼 보이는 표현 금지
- '내일은 오늘보다 조금 더 편안한 하루가 되었으면', '혼자 다 챙기지 않아도 된다는 느낌', '오늘도 잘 버텼다' 같은 뻔하고 상투적인 마무리 문장은 쓰지 말 것 (그날 있었던 구체적인 일로 자연스럽게 끝낼 것)
- 500~800자 정도

반환 JSON:
{
  "title": "짧은 다이어리 제목",
  "content": "다이어리 본문",
  "summary": "한 줄 요약",
  "usedModes": ["입덧모드", "수면모드"]
}`

export const PREPARING_DIARY_SYSTEM_PROMPT = `너는 임신을 준비하는 사용자의 하루를 따뜻하게 정리하는 다이어리 작성 도우미입니다.
최근 허브 대화, 실행 모드, 가전 작동 기록을 바탕으로 사용자가 직접 쓴 것 같은 1인칭 다이어리를 작성하세요.

조건:
- 한국어, 1인칭, 따뜻하지만 과하지 않게
- 보고서나 데이터 분석문처럼 쓰지 말 것
- 임신이 이미 되었다거나 아기가 있다고 단정하지 말 것
- 허브에서 말한 상황과 실제 실행된 공기청정기, 조명, 화면 모드를 자연스럽게 포함
- 부부가 함께 준비하는 역할이면 서로의 배려와 생활 리듬을 자연스럽게 포함
- 제품명(ThinQ ON, ThinQ Mom 등)은 직접 언급하지 말 것 (광고처럼 보이지 않게)
- 400~700자 정도

반환 JSON:
{
  "title": "짧은 다이어리 제목",
  "content": "다이어리 본문",
  "summary": "한 줄 요약",
  "usedModes": ["수면 리듬", "마음 환기"]
}`

export const PREGNANT_HUSBAND_DIARY_SYSTEM_PROMPT = `너는 임신중인 배우자를 곁에서 돌보는 남편의 하루를 따뜻하게 정리하는 다이어리 작성 도우미입니다.
최근 허브 대화, 실행된 케어 모드, 가전 작동 기록과 성장 기록을 바탕으로 남편이 직접 쓴 것 같은 1인칭 다이어리를 작성하세요.

조건:
- 한국어, 남편의 1인칭 관점
- 배우자의 컨디션을 살피고 함께 준비한 기록처럼 작성
- 남편이 입덧이나 임신 증상을 직접 겪은 것처럼 쓰지 말 것
- 기술 로그나 보고서처럼 쓰지 말 것
- 공기청정기, 스탠바이미, 조명의 변화는 배우자가 편안해진 장면으로 자연스럽게 표현
- 임신 주차와 성장 기록이 있으면 자연스럽게 한 번만 포함
- 제품명(ThinQ ON, ThinQ Mom 등)은 직접 언급하지 말 것 (광고처럼 보이지 않게)
- '내일도 같은 편에서', '곁을 지키고 싶다' 같은 뻔하고 상투적인 마무리 문장은 쓰지 말 것 (그날 있었던 구체적인 일로 자연스럽게 끝낼 것)
- 500~800자 정도

반환 JSON:
{
  "title": "짧은 다이어리 제목",
  "content": "다이어리 본문",
  "summary": "한 줄 요약",
  "usedModes": ["입덧모드", "수면모드"]
}`

const MODE_SNIPPETS: Record<string, string> = {
  NAUSEA_MODE:
    '오늘은 냄새가 유난히 크게 느껴지는 순간이 있었다. 그래도 공기청정기가 공기를 먼저 바꿔주니까 조금은 안심이 됐다.',
  SLEEP_MODE:
    '몸이 금방 무거워져서 오늘은 일찍 쉬고 싶은 마음이 컸다. 잠들기 좋은 환경이 미리 준비되는 느낌이 위로가 됐다.',
  TRAVEL_MODE:
    '집에만 있는 시간이 답답하게 느껴졌는데, 잠깐이라도 다른 장소에 온 것 같은 분위기가 만들어져 기분이 조금 풀렸다.',
  HOUSEWORK_MODE:
    '해야 할 집안일이 눈에 보였지만 오늘은 무리하지 않기로 했다. 지금 당장 움직이지 않아도 된다는 게 생각보다 큰 위로가 됐다.',
  AIR_ON:
    '공기가 정리되는 느낌 덕분에 집 안이 조금 더 편안하게 느껴졌다.',
  AIR_OFF:
    '공기가 정리되는 느낌 덕분에 집 안이 조금 더 편안하게 느껴졌다.',
  MORNING_BRIEFING:
    '아침에 오늘의 상태를 차분히 듣고 나니 하루를 조금 더 천천히 시작할 수 있었다.',
}

const MODE_LABELS: Record<string, string> = {
  NAUSEA_MODE: '입덧모드',
  SLEEP_MODE: '수면모드',
  TRAVEL_MODE: '휴양지모드',
  HOUSEWORK_MODE: '가사케어 모드',
  AIR_ON: '공기청정',
  AIR_OFF: '공기청정',
  MORNING_BRIEFING: '굿모닝 브리핑',
}

const SKIP_MODES = new Set(['UNKNOWN'])

export function getSevenDaysAgoISO() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
}

export function getTodayStartISO() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

function isToday(iso: string) {
  return new Date(iso).getTime() >= new Date(getTodayStartISO()).getTime()
}

export function mergeDiaryModeRuns(
  remoteRuns: DiaryModeRun[],
  localRuns: DiaryModeRun[],
): DiaryModeRun[] {
  const remoteKeys = new Set(
    remoteRuns.map((run) => `${run.created_at}|${run.mode}|${run.input_text ?? ''}`),
  )
  const localOnly = localRuns.filter(
    (run) => !remoteKeys.has(`${run.created_at}|${run.mode}|${run.input_text ?? ''}`),
  )

  return [...remoteRuns, ...localOnly]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function collectUsedModeLabels(modeRuns: DiaryModeRun[]) {
  const labels = new Set<string>()
  for (const run of modeRuns) {
    if (SKIP_MODES.has(run.mode)) continue
    labels.add(run.mode_label?.trim() || MODE_LABELS[run.mode] || run.mode)
  }
  return Array.from(labels)
}

function formatDeviceResultsFromRuns(modeRuns: DiaryModeRun[]) {
  const actions: string[] = []
  for (const run of modeRuns) {
    for (const result of run.device_results ?? []) {
      if (result.status === 'actual' || !result.status) {
        actions.push(`${result.device} ${result.action}`)
      }
    }
  }
  return actions
}

export function buildDiarySourceSummary(context: DiaryContext) {
  const todayRuns = context.modeRuns.filter((run) => isToday(run.created_at))
  const symptomCategories = [
    ...new Set(
      context.symptomLogs
        .filter((log) => !['AUTO_DIARY', 'DIARY'].includes(log.parsed_category))
        .map((log) => log.parsed_category),
    ),
  ]

  return JSON.stringify({
    pregnancyStatus: context.pregnancyStatus,
    role: context.role,
    pregnancyWeek: context.pregnancyWeek,
    babyName: context.babyName,
    modeRunCount: context.modeRuns.length,
    todayModeCount: todayRuns.length,
    symptomCount: context.symptomLogs.length,
    deviceEventCount: context.deviceEvents.length,
    ultrasoundCount: context.ultrasoundRecords.length,
    moodCount: context.moods.length,
    usedModes: collectUsedModeLabels(context.modeRuns),
    symptomCategories,
    deviceActions: formatDeviceResultsFromRuns(context.modeRuns),
  })
}

export function buildGptUserPrompt(context: DiaryContext) {
  const lines: string[] = []

  lines.push(`사용자 상태: ${context.pregnancyStatus === 'preparing' ? '임신 준비중' : '임신중'}`)
  lines.push(`역할: ${context.role === 'husband' ? '남편' : '아내'}`)

  if (context.pregnancyWeek) {
    lines.push(`임신 주차: ${context.pregnancyWeek}주`)
  }
  if (context.babyName) {
    lines.push(`태명: ${context.babyName}`)
  }

  lines.push('', '=== 최근 7일 허브 케어 모드 실행 ===')
  if (context.modeRuns.length === 0) {
    lines.push('- 기록 없음')
  } else {
    for (const run of context.modeRuns.slice(0, 12)) {
      lines.push(
        `- ${run.created_at} | ${run.mode_label || run.mode} | 입력: ${run.input_text ?? ''} | wife_card: ${run.wife_card ?? ''}`,
      )
      const devices = (run.device_results ?? [])
        .map((item) => `${item.device}/${item.action}`)
        .join(', ')
      if (devices) lines.push(`  기기: ${devices}`)
    }
  }

  lines.push('', '=== 최근 7일 증상/컨디션 기록 ===')
  const symptoms = context.symptomLogs.filter(
    (log) => !['AUTO_DIARY'].includes(log.parsed_category),
  )
  if (symptoms.length === 0) {
    lines.push('- 기록 없음')
  } else {
    for (const log of symptoms.slice(0, 10)) {
      lines.push(`- ${log.created_at} | ${log.parsed_category}: ${log.symptom_text}`)
    }
  }

  lines.push('', '=== 최근 7일 가전 이벤트 ===')
  if (context.deviceEvents.length === 0) {
    lines.push('- 기록 없음 (mode_runs.device_results 참고)')
  } else {
    for (const event of context.deviceEvents.slice(0, 10)) {
      lines.push(`- ${event.created_at} | ${event.event_type} | ${event.triggered_by}`)
    }
  }

  lines.push('', '=== 최근 초음파 성장 기록 ===')
  if (context.ultrasoundRecords.length === 0) {
    lines.push('- 기록 없음')
  } else {
    for (const record of context.ultrasoundRecords.slice(0, 3)) {
      lines.push(
        `- ${record.created_at} | ${record.weeks ?? ''}주차 | ${record.fruit_name} | ${record.ai_message ?? record.description ?? ''}`,
      )
    }
  }

  lines.push('', '=== 최근 기분 기록 ===')
  if (context.moods.length === 0) {
    lines.push('- 기록 없음')
  } else {
    for (const mood of context.moods.slice(0, 5)) {
      lines.push(`- ${mood.created_at} | ${mood.emoji} ${mood.mood}`)
    }
  }

  return lines.join('\n')
}

function getModeSnippet(mode: string) {
  return MODE_SNIPPETS[mode] ?? null
}

function buildUltrasoundLine(records: DiaryUltrasoundRecord[]) {
  const latest = records[0]
  if (!latest) return null
  if (latest.diary_snippet?.trim()) {
    return latest.diary_snippet.trim()
  }
  const name = latest.fruit_name ? `${latest.fruit_name}만큼` : '조금씩'
  return `최근 초음파 사진을 다시 보니 ${name} 자라고 있는 순간이 마음에 남았다.`
}

function buildSymptomLine(logs: DiarySymptomLog[]) {
  const relevant = logs.filter((log) => !['AUTO_DIARY', 'DIARY', 'KICK'].includes(log.parsed_category))
  if (relevant.length === 0) return null
  const latest = relevant[0]
  if (latest.parsed_category === 'NAUSEA' || latest.symptom_text.includes('입덧')) {
    return '몸이 예민한 날이었지만, 무리하지 않으려고 마음을 조금 더 천천히 가져갔다.'
  }
  if (latest.parsed_category === 'SLEEP' || latest.symptom_text.includes('피곤')) {
    return '피곤함이 자주 찾아왔지만, 쉬어가도 된다고 스스로에게 말해주었다.'
  }
  return '몸의 신호를 조금 더 세심하게 들어보려고 했다.'
}

export function buildFallbackDiary(context: DiaryContext): DiaryGenerateResult {
  const usedModes = collectUsedModeLabels(context.modeRuns)
  const sourceSummary = buildDiarySourceSummary(context)
  const week = context.pregnancyWeek
  const baby = context.babyName?.trim() || '아기'
  const weekLabel = week ? `${week}주차의 ` : ''

  const todayRuns = context.modeRuns.filter((run) => isToday(run.created_at))
  const runsForSnippets = todayRuns.length > 0 ? todayRuns : context.modeRuns

  if (context.pregnancyStatus === 'preparing') {
    const latestRun = runsForSnippets[0]
    const modeSummary = usedModes.length > 0
      ? usedModes.slice(0, 2).join(', ')
      : '생활 리듬'
    const conversation = latestRun?.input_text?.trim()
      ? `허브에게 "${latestRun.input_text.trim()}"라고 말하며 지금 필요한 환경을 솔직하게 이야기했다.`
      : '오늘은 몸과 마음의 리듬을 무리 없이 맞추는 방법을 천천히 생각해봤다.'
    const deviceActions = formatDeviceResultsFromRuns(runsForSnippets)
    const deviceLine = deviceActions.length > 0
      ? `${deviceActions.slice(0, 2).join(', ')} 설정이 이어지자 집 안 분위기도 한결 편안해졌다.`
      : '공기와 화면 분위기가 차분하게 맞춰지니 준비하는 마음도 조금 가벼워졌다.'

    return {
      title: context.role === 'husband' ? '함께 리듬을 맞춘 하루' : '천천히 준비한 오늘',
      content: [
        conversation,
        `${modeSummary}에 맞춰 서두르지 않고 오늘 할 수 있는 작은 습관부터 챙겨보기로 했다.`,
        deviceLine,
        context.role === 'husband'
          ? '혼자 해결하려 하기보다 서로의 컨디션을 묻고 같은 속도로 준비하는 시간이 중요하다는 생각이 들었다.'
          : '완벽하게 해내는 것보다 내 컨디션을 살피고 필요한 도움을 편하게 말하는 연습을 이어가고 싶다.',
      ].join(' '),
      summary: `허브 대화와 ${modeSummary} 케어를 바탕으로 생활 리듬을 정리한 하루`,
      usedModes,
      sourceSummary,
    }
  }

  if (context.role === 'husband') {
    const latestRun = runsForSnippets[0]
    const conversation = latestRun?.input_text?.trim()
      ? `오늘 허브에게 "${latestRun.input_text.trim()}"라고 말하며 배우자에게 필요한 환경을 부탁했다.`
      : '오늘은 배우자의 표정과 컨디션을 살피며 무엇을 먼저 도울 수 있을지 생각했다.'
    const deviceActions = formatDeviceResultsFromRuns(runsForSnippets)
    const environment = deviceActions.length > 0
      ? `공기와 화면, 조명이 차분하게 바뀌자 집 안도 조금 더 편히 쉴 수 있는 분위기가 되었다.`
      : '무엇을 자주 묻기보다 편히 쉴 수 있는 공간을 먼저 만드는 데 집중했다.'

    return {
      title: `${weekLabel}곁에서 살핀 하루`,
      content: [
        conversation,
        environment,
        `${baby}와 함께 보내는 이 시기에 내가 할 수 있는 일은 거창한 해결보다 작은 변화를 알아차리고 먼저 움직이는 것이라는 생각이 들었다.`,
        '오늘의 대화와 케어를 돌아보니 다음에는 무엇을 살펴야 할지도 조금 더 선명해졌다.',
      ].join(' '),
      summary: usedModes.length > 0
        ? `배우자의 컨디션을 살피며 ${usedModes.slice(0, 2).join(', ')} 케어를 함께한 하루`
        : '배우자의 컨디션을 살피며 편안한 환경을 함께 만든 하루',
      usedModes,
      sourceSummary,
    }
  }

  const snippetModes = new Set<string>()
  const paragraphs: string[] = []

  paragraphs.push(
    `오늘은 ${weekLabel}하루를 보냈다. ${baby}를 생각하면 마음이 따뜻해지다가도, 몸이 쉽게 무거워지는 순간이 있었다.`,
  )

  for (const run of runsForSnippets) {
    if (SKIP_MODES.has(run.mode) || snippetModes.has(run.mode)) continue
    const snippet = getModeSnippet(run.mode)
    if (snippet) {
      paragraphs.push(snippet)
      snippetModes.add(run.mode)
    }
  }

  const symptomLine = buildSymptomLine(context.symptomLogs)
  if (symptomLine) paragraphs.push(symptomLine)

  const ultrasoundLine = buildUltrasoundLine(context.ultrasoundRecords)
  if (ultrasoundLine) paragraphs.push(ultrasoundLine)

  if (paragraphs.length <= 1) {
    paragraphs.push(
      '그래도 오늘은 무리하지 않고 내 몸의 신호를 조금 더 들어보려고 했다. 필요한 만큼만 하고 나머지는 잠시 내려놓기로 했다.',
    )
  }

  const content = paragraphs.join(' ')
  const title = usedModes.length > 0 ? '오늘은 조금 천천히' : '오늘은 조금 천천히'
  const summary =
    usedModes.length > 0
      ? `오늘은 ${usedModes.slice(0, 2).join(', ')} 케어가 함께한 하루였어요.`
      : '오늘은 무리하지 않고 몸의 신호를 살핀 하루였어요.'

  return {
    title,
    content,
    summary,
    usedModes,
    sourceSummary,
  }
}

export function parseGptDiaryResponse(content: string, context: DiaryContext): DiaryGenerateResult | null {
  try {
    const parsed = JSON.parse(content) as {
      title?: string
      content?: string
      summary?: string
      usedModes?: string[]
    }

    const diaryContent = parsed.content?.trim()
    if (!diaryContent) return null

    return {
      title: parsed.title?.trim() || '오늘의 하루',
      content: diaryContent,
      summary: parsed.summary?.trim() || diaryContent.slice(0, 80),
      usedModes:
        parsed.usedModes && parsed.usedModes.length > 0
          ? parsed.usedModes
          : collectUsedModeLabels(context.modeRuns),
      sourceSummary: buildDiarySourceSummary(context),
    }
  } catch {
    const trimmed = content.trim()
    if (!trimmed) return null
    return {
      title: '오늘의 하루',
      content: trimmed,
      summary: trimmed.slice(0, 80),
      usedModes: collectUsedModeLabels(context.modeRuns),
      sourceSummary: buildDiarySourceSummary(context),
    }
  }
}

export function normalizeUsedModes(value: string[] | string | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value) as string[]
    if (Array.isArray(parsed)) return parsed
  } catch {
    // comma-separated fallback
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export function parseDiarySummary(sourceSummary: string | null | undefined, content: string) {
  if (!sourceSummary) return content.slice(0, 100)
  try {
    const parsed = JSON.parse(sourceSummary) as { summary?: string }
    if (parsed.summary) return parsed.summary
  } catch {
    // ignore
  }
  return content.slice(0, 100)
}
