import { and, eq } from 'drizzle-orm'
import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { validateSchedule } from '../../../../shared/rules/vacation'
import { employees } from '../../../database/schema'
import { buildEmployeeSummary } from '../../../utils/admin'
import { requireAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { getEmployeePeriodRows, toVacationPeriod } from '../../../utils/periods'
import { getSettingsRules } from '../../../utils/settings'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parsedId = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({ statusCode: 404, statusMessage: 'Servidor não encontrado.' })
  }

  const [employee] = await getDb()
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
  const rows = await getEmployeePeriodRows(employee.id)
  const summary = buildEmployeeSummary(employee, rows)

  return {
    employee: summary,
    settings: rules,
    issues: validateSchedule(rows.map(toVacationPeriod), rules),
  }
})
