import { hash } from '@node-rs/argon2'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import { fetch as rawFetch, setup } from '@nuxt/test-utils/e2e'

const DATABASE_URL = process.env.DATABASE_URL
  ?? 'postgresql://ferias:ferias_dev_password@localhost:5433/ferias_test'
const APP_ORIGIN = 'http://localhost:3101'
const PASSWORD = 'senha-de-teste-123'

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
const employeeEmail = `test-api-employee-${suffix}@example.com`
const otherEmail = `test-api-other-${suffix}@example.com`
const adminEmail = `test-api-admin-${suffix}@example.com`

const validPeriods = [
  { startDate: '2027-03-10', endDate: '2027-03-19' },
  { startDate: '2027-04-04', endDate: '2027-04-13' },
  { startDate: '2027-04-29', endDate: '2027-05-08' },
]

interface ApiResponse {
  status: number
  data: unknown
  cookie: string
}

async function request(
  path: string,
  options: {
    method?: string
    body?: unknown
    cookie?: string
    withOrigin?: boolean
  } = {},
): Promise<ApiResponse> {
  const { method = 'GET', body, cookie, withOrigin = true } = options
  const headers = new Headers()
  if (withOrigin) {
    headers.set('origin', APP_ORIGIN)
  }
  if (cookie) {
    headers.set('cookie', cookie)
  }
  if (body !== undefined) {
    headers.set('content-type', 'application/json')
  }

  const response = await rawFetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  return {
    status: response.status,
    data,
    cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '',
  }
}

function messageOf(response: ApiResponse): string {
  const data = response.data as { message?: string, statusMessage?: string } | null
  return data?.message ?? data?.statusMessage ?? ''
}

describe('API de autenticação, agenda e administração', async () => {
  await setup({
    server: true,
    build: true,
    port: 3101,
    env: {
      DATABASE_URL,
      NUXT_SESSION_SECRET: 'test-session-secret-com-pelo-menos-32-caracteres',
      NUXT_PUBLIC_APP_URL: APP_ORIGIN,
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'admin12345',
    },
  })

  const pool = new Pool({ connectionString: DATABASE_URL })
  let employeeId = ''
  let otherEmployeeId = ''
  let employeeCookie = ''
  let adminCookie = ''

  beforeAll(async () => {
    const passwordHash = await hash(PASSWORD)

    const employee = await pool.query<{ id: string }>(
      'insert into employees (name, email) values ($1, $2) returning id',
      ['Servidor API', employeeEmail],
    )
    employeeId = employee.rows[0]!.id

    const other = await pool.query<{ id: string }>(
      'insert into employees (name, email) values ($1, $2) returning id',
      ['Outro Servidor API', otherEmail],
    )
    otherEmployeeId = other.rows[0]!.id

    await pool.query(
      `insert into vacation_periods (employee_id, start_date, end_date, status, confirmed_at)
       values
         ($1, '2027-03-10', '2027-03-19', 'confirmed', now()),
         ($1, '2027-04-04', '2027-04-13', 'confirmed', now()),
         ($1, '2027-04-29', '2027-05-08', 'confirmed', now())`,
      [otherEmployeeId],
    )

    await pool.query(
      'insert into admins (name, email, password_hash) values ($1, $2, $3)',
      ['Admin API', adminEmail, passwordHash],
    )
  })

  afterAll(async () => {
    await pool.query('delete from employees where email like \'test-api-%\'')
    await pool.query('delete from admins where email like \'test-api-%\'')
    await pool.end()
  })

  it('bloqueia requisição sem origem confiável', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: { email: employeeEmail },
      withOrigin: false,
    })

    expect(response.status).toBe(403)
  })

  it('rejeita e-mail desconhecido', async () => {
    const unknownEmail = await request('/api/auth/login', {
      method: 'POST',
      body: { email: `test-api-unknown-${suffix}@example.com` },
    })

    expect(unknownEmail.status).toBe(401)
    expect(messageOf(unknownEmail)).toBe('Não foi possível entrar com este e-mail.')
  })

  it('autentica o servidor apenas com o e-mail', async () => {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: employeeEmail },
    })

    expect(login.status).toBe(200)
    employeeCookie = login.cookie
    expect(employeeCookie).toContain('ferias_employee=')

    const session = await request('/api/auth/session', { cookie: employeeCookie })
    expect(session.status).toBe(200)
    expect(session.data).toMatchObject({
      authenticated: true,
      employee: { id: employeeId, email: employeeEmail },
    })
  })

  it('exige autenticação para consultar a agenda', async () => {
    const response = await request('/api/me/schedule', { withOrigin: false })
    expect(response.status).toBe(401)
  })

  it('salva um rascunho válido', async () => {
    const response = await request('/api/me/schedule', {
      method: 'PUT',
      body: { periods: validPeriods },
      cookie: employeeCookie,
    })

    expect(response.status).toBe(200)
    expect(response.data).toMatchObject({
      totalDays: 30,
      status: 'draft',
      canEdit: true,
    })
  })

  it('confirma a agenda com exatamente 30 dias', async () => {
    const response = await request('/api/me/schedule/confirm', {
      method: 'POST',
      cookie: employeeCookie,
    })

    expect(response.status).toBe(200)
    expect(response.data).toMatchObject({
      totalDays: 30,
      status: 'confirmed',
      canEdit: false,
    })
  })

  it('bloqueia alteração depois da confirmação', async () => {
    const response = await request('/api/me/schedule', {
      method: 'PUT',
      body: { periods: validPeriods },
      cookie: employeeCookie,
    })

    expect(response.status).toBe(409)
  })

  it('autentica o admin e lista servidores', async () => {
    const login = await request('/api/admin/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: PASSWORD },
    })

    expect(login.status).toBe(200)
    adminCookie = login.cookie
    expect(adminCookie).toContain('ferias_admin=')

    const list = await request(
      `/api/admin/employees?search=${encodeURIComponent('test-api-employee')}`,
      { cookie: adminCookie },
    )

    expect(list.status).toBe(200)
    expect((list.data as { employees: Array<{ id: string, status: string }> }).employees)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: employeeId, status: 'confirmed' }),
      ]))
  })

  it('consulta o detalhe do servidor', async () => {
    const detail = await request(`/api/admin/employees/${employeeId}`, {
      cookie: adminCookie,
    })

    expect(detail.status).toBe(200)
    expect(detail.data).toMatchObject({
      employee: { id: employeeId, totalDays: 30 },
      issues: [],
    })
  })

  it('gera relatório com coincidências entre servidores', async () => {
    const report = await request('/api/admin/report', { cookie: adminCookie })
    const data = report.data as {
      summary: { confirmed: number }
      coincidences: Array<{ days: number }>
    }

    expect(report.status).toBe(200)
    expect(data.summary.confirmed).toBeGreaterThanOrEqual(2)
    expect(data.coincidences.length).toBeGreaterThan(0)
    expect(data.coincidences[0]!.days).toBeGreaterThan(0)
  })

  it('permite override administrativo com justificativa', async () => {
    const response = await request(`/api/admin/employees/${otherEmployeeId}/schedule`, {
      method: 'PUT',
      body: {
        periods: [{ startDate: '2027-06-01', endDate: '2027-06-10' }],
        override: true,
        overrideReason: 'Decisão judicial',
        confirm: true,
      },
      cookie: adminCookie,
    })

    expect(response.status).toBe(200)

    const detail = await request(`/api/admin/employees/${otherEmployeeId}`, {
      cookie: adminCookie,
    })

    expect(detail.data).toMatchObject({
      employee: {
        totalDays: 10,
        status: 'confirmed',
        periods: [{
          adminOverride: true,
          overrideReason: 'Decisão judicial',
        }],
      },
    })
  })

  it('exige justificativa no override', async () => {
    const response = await request(`/api/admin/employees/${otherEmployeeId}/schedule`, {
      method: 'PUT',
      body: {
        periods: [{ startDate: '2027-06-01', endDate: '2027-06-10' }],
        override: true,
        confirm: true,
      },
      cookie: adminCookie,
    })

    expect(response.status).toBe(400)
  })
})
