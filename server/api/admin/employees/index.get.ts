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
  const situation = query.situation === 'active' || query.situation === 'inactive'
    ? query.situation
    : 'all'

  const situationCondition = situation === 'all'
    ? undefined
    : eq(employees.isActive, situation === 'active')
  const searchCondition = search
    ? or(
        ilike(employees.name, `%${search}%`),
        ilike(employees.email, `%${search}%`),
      )
    : undefined

  const employeeRows = await getDb()
    .select()
    .from(employees)
    .where(and(situationCondition, searchCondition))
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
