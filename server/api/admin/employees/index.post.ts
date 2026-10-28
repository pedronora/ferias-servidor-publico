import { readBody, setResponseStatus } from 'h3'
import { createEmployeeSchema } from '../../../../shared/schemas/employee'
import { employees } from '../../../database/schema'
import { buildEmployeeSummary } from '../../../utils/admin'
import { isDatabaseError, throwConflict, throwValidationError } from '../../../utils/api-errors'
import { requireAdmin } from '../../../utils/auth'
import { assertSameOrigin } from '../../../utils/csrf'
import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  await requireAdmin(event)

  const parsed = createEmployeeSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  try {
    const [employee] = await getDb()
      .insert(employees)
      .values({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        isActive: true,
      })
      .returning()

    if (!employee) {
      throw new Error('Servidor não foi criado.')
    }

    setResponseStatus(event, 201)

    return {
      employee: buildEmployeeSummary(employee, []),
    }
  } catch (error) {
    if (isDatabaseError(error, '23505')) {
      throwConflict('Já existe um servidor com este e-mail.')
    }
    throw error
  }
})
