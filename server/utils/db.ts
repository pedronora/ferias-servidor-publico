import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../database/schema'
import { getPool } from './database'

let database: NodePgDatabase<typeof schema> | undefined

export function getDb(): NodePgDatabase<typeof schema> {
  database ??= drizzle(getPool(), { schema })
  return database
}
