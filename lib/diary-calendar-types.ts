export type DiaryCalendarEntryKind = 'diary' | 'checkup' | 'preparation'

export type DiaryCalendarEntry = {
  date: string
  title: string
  content: string
  tags: string[]
  kind?: DiaryCalendarEntryKind
}
