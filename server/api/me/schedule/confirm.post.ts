import { eq } from 'drizzle-orm'
import { validateForConfirmation } from '../../../../shared/rules/vacation'
import { vacationPeriods } from '../../../database/schema'
import { throwBusinessError, throwConflict } from '../../../utils/api-errors'
import { requireEmployee } from '../../../utils/auth'
import { assertSameOrigin } from '../../../utils/csrf'
import { getDb } from '../../../utils/db'
import { getEmployeePeriodRows, toVacationPeriod } from '../../../utils/periods'
import { buildScheduleResponse } from '../../../utils/schedule-response'
import { getSettingsRules } from '../../../utils/settings'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const session = await requireEmployee(event)
  const rules = await getSettingsRules()
  const rows = await getEmployeePeriodRows(session.employeeId)

  if (rows.length > 0 && rows.every(period => period.status === 'confirmed')) {
    return buildScheduleResponse(session.employeeId, rules)
  }

  if (rows.some(period => period.status === 'confirmed')) {
    throwConflict('A agenda possui períodos confirmados e não pode ser confirmada novamente.')
  }

  const issues = validateForConfirmation(rows.map(toVacationPeriod), rules)
  if (issues.length > 0) {
    throwBusinessError(issues)
  }

  await getDb()
    .update(vacationPeriods)
    .set({
      status: 'confirmed',
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(vacationPeriods.employeeId, session.employeeId))

  return buildScheduleResponse(session.employeeId, rules)
})
