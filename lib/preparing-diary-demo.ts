import type { DiaryCalendarEntry } from '@/lib/diary-calendar-types'

export const PREPARING_DIARY_DEMO_ENTRIES: DiaryCalendarEntry[] = [
  {
    date: new Date().toISOString().slice(0, 10),
    title: '오늘의 컨디션',
    content: '저녁에 가볍게 산책하고 일찍 쉬려고 해요.',
    tags: ['생활 루틴'],
    kind: 'diary',
  },
  {
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    title: '병원 방문 전 메모',
    content: '다음 상담 때 생활 리듬 관련해서 물어볼 내용 정리해 두었어요.',
    tags: ['병원 준비'],
    kind: 'diary',
  },
  {
    date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    title: '집안 환경 체크',
    content: '환기 후 공기청정기 켜두니 실내가 한결 편안해졌어요.',
    tags: ['집안 환경'],
    kind: 'diary',
  },
]
