import {
  deriveStatus,
  getDisabledDates,
  getTotalDays,
  validateSchedule,
  type VacationRules,
} from '../../shared/rules/vacation'
import type { ScheduleResponse } from '../../shared/types/api'
import { getEmployeePeriodRows, serializePeriod, toVacationPeriod } from './periods'

export async function buildScheduleResponse(
  employeeId: string,
  rules: VacationRules,
): Promise<ScheduleResponse> {
  const rows = await getEmployeePeriodRows(employeeId)
  const periods = rows.map(toVacationPeriod)

  return {
    settings: rules,
    periods: rows.map(serializePeriod),
    totalDays: getTotalDays(periods),
    status: deriveStatus(periods),
    canEdit: periods.every(period => period.status === 'draft'),
    disabledDates: getDisabledDates(periods, rules),
    issues: validateSchedule(periods, rules),
  }
}
