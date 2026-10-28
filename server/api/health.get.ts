import { checkDatabase } from '../utils/database'

export default defineEventHandler(async () => {
  const startedAt = Date.now()

  try {
    await checkDatabase()

    return {
      status: 'ok',
      db: 'ok',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    }
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Serviço indisponível',
      data: {
        status: 'error',
        db: 'error',
      },
    })
  }
})
