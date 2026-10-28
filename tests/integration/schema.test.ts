import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
  ?? 'postgresql://ferias:ferias_dev_password@localhost:5433/ferias_test'

const pool = new Pool({ connectionString: DATABASE_URL })

async function createEmployee(email: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    'insert into employees (name, email, password_hash) values ($1, $2, $3) returning id',
    ['Servidor de teste', email, 'hash-de-teste'],
  )
  return result.rows[0]!.id
}

async function expectDatabaseError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise
  } catch (error) {
    expect((error as { code?: string }).code).toBe(code)
    return
  }
  throw new Error('A operação deveria ter falhado.')
}

describe('constraints do banco', () => {
  beforeAll(async () => {
    await pool.query('select 1')
  })

  afterEach(async () => {
    await pool.query(`delete from employees where email like 'test-%@example.com'`)
    await pool.query('delete from settings where id <> 1')
  })

  afterAll(async () => {
    await pool.end()
  })

  it('cria as tabelas esperadas', async () => {
    const result = await pool.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name in ('admins', 'employees', 'settings', 'vacation_periods')
       order by table_name`,
    )

    expect(result.rows.map(row => row.table_name)).toEqual([
      'admins',
      'employees',
      'settings',
      'vacation_periods',
    ])
  })

  it('impede e-mail duplicado sem diferenciar maiúsculas', async () => {
    await createEmployee('test-case@example.com')

    await expectDatabaseError(
      pool.query(
        'insert into employees (name, email, password_hash) values ($1, $2, $3)',
        ['Outro', 'TEST-CASE@example.com', 'hash'],
      ),
      '23505',
    )
  })

  it('impede período com fim anterior ao início', async () => {
    const employeeId = await createEmployee('test-inverted@example.com')

    await expectDatabaseError(
      pool.query(
        `insert into vacation_periods (employee_id, start_date, end_date)
         values ($1, '2027-03-19', '2027-03-10')`,
        [employeeId],
      ),
      '23514',
    )
  })

  it('impede sobreposição para o mesmo servidor', async () => {
    const employeeId = await createEmployee('test-overlap@example.com')

    await pool.query(
      `insert into vacation_periods (employee_id, start_date, end_date)
       values ($1, '2027-03-10', '2027-03-19')`,
      [employeeId],
    )

    await expectDatabaseError(
      pool.query(
        `insert into vacation_periods (employee_id, start_date, end_date)
         values ($1, '2027-03-19', '2027-03-28')`,
        [employeeId],
      ),
      '23P01',
    )
  })

  it('permite o mesmo período para servidores diferentes', async () => {
    const first = await createEmployee('test-first@example.com')
    const second = await createEmployee('test-second@example.com')

    await pool.query(
      `insert into vacation_periods (employee_id, start_date, end_date)
       values ($1, '2027-03-10', '2027-03-19'), ($2, '2027-03-10', '2027-03-19')`,
      [first, second],
    )

    const result = await pool.query<{ count: string }>(
      'select count(*) from vacation_periods where employee_id in ($1, $2)',
      [first, second],
    )
    expect(result.rows[0]!.count).toBe('2')
  })

  it('impede status inválido', async () => {
    const employeeId = await createEmployee('test-status@example.com')

    await expectDatabaseError(
      pool.query(
        `insert into vacation_periods (employee_id, start_date, end_date, status)
         values ($1, '2027-03-10', '2027-03-19', 'cancelled')`,
        [employeeId],
      ),
      '23514',
    )
  })

  it('exige justificativa quando há override administrativo', async () => {
    const employeeId = await createEmployee('test-override@example.com')

    await expectDatabaseError(
      pool.query(
        `insert into vacation_periods (employee_id, start_date, end_date, admin_override)
         values ($1, '2027-03-10', '2027-03-19', true)`,
        [employeeId],
      ),
      '23514',
    )

    await pool.query(
      `insert into vacation_periods (employee_id, start_date, end_date, admin_override, override_reason)
       values ($1, '2027-03-10', '2027-03-19', true, 'Decisão judicial')`,
      [employeeId],
    )
  })

  it('impede justificativa sem override', async () => {
    const employeeId = await createEmployee('test-reason@example.com')

    await expectDatabaseError(
      pool.query(
        `insert into vacation_periods (employee_id, start_date, end_date, override_reason)
         values ($1, '2027-03-10', '2027-03-19', 'Motivo indevido')`,
        [employeeId],
      ),
      '23514',
    )
  })

  it('mantém apenas uma linha de configurações', async () => {
    await expectDatabaseError(
      pool.query(
        `insert into settings (id, cycle_start, cycle_end)
         values (2, '2027-01-01', '2027-12-31')`,
      ),
      '23514',
    )
  })

  it('impede valores inválidos nas configurações', async () => {
    await expectDatabaseError(
      pool.query(
        `insert into settings (id, cycle_start, cycle_end, total_days)
         values (1, '2027-01-01', '2027-12-31', 0)
         on conflict (id) do update set total_days = excluded.total_days`,
      ),
      '23514',
    )
  })

  it('impede ciclo invertido nas configurações', async () => {
    await expectDatabaseError(
      pool.query(
        `insert into settings (id, cycle_start, cycle_end)
         values (1, '2027-12-31', '2027-01-01')
         on conflict (id) do update set cycle_start = excluded.cycle_start, cycle_end = excluded.cycle_end`,
      ),
      '23514',
    )
  })
})
