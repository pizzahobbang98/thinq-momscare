import type { UltrasoundDemoGalleryCard } from '@/lib/ultrasound-types'

export const ULTRASOUND_DEMO_GALLERY_CARDS: UltrasoundDemoGalleryCard[] = [
  {
    id: 'demo-gallery-full-body',
    imageUrl: '/demo/ultrasound/02_gallery_full_body_ultrasound.png',
    title: '호빵이의 성장을 차분히 기록한 날',
    recordLabel: '좋음',
    recordScore: 84,
    sceneLabel: '몸의 윤곽 중심',
    isExample: true,
  },
  {
    id: 'demo-gallery-movement',
    imageUrl: '/demo/ultrasound/03_gallery_movement_ultrasound.png',
    title: '호빵이의 작은 움직임을 느낀 날',
    recordLabel: '보통',
    recordScore: 72,
    sceneLabel: '작은 손발의 움직임',
    isExample: true,
  },
]

export const ULTRASOUND_MAIN_DEMO_HINT = {
  imageUrl: '/demo/ultrasound/01_main_upload_profile_ultrasound.png',
  title: '호빵이를 조금 더 가까이 본 날',
}
