export type UltrasoundAnalyzeResponse = {
  success: boolean
  recordId?: string
  fruitName: string
  fruitEmoji: string
  fruitDescription: string
  aiMessage: string
  babyVoiceText: string
  ttsAudioBase64?: string
  imagePath?: string
  imagePreviewUrl?: string
  pregnancyWeek: number
  savedToDb: boolean
  savedToStorage: boolean
  disclaimer: string
  error?: string
}
