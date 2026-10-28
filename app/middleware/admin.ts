export default defineNuxtRouteMiddleware(async () => {
  const { fetchSession } = useAdminAuth()
  const session = await fetchSession()

  if (!session.authenticated) {
    return navigateTo('/admin/login')
  }
})
