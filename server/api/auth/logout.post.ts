import { setResponseStatus } from 'h3'
import { logoutEmployee } from '../../utils/auth'
import { assertSameOrigin } from '../../utils/csrf'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  await logoutEmployee(event)
  setResponseStatus(event, 204)
  return null
})
