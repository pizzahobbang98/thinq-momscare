import type { DiaryCalendarEntry } from '@/lib/diary-calendar-types'

export const DEMO_DIARY_CALENDAR_ENTRIES: DiaryCalendarEntry[] = [
  {
    date: '2026-06-08',
    title: '입덧이 조금 힘들었던 날',
    content: '오늘은 냄새에 예민했지만, 입덧모드 덕분에 조금 편안해졌다.',
    tags: ['입덧모드', '케어기록'],
    kind: 'diary',
  },
  {
    date: '2026-06-07',
    title: '천천히 쉬어가던 하루',
    content: '수면모드로 방을 정리한 뒤 오후 낮잠을 조금 잤다. 몸이 한결 가벼워진 느낌이었다.',
    tags: ['수면모드', '휴식'],
    kind: 'diary',
  },
  {
    date: '2026-06-06',
    title: '병원 다녀온 날',
    content: '정기 검진을 다녀왔다. 집에 돌아와서 초음파 사진을 다시 보며 오늘을 기록했다.',
    tags: ['병원일정', '초음파메모리'],
    kind: 'diary',
  },
]
