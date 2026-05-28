// Calendar date helpers — no external deps.

export function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
export function startOfWeek(d: Date): Date {
  // Sunday-start
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}
export function endOfWeek(d: Date): Date {
  const x = startOfWeek(d); x.setDate(x.getDate() + 6); x.setHours(23, 59, 59, 999); return x
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/** Returns an array of 42 dates covering the visible month-view grid (6 rows). */
export function monthGrid(reference: Date): Date[] {
  const first = startOfMonth(reference)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

/** Returns the 7 dates for a week view starting Sunday. */
export function weekGrid(reference: Date): Date[] {
  const wkStart = startOfWeek(reference)
  return Array.from({ length: 7 }, (_, i) => addDays(wkStart, i))
}

export function formatMonthYear(d: Date, locale?: string): string {
  return d.toLocaleString(locale, { month: 'long', year: 'numeric' })
}
export function formatDayOfMonth(d: Date): string {
  return String(d.getDate())
}
export function formatWeekday(d: Date, locale?: string, short = false): string {
  return d.toLocaleString(locale, { weekday: short ? 'short' : 'long' })
}
export function formatTime(d: Date, locale?: string): string {
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
}
export function formatTimeRange(start: Date, end: Date, allDay: boolean, locale?: string): string {
  if (allDay) return 'All day'
  return `${formatTime(start, locale)} - ${formatTime(end, locale)}`
}

/** Convert a Date into the value string an <input type="datetime-local"> expects (local TZ). */
export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** Parse a value from <input type="datetime-local"> back to Date in local TZ. */
export function fromDatetimeLocal(s: string): Date {
  return new Date(s)
}

/** Default jitsi room slug derived from an event id. */
export function defaultMeetingRoom(eventId: string): string {
  return `coj-${eventId.slice(0, 8)}`
}
