const DAY_MS = 24 * 60 * 60 * 1000

function actualResetDate(year: number, month: number, resetDay: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  if (resetDay <= lastDay) return new Date(year, month, resetDay)
  return new Date(year, month + 1, 1)
}

function sameCalendarDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function calendarDayDistance(from: Date, to: Date): number {
  const fromUTC = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toUTC = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.max(0, Math.round((toUTC - fromUTC) / DAY_MS))
}

export function daysUntilTrafficReset(resetDay?: number, now = new Date()): number | undefined {
  if (!Number.isInteger(resetDay) || !resetDay || resetDay < 1 || resetDay > 31) return undefined

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisMonth = actualResetDate(today.getFullYear(), today.getMonth(), resetDay)
  const previousMonth = actualResetDate(today.getFullYear(), today.getMonth() - 1, resetDay)

  if (sameCalendarDay(today, thisMonth) || sameCalendarDay(today, previousMonth)) return 0
  if (today < thisMonth) return calendarDayDistance(today, thisMonth)

  const nextMonth = actualResetDate(today.getFullYear(), today.getMonth() + 1, resetDay)
  return calendarDayDistance(today, nextMonth)
}
