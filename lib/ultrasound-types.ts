export type UltrasoundQualityScores = {
  sharpnessScore: number
  brightnessScore: number
  contrastScore: number
  noiseScore: number
  sectorScore: number
  qualityScore: number
}

export type UltrasoundMemoryCardData = {
  qualityScore: number
  hfSceneScore: number | null
  finalRecordScore: number
  adjustedRecordScore: number
  recordLabel: '좋음' | '보통' | '낮음'
  recordNote: string
  sceneLabel: string
  sceneNote: string
  title: string
  growthText: string
  tags: string[]
  babyVoiceText: string
  diarySnippet: string
  recordPoints: string[]
  quality: UltrasoundQualityScores
  planeLabel?: string
  planeConfidence?: number
}

export type UltrasoundStoredCard = {
  id: string
  imageUrl: string
  createdAt: string
  babyName: string
  pregnancyWeek: number
  title: string
  recordScore: number
  recordLabel: string
  recordNote: string
  sceneLabel: string
  sceneNote: string
  growthText: string
  tags: string[]
  babyVoiceText: string
  diarySnippet: string
  disclaimer: string
}

export type UltrasoundDemoGalleryCard = {
  id: string
  imageUrl: string
  title: string
  recordLabel: '좋음' | '보통' | '낮음'
  recordScore: number
  sceneLabel: string
  growthText?: string
  isExample: true
}

export type UltrasoundAnalyzeResponse = {
  success: boolean
  recordId?: string
  fruitName: string
  fruitEmoji: string
  fruitDescription: string
  aiMessage: string
  ttsAudioBase64?: string
  imagePath?: string
  imagePreviewUrl?: string
  pregnancyWeek: number
  savedToDb: boolean
  savedToStorage: boolean
  qualityScore: number
  hfSceneScore: number | null
  finalRecordScore: number
  adjustedRecordScore: number
  recordLabel: string
  recordNote: string
  sceneLabel: string
  sceneNote: string
  title: string
  growthText: string
  tags: string[]
  babyVoiceText: string
  diarySnippet: string
  disclaimer: string
  memoryCard: UltrasoundMemoryCardData
  error?: string
}
