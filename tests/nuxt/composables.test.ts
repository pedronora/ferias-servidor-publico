import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminAuth } from '../../app/composables/useAdminAuth'
import { useAuth } from '../../app/composables/useAuth'

const { requestFetchMock, fetchMock, navigateToMock } = vi.hoisted(() => ({
  requestFetchMock: vi.fn(),
  fetchMock: vi.fn(),
  navigateToMock: vi.fn(),
}))

mockNuxtImport('useRequestFetch', () => () => requestFetchMock)
mockNuxtImport('$fetch', () => fetchMock)
mockNuxtImport('navigateTo', () => navigateToMock)

const employeeSession = {
  authenticated: true,
  employee: { id: 'employee-1', name: 'Maria Souza', email: 'maria@example.com' },
}

const adminSession = {
  authenticated: true,
  admin: { id: 'admin-1', name: 'Administrador', email: 'admin@example.com' },
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearNuxtState('employee-session')
  })

  it('carrega e expõe a sessão do servidor', async () => {
    requestFetchMock.mockResolvedValue(employeeSession)

    const { session, employee, fetchSession } = useAuth()
    await fetchSession()

    expect(requestFetchMock).toHaveBeenCalledWith('/api/auth/session')
    expect(session.value).toEqual(employeeSession)
    expect(employee.value?.name).toBe('Maria Souza')
  })

  it('faz login e recarrega a sessão', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    requestFetchMock.mockResolvedValue(employeeSession)

    const { login } = useAuth()
    await login('maria@example.com')

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: { email: 'maria@example.com' },
    })
    expect(requestFetchMock).toHaveBeenCalledWith('/api/auth/session')
  })

  it('limpa a sessão e redireciona no logout', async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { session, logout } = useAuth()
    session.value = employeeSession
    await logout()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
    expect(session.value).toEqual({ authenticated: false })
    expect(navigateToMock).toHaveBeenCalledWith('/login')
  })
})

describe('useAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearNuxtState('admin-session')
  })

  it('carrega e expõe a sessão administrativa', async () => {
    requestFetchMock.mockResolvedValue(adminSession)

    const { session, admin, fetchSession } = useAdminAuth()
    await fetchSession()

    expect(requestFetchMock).toHaveBeenCalledWith('/api/admin/auth/session')
    expect(session.value).toEqual(adminSession)
    expect(admin.value?.name).toBe('Administrador')
  })

  it('faz login administrativo e recarrega a sessão', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    requestFetchMock.mockResolvedValue(adminSession)

    const { login } = useAdminAuth()
    await login('admin@example.com', 'admin12345')

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/auth/login', {
      method: 'POST',
      body: { email: 'admin@example.com', password: 'admin12345' },
    })
    expect(requestFetchMock).toHaveBeenCalledWith('/api/admin/auth/session')
  })

  it('limpa a sessão e redireciona no logout', async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { session, logout } = useAdminAuth()
    session.value = adminSession
    await logout()

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/auth/logout', { method: 'POST' })
    expect(session.value).toEqual({ authenticated: false })
    expect(navigateToMock).toHaveBeenCalledWith('/admin/login')
  })
})
