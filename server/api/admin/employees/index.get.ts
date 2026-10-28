import { and, asc, eq, ilike, or } from 'drizzle-orm'
import { getQuery } from 'h3'
import { employees } from '../../../database/schema'
import { buildEmployeeSummary, groupPeriodsByEmployee } from '../../../utils/admin'
import { requireAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { getPeriodRowsForEmployees } from '../../../utils/periods'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const status = typeof query.status === 'string' ? query.status : ''

  const where = search
    ? and(
      eq(employees.isActive, true),
      or(
        ilike(employees.name, `%${search}%`),
        ilike(employees.email, `%${search}%`),
      ),
    )!
    : eq(employees.isActive, true)

  const employeeRows = await getDb()
    .select()
    .from(employees)
    .where(where)
    .orderBy(asc(employees.name))

  const periodsByEmployee = groupPeriodsByEmployee(await getPeriodRowsForEmployees())
  const summaries = employeeRows.map(employee => buildEmployeeSummary(
    employee,
    periodsByEmployee.get(employee.id) ?? [],
  ))

  const filtered = status
    ? summaries.filter(employee => employee.status === status)
    : summaries

  return {
    employees: filtered,
    total: filtered.length,
  }
})
