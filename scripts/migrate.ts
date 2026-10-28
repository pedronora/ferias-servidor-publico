import 'dotenv/config'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const migrationsFolder = resolve('drizzle/migrations')
const journalPath = resolve(migrationsFolder, 'meta/_journal.json')

if (!existsSync(journalPath)) {
  console.log('Nenhuma migration encontrada; nada a aplicar.')
  process.exit(0)
}

const connectionString = process.env.DATABASE_URL
  ?? 'postgresql://ferias:ferias_dev_password@localhost:5433/ferias_test'

const pool = new Pool({ connectionString })

try {
  const db = drizzle(pool)
  await migrate(db, { migrationsFolder })
  console.log('Migrations aplicadas com sucesso.')
} finally {
  await pool.end()
}
