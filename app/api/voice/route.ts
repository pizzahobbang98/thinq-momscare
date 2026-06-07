import OpenAI from 'openai'
import { NextResponse } from 'next/server'

type VoiceAction = 'NAUSEA_MODE' | 'SLEEP_MODE' | 'AIR_ON' | 'AIR_OFF' | 'UNKNOWN'

type VoiceIntent = {
  action: VoiceAction
  message: string
}

const SYSTEM_PROMPT = `당신은 임산부 케어 스마트홈 AI입니다.
사용자 발화를 분석해서 아래 JSON만 반환하세요.
{
  action: 'NAUSEA_MODE' | 'SLEEP_MODE' | 'AIR_ON' | 'AIR_OFF' | 'UNKNOWN',
  message: string (한국어로 응답 메시지)
}`

const VALID_ACTIONS: VoiceAction[] = [
  'NAUSEA_MODE',
  'SLEEP_MODE',
  'AIR_ON',
  'AIR_OFF',
  'UNKNOWN',
]

const BABY_KEYWORDS = ['아가', '아가야', '아가아'] as const

function containsBabyKeyword(transcript: string) {
  const normalized = transcript.replace(/\s/g, '')
  return BABY_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function parseIntent(content: string): VoiceIntent {
  try {
    const parsed = JSON.parse(content) as Partial<VoiceIntent>
    const action = VALID_ACTIONS.includes(parsed.action as VoiceAction)
      ? (parsed.action as VoiceAction)
      : 'UNKNOWN'

    return {
      action,
      message: parsed.message ?? '요청을 이해하지 못했어요.',
    }
  } catch {
    return {
      action: 'UNKNOWN',
      message: '요청을 이해하지 못했어요.',
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

    const formData = await request.formData()
    const audio = formData.get('audio')

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: '음성 파일이 없습니다.' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey })
    const file = new File([audio], 'recording.webm', {
      type: audio.type || 'audio/webm',
    })

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'ko',
    })

    const transcript = transcription.text.trim()
    if (!transcript) {
      return NextResponse.json({
        action: 'UNKNOWN',
        message: '음성을 인식하지 못했어요. 다시 말씀해 주세요.',
        transcript: '',
      })
    }

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
      return NextResponse.json({ error: 'Intent 분석 실패' }, { status: 500 })
    }

    const intent = parseIntent(content)

    if (containsBabyKeyword(transcript)) {
      return NextResponse.json({
        action: 'UNKNOWN',
        message: intent.message,
        transcript,
      })
    }

    return NextResponse.json({
      action: intent.action,
      message: intent.message,
      transcript,
    })
  } catch (error) {
    console.error('음성 API 처리 실패:', error)
    return NextResponse.json({ error: '음성 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
