import { requireEmployee } from '../../utils/auth'
import { getSettingsRules } from '../../utils/settings'
import { buildScheduleResponse } from '../../utils/schedule-response'

export default defineEventHandler(async (event) => {
  const session = await requireEmployee(event)
  const rules = await getSettingsRules()
  return buildScheduleResponse(session.employeeId, rules)
})
