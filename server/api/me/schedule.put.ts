import { and, eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { scheduleInputSchema } from '../../../shared/schemas/schedule'
import { validateSchedule } from '../../../shared/rules/vacation'
import { vacationPeriods } from '../../database/schema'
import { isDatabaseError, throwBusinessError, throwConflict, throwValidationError } from '../../utils/api-errors'
import { requireEmployee } from '../../utils/auth'
import { assertSameOrigin } from '../../utils/csrf'
import { getDb } from '../../utils/db'
import { getEmployeePeriodRows } from '../../utils/periods'
import { buildScheduleResponse } from '../../utils/schedule-response'
import { getSettingsRules } from '../../utils/settings'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const session = await requireEmployee(event)
  const parsed = scheduleInputSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const existing = await getEmployeePeriodRows(session.employeeId)
  if (existing.some(period => period.status === 'confirmed')) {
    throwConflict('A agenda já foi confirmada e não pode mais ser alterada pelo servidor.')
  }

  const rules = await getSettingsRules()
  const issues = validateSchedule(parsed.data.periods, rules)
  if (issues.length > 0) {
    throwBusinessError(issues)
  }

  try {
    await getDb().transaction(async (transaction) => {
      await transaction
        .delete(vacationPeriods)
        .where(and(
          eq(vacationPeriods.employeeId, session.employeeId),
          eq(vacationPeriods.status, 'draft'),
        ))

      if (parsed.data.periods.length > 0) {
        await transaction.insert(vacationPeriods).values(parsed.data.periods.map(period => ({
          employeeId: session.employeeId,
          startDate: period.startDate,
          endDate: period.endDate,
          status: 'draft' as const,
        })))
      }
    })
  } catch (error) {
    if (isDatabaseError(error, '23P01')) {
      throwConflict('Existe sobreposição entre os períodos informados.')
    }
    throw error
  }

  return buildScheduleResponse(session.employeeId, rules)
})
