import OpenAI from 'openai'
import { NextResponse } from 'next/server'

type BabyAction = 'NAUSEA_MODE' | 'SLEEP_MODE' | 'AIR_ON' | 'AIR_OFF' | 'NONE'

type BabyVoiceResult = {
  message: string
  action: BabyAction
}

const SYSTEM_PROMPT = `당신은 엄마 뱃속의 아기입니다.
엄마나 아빠가 부르면 증상을 파악하고
필요하면 LG 스마트홈 기기를 제어해줍니다.

아래 JSON만 반환하세요:
{
  message: string (아기 말투 답변, 기기 제어할 경우 어떻게 해줄지 포함),
  action: 'NAUSEA_MODE' | 'SLEEP_MODE' | 'AIR_ON' | 'AIR_OFF' | 'NONE'
}

액션 판단 기준:
- 입덧/메스꺼움/속 → NAUSEA_MODE
- 졸림/피곤/자고싶어 → SLEEP_MODE
- 공기/환기/더워 → AIR_ON
- 증상 없음 → NONE

message 예시:
- NAUSEA_MODE: '엄마 많이 힘들지? 🍼 내가 공기청정기 켜줄게요!'
- SLEEP_MODE: '엄마 피곤하구나~ 포근하게 해줄게요 🌙'
- NONE: '응~ 나 여기 있어~ 엄마 목소리 들려! 🍼'`

const VALID_ACTIONS: BabyAction[] = [
  'NAUSEA_MODE',
  'SLEEP_MODE',
  'AIR_ON',
  'AIR_OFF',
  'NONE',
]

const BABY_KEYWORDS = ['아가', '아가야', '아가아'] as const

function containsBabyKeyword(transcript: string) {
  const normalized = transcript.replace(/\s/g, '')
  return BABY_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function parseBabyResponse(content: string): BabyVoiceResult | null {
  try {
    const parsed = JSON.parse(content) as Partial<BabyVoiceResult>
    const message = parsed.message?.trim()
    const action = VALID_ACTIONS.includes(parsed.action as BabyAction)
      ? (parsed.action as BabyAction)
      : 'NONE'

    if (!message) return null

    return { message, action }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY가 설정되지 않았습니다.')
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    const body = (await request.json()) as { transcript?: string }
    const transcript = body.transcript?.trim() ?? ''

    const keywordMatched = containsBabyKeyword(transcript)
    console.log('[baby-voice] transcript:', transcript)
    console.log('[baby-voice] keyword matched:', keywordMatched)

    if (!keywordMatched) {
      return NextResponse.json({ triggered: false })
    }

    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: '아기 답변 생성 실패' }, { status: 500 })
    }

    const result = parseBabyResponse(content)
    if (!result) {
      return NextResponse.json({ error: '아기 답변 생성 실패' }, { status: 500 })
    }

    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: result.message,
    })

    const audioBuffer = Buffer.from(await speech.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')

    return NextResponse.json({
      triggered: true,
      message: result.message,
      audioBase64,
      action: result.action,
    })
  } catch (error) {
    console.error('태명 호출 API 처리 실패:', error)
    return NextResponse.json({ error: '태명 호출 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
