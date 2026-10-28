import { eq } from 'drizzle-orm'
import type { VacationRules } from '../../shared/rules/vacation'
import { settings } from '../database/schema'
import { getDb } from './db'

export async function getSettingsRules(): Promise<VacationRules> {
  const [row] = await getDb()
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1)

  if (!row) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Configurações do ciclo não encontradas.',
    })
  }

  return {
    cycleStart: row.cycleStart,
    cycleEnd: row.cycleEnd,
    totalDays: row.totalDays,
    maxPeriods: row.maxPeriods,
    minPeriodDays: row.minPeriodDays,
    minGapDays: row.minGapDays,
  }
}
