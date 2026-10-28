import { existsSync } from 'node:fs'
import { hash } from '@node-rs/argon2'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { admins, employees, settings, vacationPeriods } from '../server/database/schema'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const connectionString = process.env.DATABASE_URL
  ?? 'postgresql://ferias:ferias_dev_password@localhost:5433/ferias_test'

const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase()
const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin12345'
const seedDemoData = process.env.SEED_DEMO_DATA === 'true'

const demoEmployees = [
  {
    name: 'Maria Souza',
    email: 'maria@example.com',
    periods: [
      { startDate: '2027-01-10', endDate: '2027-01-19', status: 'confirmed' as const },
      { startDate: '2027-02-04', endDate: '2027-02-13', status: 'confirmed' as const },
      { startDate: '2027-03-01', endDate: '2027-03-10', status: 'confirmed' as const },
    ],
  },
  {
    name: 'João Pereira',
    email: 'joao@example.com',
    periods: [
      { startDate: '2027-01-10', endDate: '2027-01-19', status: 'confirmed' as const },
      { startDate: '2027-02-04', endDate: '2027-02-13', status: 'confirmed' as const },
      { startDate: '2027-03-01', endDate: '2027-03-10', status: 'confirmed' as const },
    ],
  },
  {
    name: 'Ana Lima',
    email: 'ana@example.com',
    periods: [
      { startDate: '2027-07-10', endDate: '2027-07-19', status: 'draft' as const },
    ],
  },
]

const pool = new Pool({ connectionString })
const db = drizzle(pool)

async function seedAdmin(): Promise<void> {
  const existing = await db
    .select({ id: admins.id })
    .from(admins)
    .where(sql`lower(${admins.email}) = ${adminEmail}`)
    .limit(1)

  if (existing.length > 0) {
    console.log(`Admin ${adminEmail} já existe; senha preservada.`)
    return
  }

  await db.insert(admins).values({
    name: 'Administrador',
    email: adminEmail,
    passwordHash: await hash(adminPassword),
  })
  console.log(`Admin ${adminEmail} criado.`)
}

async function seedSettings(): Promise<void> {
  await db.insert(settings).values({
    id: 1,
    cycleStart: '2027-01-01',
    cycleEnd: '2027-12-31',
    totalDays: 30,
    maxPeriods: 3,
    minPeriodDays: 1,
    minGapDays: 15,
  }).onConflictDoNothing({ target: settings.id })

  console.log('Configurações do ciclo garantidas.')
}

async function seedDemo(): Promise<void> {
  if (!seedDemoData) {
    return
  }

  for (const demo of demoEmployees) {
    const existing = await db
      .select({ id: employees.id })
      .from(employees)
      .where(sql`lower(${employees.email}) = ${demo.email}`)
      .limit(1)

    let employeeId = existing[0]?.id

    if (!employeeId) {
      const created = await db.insert(employees).values({
        name: demo.name,
        email: demo.email,
      }).returning({ id: employees.id })
      employeeId = created[0]!.id
      console.log(`Servidor demo ${demo.email} criado.`)
    }

    const existingPeriods = await db
      .select({ id: vacationPeriods.id })
      .from(vacationPeriods)
      .where(eq(vacationPeriods.employeeId, employeeId))
      .limit(1)

    if (existingPeriods.length === 0) {
      await db.insert(vacationPeriods).values(demo.periods.map(period => ({
        startDate: period.startDate,
        endDate: period.endDate,
        employeeId,
        status: period.status,
        confirmedAt: period.status === 'confirmed' ? new Date() : null,
      })))
      console.log(`Períodos demo de ${demo.email} criados.`)
    }
  }
}

async function main(): Promise<void> {
  await seedAdmin()
  await seedSettings()
  await seedDemo()
}

try {
  await main()
} catch (error) {
  console.error('Falha ao executar o seed:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
