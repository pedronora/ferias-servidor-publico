export default defineNuxtRouteMiddleware(async () => {
  const { fetchSession } = useAuth()
  const session = await fetchSession()

  if (!session.authenticated) {
    return navigateTo('/login')
  }
})
