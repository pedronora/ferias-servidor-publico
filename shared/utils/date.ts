import { format } from 'date-fns'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseISODate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null
  }

  return date
}

export function toISODate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateBR(value: string): string {
  const date = parseISODate(value)
  if (!date) {
    return value
  }
  return format(date, 'dd/MM/yyyy')
}

export function formatDateRangeBR(startDate: string, endDate: string): string {
  return `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
}
