import { setResponseStatus } from 'h3'
import { logoutAdmin } from '../../../utils/auth'
import { assertSameOrigin } from '../../../utils/csrf'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  await logoutAdmin(event)
  setResponseStatus(event, 204)
  return null
})
