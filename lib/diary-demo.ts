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

export const HUSBAND_DEMO_DIARY_CALENDAR_ENTRIES: DiaryCalendarEntry[] = [
  {
    date: '2026-06-08',
    title: '아내의 입덧을 살핀 날',
    content: '아내가 냄새에 예민해 보여 환기를 하고 자극이 적은 음식을 준비했다. 조금 편안해진 모습을 보니 마음이 놓였다.',
    tags: ['입덧 케어', '배우자 돌봄'],
    kind: 'diary',
  },
  {
    date: '2026-06-07',
    title: '함께 천천히 쉬어간 하루',
    content: '아내가 편히 낮잠을 잘 수 있도록 방을 정리하고 조명을 낮췄다. 오늘은 무리하지 않고 곁을 지키는 데 집중했다.',
    tags: ['수면 환경', '휴식 지원'],
    kind: 'diary',
  },
  {
    date: '2026-06-06',
    title: '검진에 함께 다녀온 날',
    content: '아내와 정기 검진에 다녀왔다. 의료진의 설명을 함께 듣고 다음 일정과 챙길 내용을 메모했다.',
    tags: ['병원 동행', '검진 기록'],
    kind: 'diary',
  },
]
