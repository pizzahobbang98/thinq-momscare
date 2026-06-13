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
      eyebrow: '임신준비중 케어',
      title: '오늘의 컨디션과 생활 리듬을 체크해요',
      briefing: '수면, 식사, 스트레스 리듬을 기준으로 준비 상태를 정리했어요.',
      primaryAction: '오늘의 준비 상태 보기',
      recommendation: '저녁에는 조명을 낮추고 공기청정기를 저소음으로 전환해 수면 리듬을 맞춰보세요.',
      careTitle: '준비 컨디션 기록',
      careSummary: '수면, 식사, 스트레스, 실내 환경을 나눠 오늘의 준비 상태를 보여줘요.',
      diary: '오늘은 수면 리듬과 컨디션을 안정적으로 맞추는 데 집중했다.',
      sampleUtterances: [
  '요즘 잠드는 시간이 들쭉날쭉해',
  '집 안 공기를 산뜻하게 바꿔줘',
  '오늘은 컨디션 관리 루틴을 추천해줘'
],
    },
    husband: {
      eyebrow: '파트너 케어',
      title: '오늘은 생활 리듬을 같이 맞추는 날',
      briefing: '작은 행동으로 준비 과정의 부담을 줄일 수 있어요.',
      primaryAction: '오늘의 행동 제안',
      recommendation: '저녁 일정은 여유롭게 잡고, 산책이나 휴식 중 하나를 가볍게 제안해보세요.',
      careTitle: '오늘의 센스 미션',
      careSummary: '집안 분위기, 식사, 수면 루틴을 함께 맞출 수 있는 행동을 추천해요.',
      diary: '오늘은 저녁 일정을 여유롭게 잡고 함께 쉴 수 있는 분위기를 만들었다.',
      sampleUtterances: [
  '오늘은 스트레스를 좀 낮추고 싶어',
  '산책 다녀온 것처럼 환기해줘',
  '저녁 휴식 모드로 바꿔줘'
],
    },
    hub: {
      eyebrow: 'AI HOME AGENT',
      title: '임신준비중 생활 패턴을 홈케어로 연결해요',
      briefing: '말 한마디로 공기, 조명, 스탠바이미 콘텐츠를 준비 루틴에 맞춰 조정합니다.',
      primaryAction: '샘플 발화 실행',
      recommendation: '“오늘 좀 피곤해”처럼 편하게 말하면 컨디션에 맞는 홈 모드를 추천해요.',
      careTitle: '준비 루틴 요약',
      careSummary: '수면, 환기, 스트레스, 부부 루틴을 임신중 기록과 분리해서 관리해요.',
      diary: '오늘의 대화와 실행 모드를 바탕으로 다음 준비 루틴을 추천했다.',
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
  { id: 'condition', label: '컨디션 케어', description: '몸과 마음의 균형을 위한 산뜻한 환경', device: '공기청정기 약풍', content: '스탠바이미: 스트레칭 가이드', atmosphere: '세이지 그린' },
  { id: 'sleep-rhythm', label: '수면 리듬', description: '규칙적인 수면을 위한 편안한 밤을 준비해요', device: '공기청정기 수면', content: '스탠바이미: 수면 호흡 가이드', atmosphere: '딥 인디고' },
  { id: 'stress-relief', label: '스트레스 완화', description: '감각 자극을 낮춰 차분한 휴식을 도와요', device: '공기청정기 중풍', content: '스탠바이미: 빗소리 명상', atmosphere: '라벤더' },
  { id: 'rest-ready', label: '휴식 준비', description: '하루의 긴장을 낮추는 부드러운 저녁 루틴', device: '공기청정기 약풍', content: '스탠바이미: 잔잔한 재즈', atmosphere: '웜 앰버' },
  { id: 'walk-air', label: '산책 환기', description: '맑은 공기와 자연의 분위기를 집 안에 연결해요', device: '공기청정기 터보', content: '스탠바이미: 숲길 산책 영상', atmosphere: '민트 그린' },
  { id: 'couple-routine', label: '부부 루틴', description: '함께 쉬며 대화하기 좋은 공간을 만들어요', device: '공기청정기 정숙', content: '스탠바이미: 커플 플레이리스트', atmosphere: '로즈 앰버' },
]

export const PREGNANT_MODES: DemoModeCard[] = [
  { id: 'nausea', label: '입덧 케어', description: '냄새 자극과 답답함을 빠르게 낮춰요', device: '공기청정기 터보', content: '스탠바이미: 산뜻한 주방 가이드', atmosphere: '아이스 블루', routine: 'nausea_food' },
  { id: 'sleep', label: '수면 케어', description: '빛과 소음을 낮춰 편안한 밤을 준비해요', device: '공기청정기 수면', content: '스탠바이미: 수면 콘텐츠', atmosphere: '딥 네이비', routine: 'sleep_care' },
  { id: 'ocean', label: '바다 휴양', description: '시원하고 여유로운 바닷가 분위기', device: '공기청정기 자동', content: '스탠바이미: 파도 영상', atmosphere: '오션 블루', routine: 'destination_ocean' },
  { id: 'forest', label: '숲 휴양', description: '고요한 자연의 공기와 소리를 연결해요', device: '공기청정기 자연풍', content: '스탠바이미: 숲 영상', atmosphere: '포레스트 그린', routine: 'destination_forest' },
  { id: 'city', label: '도시 라운지', description: '차분한 야경과 라운지 무드', device: '공기청정기 정숙', content: '스탠바이미: 도시 야경', atmosphere: '바이올렛', routine: 'destination_city' },
  { id: 'housework', label: '가사 케어', description: '집안일 부담을 낮추는 가전 루틴', device: '공기청정기 자동', content: '스탠바이미: 가사 진행 요약', atmosphere: '웜 옐로', routine: 'housework_care' },
]
