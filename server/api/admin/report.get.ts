import { asc, eq } from 'drizzle-orm'
import { employees } from '../../database/schema'
import { buildEmployeeSummary, buildReport, groupPeriodsByEmployee } from '../../utils/admin'
import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { getPeriodRowsForEmployees } from '../../utils/periods'
import { getSettingsRules } from '../../utils/settings'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const settings = await getSettingsRules()
  const employeeRows = await getDb()
    .select()
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.name))

  const periodsByEmployee = groupPeriodsByEmployee(await getPeriodRowsForEmployees())
  const summaries = employeeRows.map(employee => buildEmployeeSummary(
    employee,
    periodsByEmployee.get(employee.id) ?? [],
  ))

  return buildReport(settings, summaries)
})
