import { eq } from 'drizzle-orm'
import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { updateEmployeeSchema } from '../../../../shared/schemas/employee'
import { employees } from '../../../database/schema'
import { buildEmployeeSummary } from '../../../utils/admin'
import { isDatabaseError, throwConflict, throwValidationError } from '../../../utils/api-errors'
import { requireAdmin } from '../../../utils/auth'
import { assertSameOrigin } from '../../../utils/csrf'
import { getDb } from '../../../utils/db'
import { getEmployeePeriodRows } from '../../../utils/periods'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  await requireAdmin(event)

  const parsedId = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({ statusCode: 404, statusMessage: 'Servidor não encontrado.' })
  }

  const parsedBody = updateEmployeeSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsedBody.success) {
    throwValidationError(parsedBody.error)
  }

  try {
    const [employee] = await getDb()
      .update(employees)
      .set({
        ...(parsedBody.data.name !== undefined ? { name: parsedBody.data.name } : {}),
        ...(parsedBody.data.email !== undefined ? { email: parsedBody.data.email.toLowerCase() } : {}),
        ...(parsedBody.data.isActive !== undefined ? { isActive: parsedBody.data.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(employees.id, parsedId.data))
      .returning()

    if (!employee) {
      throw createError({ statusCode: 404, statusMessage: 'Servidor não encontrado.' })
    }

    const rows = await getEmployeePeriodRows(employee.id)

    return {
      employee: buildEmployeeSummary(employee, rows),
    }
  } catch (error) {
    if (isDatabaseError(error, '23505')) {
      throwConflict('Já existe um servidor com este e-mail.')
    }
    throw error
  }
})
