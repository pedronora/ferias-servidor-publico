import type { H3Event } from 'h3'
import { createError } from 'h3'
import type { ZodError } from 'zod'
import type { ValidationIssue } from '../../shared/rules/vacation'

export function throwValidationError(error: ZodError): never {
  throw createError({
    statusCode: 400,
    statusMessage: 'Dados inválidos.',
    data: {
      issues: error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
  })
}

export function throwBusinessError(issues: ValidationIssue[]): never {
  throw createError({
    statusCode: 422,
    statusMessage: 'A agenda viola as regras de férias.',
    data: { issues },
  })
}

export function throwConflict(message: string): never {
  throw createError({
    statusCode: 409,
    statusMessage: message,
  })
}

export function isDatabaseError(error: unknown, code: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  if ('code' in error && (error as { code?: unknown }).code === code) {
    return true
  }

  return 'cause' in error
    && isDatabaseError((error as { cause?: unknown }).cause, code)
}

export function getClientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
}
