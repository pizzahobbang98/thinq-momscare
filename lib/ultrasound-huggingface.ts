export type UltrasoundSceneCategory =
  | 'face_head'
  | 'body_outline'
  | 'limb_movement'
  | 'general_scene'

export type UltrasoundPlaneResult = {
  label: string
  confidence: number
  hfSceneScore: number
  sceneCategory: UltrasoundSceneCategory
  sceneLabel: string
  sceneNote: string
}

const SCENE_COPY: Record<
  UltrasoundSceneCategory,
  { sceneLabel: string; sceneNote: string }
> = {
  face_head: {
    sceneLabel: '얼굴과 머리 윤곽 중심',
    sceneNote: '사진 속에서 얼굴이나 머리 윤곽이 중심에 가까운 장면으로 보입니다.',
  },
  body_outline: {
    sceneLabel: '몸의 윤곽 중심',
    sceneNote: '사진 속에서 몸의 윤곽이 중심에 가까운 장면으로 보입니다.',
  },
  limb_movement: {
    sceneLabel: '작은 손발의 움직임',
    sceneNote: '사진 속에서 작은 손발이나 움직임이 느껴지는 장면으로 보입니다.',
  },
  general_scene: {
    sceneLabel: '초음파 장면',
    sceneNote: '초음파 이미지의 시각적 특징을 바탕으로 성장 기록을 만들 수 있어요.',
  },
}

const FACE_HEAD_KEYS = ['profile', 'face', 'head', 'skull', 'brain']
const BODY_OUTLINE_KEYS = ['abdomen', 'body', 'thorax', 'spine']
const LIMB_MOVEMENT_KEYS = ['femur', 'limb', 'leg', 'arm', 'hand', 'foot']

export function mapPlaneToSceneCategory(label: string): UltrasoundSceneCategory {
  const normalized = label.toLowerCase()

  if (FACE_HEAD_KEYS.some((key) => normalized.includes(key))) {
    return 'face_head'
  }
  if (BODY_OUTLINE_KEYS.some((key) => normalized.includes(key))) {
    return 'body_outline'
  }
  if (LIMB_MOVEMENT_KEYS.some((key) => normalized.includes(key))) {
    return 'limb_movement'
  }
  return 'general_scene'
}

export function getSceneCopy(category: UltrasoundSceneCategory) {
  return SCENE_COPY[category]
}

export async function classifyUltrasoundPlane(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<UltrasoundPlaneResult | null> {
  const token = process.env.HUGGINGFACE_API_TOKEN
  const model =
    process.env.HUGGINGFACE_ULTRASOUND_MODEL ??
    'Beijuka/ultrasound_plane_classification-swin-all-planes-class-weight-v1'

  if (!token) {
    console.warn('[ultrasound-hf] HUGGINGFACE_API_TOKEN 없음, 장면 fallback 사용')
    return null
  }

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType || 'image/jpeg',
      },
      body: new Uint8Array(imageBuffer),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('[ultrasound-hf] inference 실패:', response.status, errorText.slice(0, 200))
      return null
    }

    const data = (await response.json()) as Array<{ label?: string; score?: number }> | { error?: string }

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[ultrasound-hf] 예상과 다른 응답:', data)
      return null
    }

    const top = data.reduce((best, current) =>
      (current.score ?? 0) > (best.score ?? 0) ? current : best,
    )

    const label = top.label?.trim() ?? 'unknown'
    const confidence = top.score ?? 0
    const sceneCategory = mapPlaneToSceneCategory(label)
    const copy = getSceneCopy(sceneCategory)

    return {
      label,
      confidence,
      hfSceneScore: Math.max(0, Math.min(100, Math.round(confidence * 100))),
      sceneCategory,
      sceneLabel: copy.sceneLabel,
      sceneNote: copy.sceneNote,
    }
  } catch (error) {
    console.warn('[ultrasound-hf] 장면 추정 처리 실패:', error)
    return null
  }
}

export function buildFallbackPlaneResult(): UltrasoundPlaneResult {
  const copy = getSceneCopy('general_scene')
  return {
    label: 'fallback',
    confidence: 0,
    hfSceneScore: 0,
    sceneCategory: 'general_scene',
    sceneLabel: copy.sceneLabel,
    sceneNote: copy.sceneNote,
  }
}
