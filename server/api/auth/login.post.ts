import { and, eq, sql } from 'drizzle-orm'
import { createError, getRequestIP, readBody } from 'h3'
import { employeeLoginSchema } from '../../../shared/schemas/auth'
import { employees } from '../../database/schema'
import { throwValidationError } from '../../utils/api-errors'
import { loginEmployee } from '../../utils/auth'
import { assertSameOrigin } from '../../utils/csrf'
import { getDb } from '../../utils/db'
import { consumeRateLimit, resetRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const rateLimitKey = `employee-login:${ip}`
  const rateLimit = consumeRateLimit(rateLimitKey, 5, 15 * 60 * 1000)

  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas tentativas. Tente novamente mais tarde.',
      data: { retryAfterSeconds: rateLimit.retryAfterSeconds },
    })
  }

  const parsed = employeeLoginSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const email = parsed.data.email.toLowerCase()
  const [employee] = await getDb()
    .select()
    .from(employees)
    .where(and(
      eq(employees.isActive, true),
      sql`lower(${employees.email}) = ${email}`,
    ))
    .limit(1)

  if (!employee) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Não foi possível entrar com este e-mail.',
    })
  }

  await loginEmployee(event, {
    employeeId: employee.id,
    email: employee.email,
    name: employee.name,
    kind: 'employee',
  })
  resetRateLimit(rateLimitKey)

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
    },
  }
})
