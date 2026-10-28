interface SessionEmployee {
  id: string
  name: string
  email: string
}

export interface EmployeeSessionResponse {
  authenticated: boolean
  employee?: SessionEmployee
}

export function useAuth() {
  const session = useState<EmployeeSessionResponse>('employee-session', () => ({
    authenticated: false,
  }))

  const employee = computed(() => session.value.employee ?? null)

  async function fetchSession(): Promise<EmployeeSessionResponse> {
    const requestFetch = useRequestFetch()
    const data = await requestFetch<EmployeeSessionResponse>('/api/auth/session')
    session.value = data
    return data
  }

  async function login(email: string): Promise<EmployeeSessionResponse> {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email },
    })
    return fetchSession()
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      session.value = { authenticated: false }
      await navigateTo('/login')
    }
  }

  return {
    session,
    employee,
    fetchSession,
    login,
    logout,
  }
}
