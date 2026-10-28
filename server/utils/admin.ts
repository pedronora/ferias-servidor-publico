import {
  countDays,
  deriveStatus,
  getTotalDays,
} from '../../shared/rules/vacation'
import type { InferSelectModel } from 'drizzle-orm'
import type {
  Coincidence,
  EmployeeSummary,
  ReportResponse,
} from '../../shared/types/api'
import type { employees } from '../database/schema'
import type { PeriodRow } from './periods'
import { serializePeriod, toVacationPeriod } from './periods'

type EmployeeRow = InferSelectModel<typeof employees>

export function buildEmployeeSummary(employee: EmployeeRow, rows: PeriodRow[]): EmployeeSummary {
  const periods = rows.map(toVacationPeriod)

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    isActive: employee.isActive,
    totalDays: getTotalDays(periods),
    status: deriveStatus(periods),
    periods: rows.map(serializePeriod),
  }
}

export function groupPeriodsByEmployee(rows: PeriodRow[]): Map<string, PeriodRow[]> {
  const grouped = new Map<string, PeriodRow[]>()

  for (const row of rows) {
    const current = grouped.get(row.employeeId) ?? []
    current.push(row)
    grouped.set(row.employeeId, current)
  }

  return grouped
}

export function findCoincidences(employees: EmployeeSummary[]): Coincidence[] {
  const coincidences: Coincidence[] = []

  for (let first = 0; first < employees.length; first += 1) {
    for (let second = first + 1; second < employees.length; second += 1) {
      const employeeA = employees[first]!
      const employeeB = employees[second]!

      for (const periodA of employeeA.periods) {
        for (const periodB of employeeB.periods) {
          const startDate = periodA.startDate > periodB.startDate
            ? periodA.startDate
            : periodB.startDate
          const endDate = periodA.endDate < periodB.endDate
            ? periodA.endDate
            : periodB.endDate

          if (startDate <= endDate) {
            coincidences.push({
              employeeA: { id: employeeA.id, name: employeeA.name },
              employeeB: { id: employeeB.id, name: employeeB.name },
              startDate,
              endDate,
              days: countDays(startDate, endDate),
            })
          }
        }
      }
    }
  }

  return coincidences.sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate)
    }
    return a.employeeA.name.localeCompare(b.employeeB.name)
  })
}

export function buildReport(
  settings: ReportResponse['settings'],
  employees: EmployeeSummary[],
  generatedAt = new Date().toISOString(),
): ReportResponse {
  const statusCount = (status: EmployeeSummary['status']): number =>
    employees.filter(employee => employee.status === status).length

  return {
    settings,
    generatedAt,
    summary: {
      employees: employees.length,
      withSchedule: employees.filter(employee => employee.periods.length > 0).length,
      confirmed: statusCount('confirmed'),
      partial: statusCount('partial'),
      draft: statusCount('draft'),
      empty: statusCount('empty'),
      totalVacationDays: employees.reduce((total, employee) => total + employee.totalDays, 0),
    },
    employees,
    coincidences: findCoincidences(employees),
  }
}
