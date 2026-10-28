import { asc, eq } from 'drizzle-orm'
import type { VacationPeriod } from '../../shared/rules/vacation'
import type { PeriodResponse } from '../../shared/types/api'
import { vacationPeriods } from '../database/schema'
import { getDb } from './db'

export type PeriodRow = typeof vacationPeriods.$inferSelect

export function toVacationPeriod(row: PeriodRow): VacationPeriod {
  return {
    id: row.id,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
  }
}

export function serializePeriod(row: PeriodRow): PeriodResponse {
  return {
    id: row.id,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    adminOverride: row.adminOverride,
    overrideReason: row.overrideReason,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
  }
}

export async function getEmployeePeriodRows(employeeId: string): Promise<PeriodRow[]> {
  return getDb()
    .select()
    .from(vacationPeriods)
    .where(eq(vacationPeriods.employeeId, employeeId))
    .orderBy(asc(vacationPeriods.startDate))
}

export async function getPeriodRowsForEmployees(): Promise<PeriodRow[]> {
  return getDb()
    .select()
    .from(vacationPeriods)
    .orderBy(asc(vacationPeriods.startDate))
}
