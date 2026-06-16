import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const STT_PROMPT = [
  'Mother Together 3D 시뮬레이터 한국어 음성 명령',
  '하이 엘지',
  '하이 LG',
  'Mother Together',
  '마더 투게더',
  '입덧',
  '냄새',
  '음식 냄새',
  '조리 냄새',
  '공기청정기',
  '공청기',
  '환기',
  '수면',
  '잠을 못 자',
  '숙면',
  '가사',
  '움직이기 힘들어',
  '바다',
  '숲',
  '도시',
  '휴양지',
  '스탠바이미',
].join(', ')

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[stt] OPENAI_API_KEY missing')
      return NextResponse.json({
        success: false,
        transcript: '',
        message: '잠시 후 다시 말씀해주세요. 현재 화면은 시연 모드로 유지됩니다.',
      })
    }

    const formData = await request.formData()
    const audio = formData.get('audio')

    if (!audio || !(audio instanceof Blob) || audio.size < 1200) {
      return NextResponse.json({
        success: false,
        transcript: '',
        message: '말씀이 짧게 인식되었어요. 한 번 더 말씀해주세요.',
      })
    }

    const openai = new OpenAI({ apiKey })
    const file = new File([audio], 'mother-together-command.webm', {
      type: audio.type || 'audio/webm',
    })

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'gpt-4o-transcribe',
      language: 'ko',
      prompt: STT_PROMPT,
    })

    const transcript = transcription.text.trim()
    if (!transcript) {
      return NextResponse.json({
        success: false,
        transcript: '',
        message: '말씀이 짧게 인식되었어요. 한 번 더 말씀해주세요.',
      })
    }

    return NextResponse.json({
      success: true,
      transcript,
    })
  } catch (error) {
    console.warn('[stt] transcription failed:', error)
    return NextResponse.json({
      success: false,
      transcript: '',
      message: '주변 소음으로 일부 내용이 정확하지 않을 수 있어요. 다시 한 번 말씀해주세요.',
    })
  }
}
