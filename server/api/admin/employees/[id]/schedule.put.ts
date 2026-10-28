import { and, eq } from 'drizzle-orm'
import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { adminScheduleInputSchema } from '../../../../../shared/schemas/schedule'
import {
  validateForConfirmation,
  validateSchedule,
  validateStructure,
} from '../../../../../shared/rules/vacation'
import { employees, vacationPeriods } from '../../../../database/schema'
import { buildEmployeeSummary } from '../../../../utils/admin'
import { isDatabaseError, throwBusinessError, throwConflict, throwValidationError } from '../../../../utils/api-errors'
import { requireAdmin } from '../../../../utils/auth'
import { assertSameOrigin } from '../../../../utils/csrf'
import { getDb } from '../../../../utils/db'
import { getEmployeePeriodRows } from '../../../../utils/periods'
import { getSettingsRules } from '../../../../utils/settings'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  await requireAdmin(event)

  const parsedId = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({ statusCode: 404, statusMessage: 'Servidor não encontrado.' })
  }

  const parsedBody = adminScheduleInputSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsedBody.success) {
    throwValidationError(parsedBody.error)
  }

  const db = getDb()
  const [employee] = await db
    .select()
    .from(employees)
    .where(and(
      eq(employees.id, parsedId.data),
      eq(employees.isActive, true),
    ))
    .limit(1)

  if (!employee) {
    throw createError({ statusCode: 404, statusMessage: 'Servidor não encontrado.' })
  }

  const rules = await getSettingsRules()
  const existing = await getEmployeePeriodRows(employee.id)
  const existingConfirmed = existing.some(period => period.status === 'confirmed')
  const targetConfirmed = parsedBody.data.confirm || existingConfirmed
  const periods = parsedBody.data.periods

  if (parsedBody.data.override) {
    const structuralIssues = validateStructure(periods)
    if (structuralIssues.length > 0) {
      throwBusinessError(structuralIssues)
    }
  } else {
    const issues = targetConfirmed
      ? validateForConfirmation(periods, rules)
      : validateSchedule(periods, rules)

    if (issues.length > 0) {
      throwBusinessError(issues)
    }
  }

  const overrideReason = parsedBody.data.override
    ? parsedBody.data.overrideReason ?? null
    : null

  try {
    await db.transaction(async (transaction) => {
      await transaction
        .delete(vacationPeriods)
        .where(eq(vacationPeriods.employeeId, employee.id))

      if (periods.length > 0) {
        await transaction.insert(vacationPeriods).values(periods.map(period => ({
          employeeId: employee.id,
          startDate: period.startDate,
          endDate: period.endDate,
          status: targetConfirmed ? 'confirmed' as const : 'draft' as const,
          adminOverride: parsedBody.data.override,
          overrideReason,
          confirmedAt: targetConfirmed ? new Date() : null,
        })))
      }
    })
  } catch (error) {
    if (isDatabaseError(error, '23P01')) {
      throwConflict('Existe sobreposição entre os períodos informados.')
    }
    throw error
  }

  const rows = await getEmployeePeriodRows(employee.id)
  return {
    employee: buildEmployeeSummary(employee, rows),
    settings: rules,
    issues: [],
  }
})
