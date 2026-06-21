import type { DiaryCalendarEntry } from '@/lib/diary-calendar-types'

export const PREPARING_DIARY_DEMO_ENTRIES: DiaryCalendarEntry[] = [
  {
    date: '2026-06-08',
    title: '몸의 리듬을 살핀 날',
    content: '오늘은 평균 주기와 컨디션을 같이 떠올리며 무리하지 않는 저녁 루틴을 잡아보았다.',
    tags: ['몸의 리듬', '생활 루틴'],
    kind: 'diary',
  },
  {
    date: '2026-06-07',
    title: '상담 전에 정리한 마음',
    content: '다음 상담 때 물어볼 주기 기록과 수면 리듬을 메모해두니 준비하는 마음이 조금 차분해졌다.',
    tags: ['산전 상담', '주기 기록'],
    kind: 'diary',
  },
  {
    date: '2026-06-05',
    title: '편안한 집안 리듬',
    content: '환기와 조용한 휴식 시간을 먼저 챙기니 몸 상태를 살피는 일이 더 자연스럽게 느껴졌다.',
    tags: ['휴식', '컨디션'],
    kind: 'diary',
  },
]

export const HUSBAND_PREPARING_DIARY_DEMO_ENTRIES: DiaryCalendarEntry[] = [
  {
    date: '2026-06-08',
    title: '배우자의 컨디션을 살핀 날',
    content: '오늘은 배우자가 편하게 쉴 수 있도록 저녁 일정을 줄이고 수면 리듬을 함께 맞춰보기로 했다.',
    tags: ['배우자 케어', '수면 리듬'],
    kind: 'diary',
  },
  {
    date: '2026-06-07',
    title: '함께 준비한 상담 메모',
    content: '주기 기록과 컨디션 변화에 대해 상담 때 물어볼 내용을 함께 적어두었다.',
    tags: ['산전 상담', '공동 루틴'],
    kind: 'diary',
  },
  {
    date: '2026-06-05',
    title: '생활 루틴을 맞춘 저녁',
    content: '무리한 계획보다 편안한 식사와 휴식 시간을 먼저 챙기는 것이 오늘은 더 필요해 보였다.',
    tags: ['생활 루틴', '휴식 지원'],
    kind: 'diary',
  },
]
