import { and, eq } from 'drizzle-orm'
import { employees } from '../../database/schema'
import { getEmployeeSession, logoutEmployee } from '../../utils/auth'
import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getEmployeeSession(event)
  if (!session) {
    return { authenticated: false }
  }

  const [employee] = await getDb()
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
    })
    .from(employees)
    .where(and(
      eq(employees.id, session.employeeId),
      eq(employees.isActive, true),
    ))
    .limit(1)

  if (!employee) {
    await logoutEmployee(event)
    return { authenticated: false }
  }

  return {
    authenticated: true,
    employee,
  }
})
