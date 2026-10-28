import { describe, expect, it } from 'vitest'
import { normalizeApiError } from '../../app/utils/api-error'

describe('normalizeApiError', () => {
  it('normaliza erros de validação aninhados', () => {
    const normalized = normalizeApiError({
      statusCode: 422,
      data: {
        statusCode: 422,
        statusMessage: 'Dados inválidos.',
        data: {
          issues: [{ code: 'too_short', message: 'Período muito curto.' }],
        },
      },
    })

    expect(normalized.statusCode).toBe(422)
    expect(normalized.message).toBe('Dados inválidos.')
    expect(normalized.issues).toHaveLength(1)
    expect(normalized.retryAfterSeconds).toBeNull()
  })

  it('lê issues e retryAfterSeconds do corpo direto', () => {
    const normalized = normalizeApiError({
      statusCode: 429,
      data: {
        message: 'Muitas tentativas.',
        issues: [{ code: 'overlap', message: 'Sobreposição.' }],
        retryAfterSeconds: 60,
      },
    })

    expect(normalized.message).toBe('Muitas tentativas.')
    expect(normalized.issues[0]?.code).toBe('overlap')
    expect(normalized.retryAfterSeconds).toBe(60)
  })

  it('usa mensagens de fallback para erros desconhecidos', () => {
    expect(normalizeApiError(null)).toEqual({
      statusCode: 0,
      message: 'Não foi possível concluir a operação.',
      issues: [],
      retryAfterSeconds: null,
    })

    expect(normalizeApiError('falha')).toMatchObject({
      statusCode: 0,
      message: 'Não foi possível concluir a operação.',
    })
  })

  it('prioriza statusMessage e message do erro raiz', () => {
    expect(normalizeApiError({ statusCode: 500, statusMessage: 'Falha interna.' }).message).toBe('Falha interna.')
    expect(normalizeApiError({ statusCode: 500, message: 'Erro inesperado.' }).message).toBe('Erro inesperado.')
  })
})
