export function calculateCurrentWeeksFromDueDate(dueDate: string) {
  const today = new Date()
  const due = new Date(dueDate)
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(42, 40 - Math.floor(daysUntilDue / 7)))
}

export function calculateDueDateFromWeeks(weeks: number) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (40 - weeks) * 7)
  return dueDate.toISOString().split('T')[0]
}
