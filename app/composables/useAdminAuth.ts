interface SessionAdmin {
  id: string
  name: string
  email: string
}

export interface AdminSessionResponse {
  authenticated: boolean
  admin?: SessionAdmin
}

export function useAdminAuth() {
  const session = useState<AdminSessionResponse>('admin-session', () => ({
    authenticated: false,
  }))

  const admin = computed(() => session.value.admin ?? null)

  async function fetchSession(): Promise<AdminSessionResponse> {
    const requestFetch = useRequestFetch()
    const data = await requestFetch<AdminSessionResponse>('/api/admin/auth/session')
    session.value = data
    return data
  }

  async function login(email: string, password: string): Promise<AdminSessionResponse> {
    await $fetch('/api/admin/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    return fetchSession()
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/api/admin/auth/logout', { method: 'POST' })
    } finally {
      session.value = { authenticated: false }
      await navigateTo('/admin/login')
    }
  }

  return {
    session,
    admin,
    fetchSession,
    login,
    logout,
  }
}
