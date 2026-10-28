import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import adminMiddleware from '../../app/middleware/admin'
import authMiddleware from '../../app/middleware/auth'

const { employeeFetchSession, adminFetchSession, navigateToMock } = vi.hoisted(() => ({
  employeeFetchSession: vi.fn(),
  adminFetchSession: vi.fn(),
  navigateToMock: vi.fn(),
}))

mockNuxtImport('useAuth', () => () => ({ fetchSession: employeeFetchSession }))
mockNuxtImport('useAdminAuth', () => () => ({ fetchSession: adminFetchSession }))
mockNuxtImport('navigateTo', () => navigateToMock)

const runAuthMiddleware = authMiddleware as () => Promise<unknown>
const runAdminMiddleware = adminMiddleware as () => Promise<unknown>

describe('middleware de autenticação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigateToMock.mockReturnValue('/login')
  })

  it('libera servidor autenticado', async () => {
    employeeFetchSession.mockResolvedValue({ authenticated: true })

    await expect(runAuthMiddleware()).resolves.toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('redireciona servidor não autenticado', async () => {
    employeeFetchSession.mockResolvedValue({ authenticated: false })

    await expect(runAuthMiddleware()).resolves.toBe('/login')
    expect(navigateToMock).toHaveBeenCalledWith('/login')
  })
})

describe('middleware administrativo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigateToMock.mockReturnValue('/admin/login')
  })

  it('libera administrador autenticado', async () => {
    adminFetchSession.mockResolvedValue({ authenticated: true })

    await expect(runAdminMiddleware()).resolves.toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('redireciona administrador não autenticado', async () => {
    adminFetchSession.mockResolvedValue({ authenticated: false })

    await expect(runAdminMiddleware()).resolves.toBe('/admin/login')
    expect(navigateToMock).toHaveBeenCalledWith('/admin/login')
  })
})
