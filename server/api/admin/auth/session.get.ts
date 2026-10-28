import { eq } from 'drizzle-orm'
import { admins } from '../../../database/schema'
import { getAdminSession, logoutAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getAdminSession(event)
  if (!session) {
    return { authenticated: false }
  }

  const [admin] = await getDb()
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
    })
    .from(admins)
    .where(eq(admins.id, session.adminId))
    .limit(1)

  if (!admin) {
    await logoutAdmin(event)
    return { authenticated: false }
  }

  return {
    authenticated: true,
    admin,
  }
})
