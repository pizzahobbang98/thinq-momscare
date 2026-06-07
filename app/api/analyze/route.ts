import OpenAI from 'openai'
import { NextResponse } from 'next/server'

type ParsedCategory = 'NAUSEA' | 'BACK_PAIN' | 'SLEEP' | 'KICK' | 'DIARY' | 'OTHER'

type AnalyzeResult = {
  parsed_category: ParsedCategory
  severity: number
  advice: string
}

const SYSTEM_PROMPT = `임산부 증상 기록을 분석해서 아래 JSON만 반환하세요. 다른 텍스트 없이 JSON만.
{
  parsed_category: 'NAUSEA' | 'BACK_PAIN' | 'SLEEP' | 'KICK' | 'DIARY' | 'OTHER',
  severity: 1~5 숫자 (1=가벼움, 5=심각),
  advice: string (한국어 짧은 조언 1문장)
}`

const VALID_CATEGORIES: ParsedCategory[] = [
  'NAUSEA',
  'BACK_PAIN',
  'SLEEP',
  'KICK',
  'DIARY',
  'OTHER',
]

function parseAnalysis(content: string): AnalyzeResult {
  try {
    const parsed = JSON.parse(content) as Partial<AnalyzeResult>
    const parsed_category = VALID_CATEGORIES.includes(parsed.parsed_category as ParsedCategory)
      ? (parsed.parsed_category as ParsedCategory)
      : 'DIARY'

    const rawSeverity = Number(parsed.severity)
    const severity =
      Number.isInteger(rawSeverity) && rawSeverity >= 1 && rawSeverity <= 5
        ? rawSeverity
        : 1

    return {
      parsed_category,
      severity,
      advice: parsed.advice ?? '오늘도 수고 많으셨어요.',
    }
  } catch {
    return {
      parsed_category: 'DIARY',
      severity: 1,
      advice: '오늘도 수고 많으셨어요.',
    }
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY가 설정되지 않았습니다.')
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    const body = (await request.json()) as { text?: string }
    const text = body.text?.trim()

    if (!text) {
      return NextResponse.json({ error: '분석할 텍스트가 없습니다.' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: '증상 분석 실패' }, { status: 500 })
    }

    const result = parseAnalysis(content)

    return NextResponse.json(result)
  } catch (error) {
    console.error('증상 분석 API 처리 실패:', error)
    return NextResponse.json({ error: '증상 분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
