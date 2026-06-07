export function calculateCurrentWeeksFromDueDate(dueDate: string) {
  const today = new Date()
  const due = new Date(dueDate)
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(42, 40 - Math.floor(daysUntilDue / 7)))
}
