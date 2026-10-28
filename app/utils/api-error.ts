import type { ValidationIssue } from '~~/shared/rules/vacation'

interface ErrorBody {
  statusCode?: number
  statusMessage?: string
  message?: string
  issues?: ValidationIssue[]
  retryAfterSeconds?: number
  data?: {
    issues?: ValidationIssue[]
    retryAfterSeconds?: number
  }
}

export interface NormalizedApiError {
  statusCode: number
  message: string
  issues: ValidationIssue[]
  retryAfterSeconds: number | null
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  const candidate = (typeof error === 'object' && error !== null ? error : {}) as {
    statusCode?: number
    statusMessage?: string
    message?: string
    data?: ErrorBody
  }
  const body = candidate.data
  const issues = body?.issues ?? body?.data?.issues ?? []

  return {
    statusCode: candidate.statusCode ?? body?.statusCode ?? 0,
    message: body?.statusMessage
      ?? body?.message
      ?? candidate.statusMessage
      ?? candidate.message
      ?? 'Não foi possível concluir a operação.',
    issues,
    retryAfterSeconds: body?.retryAfterSeconds
      ?? body?.data?.retryAfterSeconds
      ?? null,
  }
}
