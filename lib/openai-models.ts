export const OPENAI_MODELS = {
  text: process.env.OPENAI_TEXT_MODEL?.trim() || 'gpt-5.5',
  transcription:
    process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'gpt-4o-mini-transcribe',
  tts: process.env.OPENAI_TTS_MODEL?.trim() || 'gpt-4o-mini-tts',
} as const
