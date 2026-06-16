export async function textToSpeech(text: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID

  if (!apiKey || !voiceId) {
    throw new Error('ElevenLabs API 키 또는 Voice ID가 설정되지 않았습니다.')
  }

  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('TTS 변환할 텍스트가 비어 있습니다.')
  }

  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || 'mp3_44100_128'

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: trimmed,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.68,
          similarity_boost: 0.82,
          style: 0.18,
          use_speaker_boost: true,
        },
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    console.error('ElevenLabs TTS 실패:', response.status, errorBody)
    throw new Error(`ElevenLabs TTS 요청 실패 (${response.status})`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer).toString('base64')
}
