import { Pool } from 'pg'

let pool: Pool | undefined

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL não configurada')
  }
  return url
}

export function getPool(): Pool {
  pool ??= new Pool({
    connectionString: getDatabaseUrl(),
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  })
  return pool
}

export async function checkDatabase(): Promise<void> {
  await getPool().query('select 1')
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}
