import OpenAI from 'openai'
import { NextResponse } from 'next/server'

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

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[voice] OPENAI_API_KEY가 설정되지 않았습니다.')
      return NextResponse.json(
        {
          success: false,
          message: '음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.',
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
          message: '음성 파일을 다시 녹음해주세요.',
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
        message: '음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.',
        transcript: '',
      })
    }

    if (containsBabyKeyword(transcript)) {
      return NextResponse.json({
        success: true,
        message: '',
        transcript,
      })
    }

    return NextResponse.json({
      success: true,
      transcript,
    })
  } catch (error) {
    console.warn('[voice] 음성 API 처리 실패:', error)
    return NextResponse.json(
      {
        success: false,
        message: '음성 인식이 어려우면 예시 문장을 선택하거나 직접 입력해 실행할 수 있어요.',
        transcript: '',
        error: '음성 처리 중 오류가 발생했습니다.',
      },
      { status: 200 },
    )
  }
}
