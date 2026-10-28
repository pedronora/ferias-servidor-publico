import { verify } from '@node-rs/argon2'
import { sql } from 'drizzle-orm'
import { createError, getRequestIP, readBody } from 'h3'
import { loginSchema } from '../../../../shared/schemas/auth'
import { admins } from '../../../database/schema'
import { throwValidationError } from '../../../utils/api-errors'
import { loginAdmin } from '../../../utils/auth'
import { assertSameOrigin } from '../../../utils/csrf'
import { getDb } from '../../../utils/db'
import { consumeRateLimit, resetRateLimit } from '../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const rateLimitKey = `admin-login:${ip}`
  const rateLimit = consumeRateLimit(rateLimitKey, 5, 15 * 60 * 1000)

  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas tentativas. Tente novamente mais tarde.',
      data: { retryAfterSeconds: rateLimit.retryAfterSeconds },
    })
  }

  const parsed = loginSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const email = parsed.data.email.toLowerCase()
  const [admin] = await getDb()
    .select()
    .from(admins)
    .where(sql`lower(${admins.email}) = ${email}`)
    .limit(1)

  const validPassword = admin
    ? await verify(admin.passwordHash, parsed.data.password).catch(() => false)
    : false

  if (!admin || !validPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'E-mail ou senha inválidos.',
    })
  }

  await loginAdmin(event, {
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
    kind: 'admin',
  })
  resetRateLimit(rateLimitKey)

  return {
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
    },
  }
})
