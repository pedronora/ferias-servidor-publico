import { createError, getHeader, getMethod, type H3Event } from 'h3'

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function assertSameOrigin(event: H3Event): void {
  if (!UNSAFE_METHODS.has(getMethod(event))) {
    return
  }

  const appUrl = useRuntimeConfig(event).public.appUrl.replace(/\/$/, '')
  const origin = getHeader(event, 'origin')
  const fetchSite = getHeader(event, 'sec-fetch-site')

  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Origem da requisição não permitida.',
    })
  }

  if (origin) {
    if (origin.replace(/\/$/, '') !== appUrl) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Origem da requisição não permitida.',
      })
    }
    return
  }

  if (fetchSite === 'same-origin' || fetchSite === 'none') {
    return
  }

  throw createError({
    statusCode: 403,
    statusMessage: 'Origem da requisição não permitida.',
  })
}
