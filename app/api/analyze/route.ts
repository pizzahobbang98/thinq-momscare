import OpenAI from 'openai'
import { NextResponse } from 'next/server'

type ParsedCategory =
  | 'NAUSEA'
  | 'BACK_PAIN'
  | 'SLEEP'
  | 'KICK'
  | 'DIARY'
  | 'FATIGUE'
  | 'HEADACHE'
  | 'OTHER'

type AnalyzeResult = {
  parsed_category: ParsedCategory
  severity: number
  advice: string
}

const SYSTEM_PROMPT = `임산부 증상 기록을 분석해서 아래 JSON만 반환하세요. 다른 텍스트 없이 JSON만.

severity 기준 (임산부는 일반인보다 민감하게 판단):
1: 아주 가벼움 (기분 좋음, 평범한 하루)
2: 가벼운 불편함 (살짝 피곤, 가벼운 두통)
3: 중등도 (몸상태 안좋음, 입덧, 허리통증, 피곤함, 힘듦)
4: 심각 (심한 통증, 심한 입덧, 출혈, 어지러움)
5: 매우 심각 (응급 수준, 극심한 통증, 의식 이상)

중요: 임산부가 '몸상태 안좋아', '힘들어', '아파',
'불편해', '피곤해' 라고 하면 최소 severity 3으로 판단.
임산부의 작은 불편함도 중요하게 다뤄야 함.

{
  parsed_category: 'NAUSEA' | 'BACK_PAIN' | 'SLEEP' | 'KICK' | 'DIARY' | 'FATIGUE' | 'HEADACHE' | 'OTHER',
  severity: 1~5 숫자,
  advice: string (한국어 짧은 조언 1문장)
}`

const VALID_CATEGORIES: ParsedCategory[] = [
  'NAUSEA',
  'BACK_PAIN',
  'SLEEP',
  'KICK',
  'DIARY',
  'FATIGUE',
  'HEADACHE',
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
