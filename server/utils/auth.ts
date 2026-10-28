import { createError, getSession, useSession, type H3Event, type SessionConfig } from 'h3'
import type { AdminSessionPayload, EmployeeSessionPayload } from '../../shared/types/api'

const EMPLOYEE_SESSION_NAME = 'ferias_employee'
const ADMIN_SESSION_NAME = 'ferias_admin'
const SESSION_MAX_AGE = 60 * 60 * 8

function baseSessionConfig(event: H3Event, name: string): SessionConfig {
  const config = useRuntimeConfig(event)
  const secret = config.sessionSecret

  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Segredo de sessão não configurado.',
    })
  }

  return {
    password: secret,
    name,
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.public.appUrl.startsWith('https://'),
      path: '/',
    },
  }
}

function employeeSessionConfig(event: H3Event): SessionConfig {
  return baseSessionConfig(event, EMPLOYEE_SESSION_NAME)
}

function adminSessionConfig(event: H3Event): SessionConfig {
  return baseSessionConfig(event, ADMIN_SESSION_NAME)
}

export async function getEmployeeSession(event: H3Event): Promise<EmployeeSessionPayload | null> {
  const session = await getSession<EmployeeSessionPayload>(event, employeeSessionConfig(event))
  const data = session.data

  if (data.kind !== 'employee' || typeof data.employeeId !== 'string') {
    return null
  }

  return data
}

export async function requireEmployee(event: H3Event): Promise<EmployeeSessionPayload> {
  const session = await getEmployeeSession(event)
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Não autenticado.',
    })
  }
  return session
}

export async function loginEmployee(event: H3Event, payload: EmployeeSessionPayload): Promise<void> {
  const session = await useSession<EmployeeSessionPayload>(event, employeeSessionConfig(event))
  await session.update(payload)
}

export async function logoutEmployee(event: H3Event): Promise<void> {
  const session = await useSession<EmployeeSessionPayload>(event, employeeSessionConfig(event))
  await session.clear()
}

export async function getAdminSession(event: H3Event): Promise<AdminSessionPayload | null> {
  const session = await getSession<AdminSessionPayload>(event, adminSessionConfig(event))
  const data = session.data

  if (data.kind !== 'admin' || typeof data.adminId !== 'string') {
    return null
  }

  return data
}

export async function requireAdmin(event: H3Event): Promise<AdminSessionPayload> {
  const session = await getAdminSession(event)
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Não autenticado.',
    })
  }
  return session
}

export async function loginAdmin(event: H3Event, payload: AdminSessionPayload): Promise<void> {
  const session = await useSession<AdminSessionPayload>(event, adminSessionConfig(event))
  await session.update(payload)
}

export async function logoutAdmin(event: H3Event): Promise<void> {
  const session = await useSession<AdminSessionPayload>(event, adminSessionConfig(event))
  await session.clear()
}
