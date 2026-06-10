import OpenAI from 'openai'
import { NextResponse } from 'next/server'

type VoiceAction =
  | 'NAUSEA_MODE'
  | 'SLEEP_MODE'
  | 'AIR_ON'
  | 'AIR_OFF'
  | 'SYMPTOM_LOG'
  | 'UNKNOWN'

type VoiceIntent = {
  action: VoiceAction
  message: string
  symptom_text: string | null
}

const SYSTEM_PROMPT = `임산부 케어 스마트홈 AI입니다.
발화를 분석해서 JSON만 반환하세요.

action 판단 기준:
NAUSEA_MODE:
  입덧, 메스꺼움, 구토, 속 불편, 토할것 같아, 속 메스꺼워

SLEEP_MODE:
  졸려, 피곤해, 자고싶어, 잠이 와, 눕고싶어, 쉬고싶어

AIR_ON:
  공기청정기 켜줘, 환기, 공기 탁해, 숨막혀, 더워

AIR_OFF:
  공기청정기 꺼줘, 끄고싶어

SYMPTOM_LOG (새 액션 추가):
  허리 아파, 두통, 머리 아파, 붓기, 다리 부어,
  배 아파, 출혈, 어지러워, 손발 저려
  → 기기 제어 없이 symptom_logs에만 기록

UNKNOWN:
  위 어디에도 해당 없는 경우

반환:
{
  action: 'NAUSEA_MODE' | 'SLEEP_MODE' | 'AIR_ON' | 'AIR_OFF' | 'SYMPTOM_LOG' | 'UNKNOWN',
  message: string (한국어 응답),
  symptom_text: string | null (SYMPTOM_LOG일 때 증상 내용)
}`

const VALID_ACTIONS: VoiceAction[] = [
  'NAUSEA_MODE',
  'SLEEP_MODE',
  'AIR_ON',
  'AIR_OFF',
  'SYMPTOM_LOG',
  'UNKNOWN',
]

const BABY_KEYWORDS = [
  '아가',
  '아가야',
  '아가아',
  '아기',
  '아기야',
  '애기',
  '애기야',
  'baby',
] as const

function containsBabyKeyword(transcript: string) {
  const normalized = transcript.replace(/\s/g, '').toLowerCase()
  return BABY_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function parseIntent(content: string): VoiceIntent {
  try {
    const parsed = JSON.parse(content) as Partial<VoiceIntent>
    const action = VALID_ACTIONS.includes(parsed.action as VoiceAction)
      ? (parsed.action as VoiceAction)
      : 'UNKNOWN'

    const symptomText =
      action === 'SYMPTOM_LOG' && parsed.symptom_text?.trim()
        ? parsed.symptom_text.trim()
        : null

    return {
      action,
      message:
        parsed.message?.trim() ??
        (action === 'UNKNOWN' ? '다시 한번 말씀해주세요 🎤' : '요청을 이해하지 못했어요.'),
      symptom_text: symptomText,
    }
  } catch {
    return {
      action: 'UNKNOWN',
      message: '다시 한번 말씀해주세요 🎤',
      symptom_text: null,
    }
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[voice] OPENAI_API_KEY가 설정되지 않았습니다.')
      return NextResponse.json(
        {
          success: false,
          action: 'UNKNOWN',
          message: '음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.',
          symptom_text: null,
          transcript: '',
          error: '서버 설정 오류',
        },
        { status: 200 },
      )
    }

    const formData = await request.formData()
    const audio = formData.get('audio')

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        {
          success: false,
          action: 'UNKNOWN',
          message: '음성 파일을 다시 녹음해주세요.',
          symptom_text: null,
          transcript: '',
          error: '음성 파일이 없습니다.',
        },
        { status: 200 },
      )
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
        success: false,
        action: 'UNKNOWN',
        message: '음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.',
        symptom_text: null,
        transcript: '',
      })
    }

    if (containsBabyKeyword(transcript)) {
      return NextResponse.json({
        action: 'UNKNOWN',
        message: '',
        symptom_text: null,
        transcript,
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
    const intent = content
      ? parseIntent(content)
      : {
          action: 'UNKNOWN' as VoiceAction,
          message: '음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.',
          symptom_text: null,
        }

    if (intent.action === 'SYMPTOM_LOG' && !intent.symptom_text) {
      return NextResponse.json({
        success: false,
        action: 'UNKNOWN',
        message: '음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.',
        symptom_text: null,
        transcript,
      })
    }

    return NextResponse.json({
      success: true,
      action: intent.action,
      message: intent.message,
      symptom_text: intent.symptom_text,
      transcript,
    })
  } catch (error) {
    console.warn('[voice] 음성 API 처리 실패:', error)
    return NextResponse.json(
      {
        success: false,
        action: 'UNKNOWN',
        message: '음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.',
        symptom_text: null,
        transcript: '',
        error: '음성 처리 중 오류가 발생했습니다.',
      },
      { status: 200 },
    )
  }
}
