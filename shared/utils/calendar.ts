import { addDays, endOfMonth, endOfWeek, startOfWeek } from 'date-fns'
import { parseISODate, toISODate } from './date'

export interface CalendarPeriod {
  startDate: string
  endDate: string
}

export interface CalendarEmployee {
  periods: CalendarPeriod[]
}

export interface AnnualWeek {
  startDate: string
  endDate: string
  monthKey: string
}

export interface AnnualMonthGroup {
  key: string
  label: string
  weeks: AnnualWeek[]
}

export interface MonthDay {
  date: string
  day: number
  inMonth: boolean
  inCycle: boolean
}

export interface MonthWeek {
  days: MonthDay[]
}

export interface CalendarMonthOption {
  year: number
  month: number
  label: string
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const GENERATED_MONTH_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
})

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(year: number, month: number): string {
  return `${capitalize(MONTH_FORMATTER.format(new Date(year, month - 1, 1)))} de ${year}`
}

function formatAnnualMonthLabel(key: string, includeYear: boolean): string {
  const [yearText, monthText] = key.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const label = capitalize(
    SHORT_MONTH_FORMATTER.format(new Date(year, month - 1, 1)).replace(/\.$/, ''),
  )

  return includeYear ? `${label}/${year}` : label
}

function resolveWeekMonthKey(
  weekStart: Date,
  weekEnd: Date,
  cycleStart: Date,
  cycleEnd: Date,
): string {
  if (weekStart <= cycleStart && cycleStart <= weekEnd) {
    return monthKey(cycleStart)
  }

  if (weekStart <= cycleEnd && cycleEnd <= weekEnd) {
    return monthKey(cycleEnd)
  }

  for (let cursor = weekStart; cursor <= weekEnd; cursor = addDays(cursor, 1)) {
    if (cursor >= cycleStart && cursor <= cycleEnd && cursor.getDate() === 1) {
      return monthKey(cursor)
    }
  }

  return monthKey(weekStart)
}

export function buildAnnualWeeks(cycleStart: string, cycleEnd: string): AnnualWeek[] {
  const start = parseISODate(cycleStart)
  const end = parseISODate(cycleEnd)

  if (!start || !end || start > end) {
    return []
  }

  const weeks: AnnualWeek[] = []
  const firstWeekStart = startOfWeek(start, { weekStartsOn: 1 })
  const lastWeekStart = startOfWeek(end, { weekStartsOn: 1 })

  for (let cursor = firstWeekStart; cursor <= lastWeekStart; cursor = addDays(cursor, 7)) {
    const weekEnd = addDays(cursor, 6)

    weeks.push({
      startDate: toISODate(cursor),
      endDate: toISODate(weekEnd),
      monthKey: resolveWeekMonthKey(cursor, weekEnd, start, end),
    })
  }

  return weeks
}

export function groupAnnualWeeksByMonth(weeks: AnnualWeek[]): AnnualMonthGroup[] {
  const includeYear = new Set(weeks.map(week => week.monthKey.slice(0, 4))).size > 1
  const groups: AnnualMonthGroup[] = []

  for (const week of weeks) {
    const current = groups[groups.length - 1]

    if (current && current.key === week.monthKey) {
      current.weeks.push(week)
      continue
    }

    groups.push({
      key: week.monthKey,
      label: formatAnnualMonthLabel(week.monthKey, includeYear),
      weeks: [week],
    })
  }

  return groups
}

export function buildMonthWeeks(
  year: number,
  month: number,
  cycleStart: string,
  cycleEnd: string,
): MonthWeek[] {
  if (month < 1 || month > 12) {
    return []
  }

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = endOfMonth(firstDay)
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(lastDay, { weekStartsOn: 0 })
  const weeks: MonthWeek[] = []
  let days: MonthDay[] = []

  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    const date = toISODate(cursor)

    days.push({
      date,
      day: cursor.getDate(),
      inMonth: cursor.getFullYear() === year && cursor.getMonth() === month - 1,
      inCycle: date >= cycleStart && date <= cycleEnd,
    })

    if (days.length === 7) {
      weeks.push({ days })
      days = []
    }
  }

  return weeks
}

export function getCycleMonths(cycleStart: string, cycleEnd: string): CalendarMonthOption[] {
  const start = parseISODate(cycleStart)
  const end = parseISODate(cycleEnd)

  if (!start || !end || start > end) {
    return []
  }

  const months: CalendarMonthOption[] = []
  const endYear = end.getFullYear()
  const endMonth = end.getMonth() + 1
  let year = start.getFullYear()
  let month = start.getMonth() + 1

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month, label: formatMonthLabel(year, month) })
    month += 1

    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return months
}

export function getCycleYears(cycleStart: string, cycleEnd: string): number[] {
  return [...new Set(getCycleMonths(cycleStart, cycleEnd).map(month => month.year))]
}

export function periodCoversDate(period: CalendarPeriod, date: string): boolean {
  if (
    !parseISODate(period.startDate)
    || !parseISODate(period.endDate)
    || !parseISODate(date)
  ) {
    return false
  }

  return period.startDate <= date && date <= period.endDate
}

export function periodOverlapsRange(
  period: CalendarPeriod,
  startDate: string,
  endDate: string,
): boolean {
  if (
    !parseISODate(period.startDate)
    || !parseISODate(period.endDate)
    || !parseISODate(startDate)
    || !parseISODate(endDate)
  ) {
    return false
  }

  return period.startDate <= endDate && period.endDate >= startDate
}

export function getEmployeesOnDate<T extends CalendarEmployee>(
  employees: T[],
  date: string,
  cycleStart: string,
  cycleEnd: string,
): T[] {
  if (
    !parseISODate(date)
    || !parseISODate(cycleStart)
    || !parseISODate(cycleEnd)
    || date < cycleStart
    || date > cycleEnd
  ) {
    return []
  }

  return employees.filter(employee =>
    employee.periods.some(period => periodCoversDate(period, date)))
}

export function getEmployeesInRange<T extends CalendarEmployee>(
  employees: T[],
  startDate: string,
  endDate: string,
  cycleStart: string,
  cycleEnd: string,
): T[] {
  if (
    !parseISODate(startDate)
    || !parseISODate(endDate)
    || !parseISODate(cycleStart)
    || !parseISODate(cycleEnd)
  ) {
    return []
  }

  const from = startDate < cycleStart ? cycleStart : startDate
  const to = endDate > cycleEnd ? cycleEnd : endDate

  if (from > to) {
    return []
  }

  return employees.filter(employee =>
    employee.periods.some(period => periodOverlapsRange(period, from, to)))
}

export function countEmployeeDaysInRange(
  periods: CalendarPeriod[],
  startDate: string,
  endDate: string,
): number {
  const start = parseISODate(startDate)
  const end = parseISODate(endDate)

  if (!start || !end || start > end) {
    return 0
  }

  let count = 0

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const date = toISODate(cursor)

    if (periods.some(period => periodCoversDate(period, date))) {
      count += 1
    }
  }

  return count
}

export function countEmployeesInMonth(
  employees: CalendarEmployee[],
  year: number,
  month: number,
  cycleStart: string,
  cycleEnd: string,
): number {
  if (month < 1 || month > 12) {
    return 0
  }

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = endOfMonth(firstDay)

  return getEmployeesInRange(
    employees,
    toISODate(firstDay),
    toISODate(lastDay),
    cycleStart,
    cycleEnd,
  ).length
}

export function resolveInitialMonth(
  generatedAt: string,
  cycleStart: string,
  cycleEnd: string,
): { year: number, month: number } {
  const cycleStartDate = parseISODate(cycleStart)
  const cycleEndDate = parseISODate(cycleEnd)
  const fallbackDate = cycleStartDate ?? new Date()
  const fallback = {
    year: fallbackDate.getFullYear(),
    month: fallbackDate.getMonth() + 1,
  }

  if (!cycleStartDate || !cycleEndDate || cycleStartDate > cycleEndDate) {
    return fallback
  }

  const generated = new Date(generatedAt)
  if (Number.isNaN(generated.getTime())) {
    return fallback
  }

  const parts = GENERATED_MONTH_FORMATTER.formatToParts(generated)
  const year = Number(parts.find(part => part.type === 'year')?.value)
  const month = Number(parts.find(part => part.type === 'month')?.value)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return fallback
  }

  const startYear = cycleStartDate.getFullYear()
  const startMonth = cycleStartDate.getMonth() + 1
  const endYear = cycleEndDate.getFullYear()
  const endMonth = cycleEndDate.getMonth() + 1

  if (year < startYear || (year === startYear && month < startMonth)) {
    return { year: startYear, month: startMonth }
  }

  if (year > endYear || (year === endYear && month > endMonth)) {
    return { year: endYear, month: endMonth }
  }

  return { year, month }
}
