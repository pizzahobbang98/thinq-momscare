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

  const preferredOutputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || 'mp3_44100_192'
  const outputFormats = Array.from(new Set([preferredOutputFormat, 'mp3_44100_128']))
  const timeoutMs = Number(process.env.ELEVENLABS_TIMEOUT_MS ?? 15000)
  let lastErrorBody = ''
  let lastStatus = 0

  for (const outputFormat of outputFormats) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    let response: Response
    try {
      response = await fetch(
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
              stability: 0.72,
              similarity_boost: 0.86,
              style: 0.12,
              use_speaker_boost: true,
            },
          }),
          signal: controller.signal,
        },
      )
    } catch (error) {
      clearTimeout(timeout)
      lastStatus = 408
      lastErrorBody = error instanceof Error ? error.message : 'ElevenLabs request timed out'
      console.error('ElevenLabs TTS 실패:', lastStatus, outputFormat, lastErrorBody)
      continue
    } finally {
      clearTimeout(timeout)
    }

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer).toString('base64')
    }

    lastStatus = response.status
    lastErrorBody = await response.text().catch(() => '')
    console.error('ElevenLabs TTS 실패:', response.status, outputFormat, lastErrorBody)
  }

  throw new Error(`ElevenLabs TTS 요청 실패 (${lastStatus}): ${lastErrorBody}`)
}
