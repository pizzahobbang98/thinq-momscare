import { textToSpeech } from '@/lib/elevenlabs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; voice?: string }

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'text가 필요합니다.' }, { status: 400 })
    }

    console.log('[api/tts] 요청:', { voice: body.voice ?? 'hub', length: body.text.length })

    const audioBase64 = await textToSpeech(body.text)
    const audioBuffer = Buffer.from(audioBase64, 'base64')

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS 생성 실패'
    console.error('[api/tts] 실패:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
