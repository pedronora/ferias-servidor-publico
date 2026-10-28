import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { VacationPeriodStatus } from '../../shared/rules/vacation'

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('employees_email_unique').on(sql`lower(${table.email})`),
  index('employees_active_idx').on(table.isActive),
  check('employees_name_not_blank', sql`length(trim(${table.name})) > 0`),
  check('employees_email_not_blank', sql`length(trim(${table.email})) > 0`),
])

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('admins_email_unique').on(sql`lower(${table.email})`),
  check('admins_name_not_blank', sql`length(trim(${table.name})) > 0`),
  check('admins_email_not_blank', sql`length(trim(${table.email})) > 0`),
])

export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  cycleStart: date('cycle_start').notNull(),
  cycleEnd: date('cycle_end').notNull(),
  totalDays: integer('total_days').notNull().default(30),
  maxPeriods: integer('max_periods').notNull().default(3),
  minPeriodDays: integer('min_period_days').notNull().default(1),
  minGapDays: integer('min_gap_days').notNull().default(15),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('settings_single_row', sql`${table.id} = 1`),
  check('settings_cycle_valid', sql`${table.cycleEnd} >= ${table.cycleStart}`),
  check(
    'settings_positive_values',
    sql`${table.totalDays} > 0 AND ${table.maxPeriods} > 0 AND ${table.minPeriodDays} > 0 AND ${table.minGapDays} >= 0`,
  ),
])

export const vacationPeriods = pgTable('vacation_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: text('status').$type<VacationPeriodStatus>().notNull().default('draft'),
  adminOverride: boolean('admin_override').notNull().default(false),
  overrideReason: text('override_reason'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('vacation_periods_employee_idx').on(table.employeeId),
  index('vacation_periods_status_idx').on(table.status),
  check('vacation_periods_dates_valid', sql`${table.endDate} >= ${table.startDate}`),
  check('vacation_periods_status_valid', sql`${table.status} IN ('draft', 'confirmed')`),
  check(
    'vacation_periods_override_reason',
    sql`(${table.adminOverride} = false AND ${table.overrideReason} IS NULL) OR (${table.adminOverride} = true AND ${table.overrideReason} IS NOT NULL AND length(trim(${table.overrideReason})) > 0)`,
  ),
])

export const employeesRelations = relations(employees, ({ many }) => ({
  vacationPeriods: many(vacationPeriods),
}))

export const vacationPeriodsRelations = relations(vacationPeriods, ({ one }) => ({
  employee: one(employees, {
    fields: [vacationPeriods.employeeId],
    references: [employees.id],
  }),
}))
