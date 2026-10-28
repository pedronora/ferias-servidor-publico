import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
  ?? 'postgresql://ferias:ferias_dev_password@localhost:5433/ferias_test'

export default async function globalSetup(): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL })

  try {
    let lastError: unknown
    for (let attempt = 1; attempt <= 30; attempt++) {
      try {
        await pool.query('select 1')
        return
      } catch (error) {
        lastError = error
        await new Promise(resolve => setTimeout(resolve, 1_000))
      }
    }
    throw lastError
  } finally {
    await pool.end()
  }
}
