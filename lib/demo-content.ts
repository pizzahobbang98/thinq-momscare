import type { DemoRole, DemoStage } from '@/lib/demo-console'

export type DemoModeCard = {
  id: string
  label: string
  description: string
  device: string
  content: string
  atmosphere: string
  routine?: string
}

type RoleContent = {
  eyebrow: string
  title: string
  briefing: string
  primaryAction: string
  recommendation: string
  careTitle: string
  careSummary: string
  diary: string
  sampleUtterances: string[]
}

export const DEMO_ROLE_CONTENT: Record<DemoStage, Record<DemoRole, RoleContent>> = {
  preparing: {
    wife: {
      eyebrow: '준비 루틴',
      title: '서두르지 않아도 괜찮은 하루',
      briefing: '수면과 식사 리듬을 가볍게 맞추는 것부터 시작해요.',
      primaryAction: '오늘의 준비 케어 보기',
      recommendation: '저녁 조명을 조금 일찍 낮추고, 10분 환기로 하루의 긴장을 덜어보세요.',
      careTitle: '내 몸을 알아가는 준비 기록',
      careSummary: '생활 리듬, 마음의 여유, 컨디션 변화를 한 흐름으로 정리해드려요.',
      diary: '완벽하게 준비하려 하기보다 오늘 편안했던 순간을 오래 기억하기로 했다.',
      sampleUtterances: ['요즘 잠드는 시간이 들쭉날쭉해', '집 안 공기를 산뜻하게 바꿔줘', '마음이 조금 복잡해'],
    },
    husband: {
      eyebrow: '함께 준비',
      title: '오늘 먼저 해두면 좋은 한 가지',
      briefing: '상태를 캐묻기보다 편안한 선택지를 건네는 날이에요.',
      primaryAction: '센스 있는 행동 제안',
      recommendation: '“산책할까, 집에서 쉴까?”처럼 부담 없는 두 가지 선택지를 건네보세요.',
      careTitle: '말보다 먼저 보이는 배려',
      careSummary: '생활 리듬을 함께 맞추고 준비 과정이 숙제처럼 느껴지지 않게 도와줘요.',
      diary: '오늘은 해결책보다 함께 천천히 걷는 시간이 더 좋은 대답이 되었다.',
      sampleUtterances: ['오늘 내가 먼저 해둘 일 알려줘', '부담 없이 건넬 말 추천해줘', '둘이 같이 할 루틴을 시작해줘'],
    },
    hub: {
      eyebrow: 'AI HOME AGENT',
      title: '준비기의 생활 리듬을 집과 연결해요',
      briefing: '자유롭게 말하면 공기, 빛, 콘텐츠를 준비 단계에 맞춰 조정합니다.',
      primaryAction: '샘플 발화 실행',
      recommendation: '“집중이 안 되고 답답해”처럼 지금 느낌을 그대로 말해도 괜찮아요.',
      careTitle: '준비 컨텍스트',
      careSummary: '수면 리듬, 스트레스, 환기, 부부 루틴을 임신중 기록과 분리해 이해합니다.',
      diary: '허브는 준비기의 대화를 별도 트랙으로 기억하고 다음 루틴에 반영한다.',
      sampleUtterances: ['오늘은 스트레스를 좀 풀고 싶어', '산책 다녀온 느낌으로 환기해줘', '우리 둘이 쉬는 저녁으로 바꿔줘'],
    },
  },
  pregnant: {
    wife: {
      eyebrow: '18주차 맞춤 케어',
      title: '몸의 신호를 집이 먼저 이해하는 하루',
      briefing: '최근 기록을 바탕으로 공기와 휴식 환경을 가볍게 조정해요.',
      primaryAction: '오늘의 맞춤 케어 보기',
      recommendation: '오후에는 냄새 자극을 낮추고, 잠들기 전 공기청정기를 수면 모드로 전환해보세요.',
      careTitle: '주차별 컨디션 요약',
      careSummary: '입덧, 피로, 수면 기록을 바탕으로 필요한 환경 케어만 차분하게 제안해요.',
      diary: '몸이 보내는 작은 신호를 무시하지 않고 천천히 쉬어가기로 했다.',
      sampleUtterances: ['음식 냄새가 너무 힘들어', '오늘은 푹 자고 싶어', '몸이 무거워서 집안일이 힘들어'],
    },
    husband: {
      eyebrow: '오늘의 배려 가이드',
      title: '눈치 있게 먼저 움직이는 타이밍',
      briefing: '민감한 기록 대신 지금 하기 좋은 행동만 간결하게 알려드려요.',
      primaryAction: '지금 하기 좋은 행동',
      recommendation: '저녁 메뉴는 향이 강하지 않은 선택지를 먼저 제안하고, 조명은 조금 낮춰두세요.',
      careTitle: '센스 있는 말하기',
      careSummary: '“많이 힘들어?”보다 “지금 쉬기 좋게 내가 정리해둘게”처럼 행동이 담긴 말을 추천해요.',
      diary: '오늘은 묻기 전에 조용히 집 안을 정리해두는 쪽을 선택했다.',
      sampleUtterances: ['지금 내가 뭘 하면 좋을까', '부담 없는 저녁 메뉴 알려줘', '편히 쉴 수 있게 집을 맞춰줘'],
    },
    hub: {
      eyebrow: 'AI HOME AGENT',
      title: '발화 한마디를 실제 홈케어로',
      briefing: '입덧, 수면, 가사 부담, 기분 전환 의도를 이해해 가전과 3D 공간에 연결합니다.',
      primaryAction: '케어 모드 실행',
      recommendation: '“바다에 온 것처럼 쉬고 싶어” 같은 자유 발화도 장소와 분위기까지 이해해요.',
      careTitle: '최근 실행 요약',
      careSummary: 'AI 해석, 실제 가전 결과, 아내 안내와 남편 행동 제안을 한 번에 연결해요.',
      diary: '허브는 최근 컨디션과 실행 결과를 이어서 다음 대화의 맥락으로 사용한다.',
      sampleUtterances: ['밥 냄새가 너무 역겨워', '숲속처럼 조용하게 쉬고 싶어', '빨래랑 청소를 미뤄도 되게 도와줘'],
    },
  },
}

export const PREPARING_MODES: DemoModeCard[] = [
  { id: 'condition', label: '컨디션 밸런스', description: '몸의 리듬을 깨우는 맑은 공기', device: '공기청정기 자동 · 약풍', content: '스탠바이미: 가벼운 스트레칭', atmosphere: '세이지 그린 · 자연광' },
  { id: 'sleep-rhythm', label: '수면 리듬', description: '잠들 시간을 부드럽게 앞당겨요', device: '공기청정기 수면 · 저소음', content: '스탠바이미: 수면 호흡 가이드', atmosphere: '딥 인디고 · 간접 조명' },
  { id: 'stress-relief', label: '마음 환기', description: '생각이 많을 때 감각 자극을 낮춰요', device: '공기청정기 중풍 · 이온 케어', content: '스탠바이미: 빗소리 명상', atmosphere: '라벤더 · 저채도 조명' },
  { id: 'rest-ready', label: '휴식 준비', description: '저녁의 속도를 한 단계 낮춰요', device: '공기청정기 약풍 · 타이머', content: '스탠바이미: 잔잔한 재즈', atmosphere: '앰버 · 따뜻한 조명' },
  { id: 'walk-air', label: '산책 환기', description: '산책 뒤처럼 산뜻한 공기를 만들어요', device: '공기청정기 터보 10분', content: '스탠바이미: 숲길 산책 영상', atmosphere: '민트 · 선명한 자연광' },
  { id: 'couple-routine', label: '둘의 저녁', description: '함께 쉬는 시간을 생활 루틴으로', device: '공기청정기 자동 · 정숙', content: '스탠바이미: 커플 플레이리스트', atmosphere: '로즈 앰버 · 라운지 조명' },
]

export const PREGNANT_MODES: DemoModeCard[] = [
  { id: 'nausea', label: '입덧 케어', description: '냄새 자극과 답답함을 빠르게 낮춰요', device: '공기청정기 터보', content: '스탠바이미: 산뜻한 주방 가이드', atmosphere: '아이스 블루', routine: 'nausea_food' },
  { id: 'sleep', label: '수면 케어', description: '빛과 소음을 낮춰 편안한 밤을 준비해요', device: '공기청정기 수면', content: '스탠바이미: 수면 콘텐츠', atmosphere: '딥 네이비', routine: 'sleep_care' },
  { id: 'ocean', label: '바다 휴양', description: '시원하고 여유로운 바닷가 분위기', device: '공기청정기 자동', content: '스탠바이미: 파도 영상', atmosphere: '오션 블루', routine: 'destination_ocean' },
  { id: 'forest', label: '숲 휴양', description: '고요한 자연의 공기와 소리를 연결해요', device: '공기청정기 자연풍', content: '스탠바이미: 숲 영상', atmosphere: '포레스트 그린', routine: 'destination_forest' },
  { id: 'city', label: '도시 라운지', description: '차분한 야경과 라운지 무드', device: '공기청정기 정숙', content: '스탠바이미: 도시 야경', atmosphere: '바이올렛', routine: 'destination_city' },
  { id: 'housework', label: '가사 케어', description: '집안일 부담을 낮추는 가전 루틴', device: '공기청정기 자동', content: '스탠바이미: 가사 진행 요약', atmosphere: '웜 옐로', routine: 'housework_care' },
]
