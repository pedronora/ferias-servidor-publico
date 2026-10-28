import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL
      ?? 'postgresql://ferias:ferias_dev_password@localhost:5433/ferias_test',
  },
  strict: true,
  verbose: true,
})
