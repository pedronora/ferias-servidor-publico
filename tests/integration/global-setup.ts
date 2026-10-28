import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
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
        break
      } catch (error) {
        lastError = error
        if (attempt === 30) {
          throw lastError
        }
        await new Promise(resolve => setTimeout(resolve, 1_000))
      }
    }

    await migrate(drizzle(pool), {
      migrationsFolder: resolve(process.cwd(), 'drizzle/migrations'),
    })
  } finally {
    await pool.end()
  }
}
