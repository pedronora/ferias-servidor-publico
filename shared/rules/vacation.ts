import { addDays, differenceInCalendarDays } from 'date-fns'
import { formatDateBR, parseISODate, toISODate } from '../utils/date'

export type VacationPeriodStatus = 'draft' | 'confirmed'
export type ScheduleStatus = 'empty' | 'draft' | 'partial' | 'confirmed'

export interface VacationPeriod {
  id?: string
  startDate: string
  endDate: string
  status?: VacationPeriodStatus
}

export interface VacationRules {
  cycleStart: string
  cycleEnd: string
  totalDays: number
  maxPeriods: number
  minPeriodDays: number
  minGapDays: number
}

export type ValidationIssueCode = 'invalid_date'
  | 'end_before_start'
  | 'outside_cycle'
  | 'too_short'
  | 'too_many_periods'
  | 'overlap'
  | 'insufficient_gap'
  | 'exceeds_total'
  | 'total_mismatch'

export interface ValidationIssue {
  code: ValidationIssueCode
  message: string
  periodIndex?: number
  field?: 'startDate' | 'endDate' | 'periods'
}

interface ParsedPeriod {
  index: number
  startDate: string
  endDate: string
  start: Date
  end: Date
}

function parsePeriod(period: VacationPeriod, index: number): ParsedPeriod | null {
  const start = parseISODate(period.startDate)
  const end = parseISODate(period.endDate)
  if (!start || !end || end < start) {
    return null
  }
  return {
    index,
    startDate: period.startDate,
    endDate: period.endDate,
    start,
    end,
  }
}

export function countDays(startDate: string, endDate: string): number {
  const start = parseISODate(startDate)
  const end = parseISODate(endDate)
  if (!start || !end) {
    return 0
  }
  const difference = differenceInCalendarDays(end, start)
  return difference < 0 ? 0 : difference + 1
}

export function getTotalDays(periods: VacationPeriod[]): number {
  return periods.reduce((total, period) => total + countDays(period.startDate, period.endDate), 0)
}

export function freeDaysBetween(previousEnd: string, nextStart: string): number {
  const previous = parseISODate(previousEnd)
  const next = parseISODate(nextStart)
  if (!previous || !next) {
    return 0
  }
  return differenceInCalendarDays(next, previous) - 1
}

export function earliestNextStart(previousEnd: string, minGapDays: number): string | null {
  const previous = parseISODate(previousEnd)
  if (!previous) {
    return null
  }
  return toISODate(addDays(previous, minGapDays + 1))
}

export function findLastCompletePeriodBefore(periods: VacationPeriod[], index: number): VacationPeriod | null {
  for (let current = Math.min(index - 1, periods.length - 1); current >= 0; current -= 1) {
    const period = periods[current]
    if (period && parsePeriod(period, current)) {
      return period
    }
  }

  return null
}

export function firstAvailableDateFrom(
  startDate: string,
  periods: VacationPeriod[],
  rules: VacationRules,
): string | null {
  const cycleStart = parseISODate(rules.cycleStart)
  const cycleEnd = parseISODate(rules.cycleEnd)
  const start = parseISODate(startDate)

  if (!cycleStart || !cycleEnd || !start) {
    return null
  }

  let cursor = start < cycleStart ? cycleStart : start
  if (cursor > cycleEnd) {
    return null
  }

  const disabled = new Set(getDisabledDates(periods, rules))
  while (cursor <= cycleEnd) {
    const date = toISODate(cursor)
    if (!disabled.has(date)) {
      return date
    }
    cursor = addDays(cursor, 1)
  }

  return null
}

export function suggestedInitialDate(
  periods: VacationPeriod[],
  index: number,
  rules: VacationRules,
  today = new Date(),
): string {
  const cycleStart = parseISODate(rules.cycleStart)
  const cycleEnd = parseISODate(rules.cycleEnd)

  if (!cycleStart || !cycleEnd) {
    return ''
  }

  const currentStart = periods[index] ? parseISODate(periods[index]!.startDate) : null
  if (currentStart) {
    return toISODate(currentStart)
  }

  const previous = findLastCompletePeriodBefore(periods, index)
  const earliestAfterPrevious = previous
    ? parseISODate(earliestNextStart(previous.endDate, rules.minGapDays)!)
    : null
  const fallback = today < cycleStart ? cycleStart : today
  const candidate = earliestAfterPrevious ?? fallback
  const clamped = candidate < cycleStart ? cycleStart : candidate > cycleEnd ? cycleEnd : candidate
  const otherPeriods = periods.filter((_, currentIndex) => currentIndex !== index)

  return firstAvailableDateFrom(toISODate(clamped), otherPeriods, rules) ?? toISODate(clamped)
}

export function findOverlaps(periods: VacationPeriod[]): Array<[number, number]> {
  const parsed = periods
    .map((period, index) => parsePeriod(period, index))
    .filter((period): period is ParsedPeriod => period !== null)

  const overlaps: Array<[number, number]> = []

  for (let first = 0; first < parsed.length; first += 1) {
    for (let second = first + 1; second < parsed.length; second += 1) {
      const a = parsed[first]!
      const b = parsed[second]!
      if (a.start <= b.end && b.start <= a.end) {
        overlaps.push([a.index, b.index])
      }
    }
  }

  return overlaps
}

export function validatePeriod(period: VacationPeriod, rules: VacationRules): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const start = parseISODate(period.startDate)
  const end = parseISODate(period.endDate)

  if (!start) {
    issues.push({
      code: 'invalid_date',
      field: 'startDate',
      message: 'Data inicial inválida.',
    })
  }

  if (!end) {
    issues.push({
      code: 'invalid_date',
      field: 'endDate',
      message: 'Data final inválida.',
    })
  }

  if (!start || !end) {
    return issues
  }

  if (end < start) {
    issues.push({
      code: 'end_before_start',
      message: 'A data final não pode ser anterior à data inicial.',
    })
    return issues
  }

  const cycleStart = parseISODate(rules.cycleStart)
  const cycleEnd = parseISODate(rules.cycleEnd)

  if (cycleStart && start < cycleStart) {
    issues.push({
      code: 'outside_cycle',
      field: 'startDate',
      message: `A data inicial deve estar entre ${formatDateBR(rules.cycleStart)} e ${formatDateBR(rules.cycleEnd)}.`,
    })
  }

  if (cycleEnd && end > cycleEnd) {
    issues.push({
      code: 'outside_cycle',
      field: 'endDate',
      message: `A data final deve estar entre ${formatDateBR(rules.cycleStart)} e ${formatDateBR(rules.cycleEnd)}.`,
    })
  }

  const days = differenceInCalendarDays(end, start) + 1
  if (days < rules.minPeriodDays) {
    issues.push({
      code: 'too_short',
      message: `Cada período deve ter pelo menos ${rules.minPeriodDays} dia(s).`,
    })
  }

  return issues
}

export function validateStructure(periods: VacationPeriod[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  periods.forEach((period, index) => {
    const start = parseISODate(period.startDate)
    const end = parseISODate(period.endDate)

    if (!start) {
      issues.push({
        code: 'invalid_date',
        field: 'startDate',
        periodIndex: index,
        message: 'Data inicial inválida.',
      })
    }

    if (!end) {
      issues.push({
        code: 'invalid_date',
        field: 'endDate',
        periodIndex: index,
        message: 'Data final inválida.',
      })
    }

    if (start && end && end < start) {
      issues.push({
        code: 'end_before_start',
        periodIndex: index,
        message: 'A data final não pode ser anterior à data inicial.',
      })
    }
  })

  for (const [first, second] of findOverlaps(periods)) {
    issues.push({
      code: 'overlap',
      periodIndex: second,
      message: `O período ${second + 1} se sobrepõe ao período ${first + 1}.`,
    })
  }

  return issues
}

export function validateSchedule(periods: VacationPeriod[], rules: VacationRules): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (periods.length > rules.maxPeriods) {
    issues.push({
      code: 'too_many_periods',
      field: 'periods',
      message: `A agenda permite no máximo ${rules.maxPeriods} períodos.`,
    })
  }

  periods.forEach((period, index) => {
    for (const issue of validatePeriod(period, rules)) {
      issues.push({ ...issue, periodIndex: index })
    }
  })

  for (const [first, second] of findOverlaps(periods)) {
    issues.push({
      code: 'overlap',
      periodIndex: second,
      message: `O período ${second + 1} se sobrepõe ao período ${first + 1}.`,
    })
  }

  const parsed = periods
    .map((period, index) => parsePeriod(period, index))
    .filter((period): period is ParsedPeriod => period !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  for (let index = 1; index < parsed.length; index += 1) {
    const previous = parsed[index - 1]!
    const current = parsed[index]!

    if (current.start <= previous.end) {
      continue
    }

    const freeDays = differenceInCalendarDays(current.start, previous.end) - 1
    if (freeDays < rules.minGapDays) {
      const dayLabel = freeDays === 1 ? 'dia livre' : 'dias livres'
      issues.push({
        code: 'insufficient_gap',
        periodIndex: current.index,
        message: `Existem apenas ${freeDays} ${dayLabel} entre ${formatDateBR(previous.endDate)} e ${formatDateBR(current.startDate)}; o mínimo é ${rules.minGapDays}.`,
      })
    }
  }

  const totalDays = getTotalDays(periods)
  if (totalDays > rules.totalDays) {
    issues.push({
      code: 'exceeds_total',
      field: 'periods',
      message: `A agenda soma ${totalDays} dias, acima do limite de ${rules.totalDays}.`,
    })
  }

  return issues
}

export function validateForConfirmation(periods: VacationPeriod[], rules: VacationRules): ValidationIssue[] {
  const issues = validateSchedule(periods, rules)
  const totalDays = getTotalDays(periods)

  if (totalDays !== rules.totalDays) {
    issues.push({
      code: 'total_mismatch',
      field: 'periods',
      message: `A confirmação exige exatamente ${rules.totalDays} dias; a agenda atual soma ${totalDays}.`,
    })
  }

  return issues
}

export function deriveStatus(periods: VacationPeriod[]): ScheduleStatus {
  if (periods.length === 0) {
    return 'empty'
  }

  const confirmed = periods.filter(period => period.status === 'confirmed').length
  if (confirmed === periods.length) {
    return 'confirmed'
  }
  if (confirmed > 0) {
    return 'partial'
  }
  return 'draft'
}

export function getOccupiedDates(periods: VacationPeriod[]): string[] {
  const dates = new Set<string>()

  for (const [index, period] of periods.entries()) {
    const parsed = parsePeriod(period, index)
    if (!parsed) {
      continue
    }

    let cursor = parsed.start
    while (cursor <= parsed.end) {
      dates.add(toISODate(cursor))
      cursor = addDays(cursor, 1)
    }
  }

  return [...dates].sort()
}

export function getBlockedGapDates(periods: VacationPeriod[], rules: VacationRules): string[] {
  const cycleEnd = parseISODate(rules.cycleEnd)
  const dates = new Set<string>()

  for (const [index, period] of periods.entries()) {
    const parsed = parsePeriod(period, index)
    if (!parsed || !cycleEnd) {
      continue
    }

    for (let offset = 1; offset <= rules.minGapDays; offset += 1) {
      const blocked = addDays(parsed.end, offset)
      if (blocked > cycleEnd) {
        break
      }
      dates.add(toISODate(blocked))
    }
  }

  return [...dates].sort()
}

export function getDisabledDates(periods: VacationPeriod[], rules: VacationRules): string[] {
  const dates = new Set([
    ...getOccupiedDates(periods),
    ...getBlockedGapDates(periods, rules),
  ])

  return [...dates]
    .filter(date => date >= rules.cycleStart && date <= rules.cycleEnd)
    .sort()
}

export function isDateDisabled(date: string, periods: VacationPeriod[], rules: VacationRules): boolean {
  if (!parseISODate(date) || date < rules.cycleStart || date > rules.cycleEnd) {
    return true
  }

  return getDisabledDates(periods, rules).includes(date)
}
