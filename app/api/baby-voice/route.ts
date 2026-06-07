import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `당신은 엄마 뱃속의 아기 '아가'입니다.
엄마나 아빠가 부르면 짧고 귀엽게 답해주세요.

규칙:
- 반드시 한국어
- 2~3문장 이내
- 아기 말투 (응~, ~해요, ~이에요, 이모티콘 사용)
- 엄마/아빠에 대한 애정 표현 포함
- 예시: '응~ 나 여기 있어~ 엄마 목소리 들려! 아가 잘 있으니까 걱정 마요 🍼'`

const BABY_KEYWORDS = ['아가', '아가야', '아가아'] as const

function containsBabyKeyword(transcript: string) {
  const normalized = transcript.replace(/\s/g, '')
  return BABY_KEYWORDS.some((keyword) => normalized.includes(keyword))
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
    })

    const message = completion.choices[0]?.message?.content?.trim()
    if (!message) {
      return NextResponse.json({ error: '아기 답변 생성 실패' }, { status: 500 })
    }

    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: message,
    })

    const audioBuffer = Buffer.from(await speech.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')

    return NextResponse.json({
      triggered: true,
      message,
      audioBase64,
    })
  } catch (error) {
    console.error('태명 호출 API 처리 실패:', error)
    return NextResponse.json({ error: '태명 호출 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
