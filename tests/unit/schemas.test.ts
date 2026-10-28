import { describe, expect, it } from 'vitest'
import { loginSchema } from '../../shared/schemas/auth'
import {
  adminScheduleInputSchema,
  periodInputSchema,
  scheduleInputSchema,
} from '../../shared/schemas/schedule'

describe('loginSchema', () => {
  it('normaliza o e-mail e aceita credenciais válidas', () => {
    const parsed = loginSchema.parse({
      email: '  maria@example.com  ',
      password: 'servidor123',
    })

    expect(parsed.email).toBe('maria@example.com')
  })

  it('rejeita e-mail inválido e senha vazia', () => {
    expect(loginSchema.safeParse({ email: 'invalido', password: '123' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'maria@example.com', password: '' }).success).toBe(false)
  })
})

describe('schemas de agenda', () => {
  it('valida o formato civil das datas', () => {
    expect(periodInputSchema.safeParse({ startDate: '2027-01-10', endDate: '2027-01-19' }).success).toBe(true)
    expect(periodInputSchema.safeParse({ startDate: '10/01/2027', endDate: '2027-01-19' }).success).toBe(false)
  })

  it('limita a quantidade de períodos', () => {
    const periods = Array.from({ length: 21 }, (_, index) => ({
      startDate: `2027-01-${String(index + 1).padStart(2, '0')}`,
      endDate: `2027-01-${String(index + 1).padStart(2, '0')}`,
    }))

    expect(scheduleInputSchema.safeParse({ periods }).success).toBe(false)
  })

  it('aplica os padrões do formulário administrativo', () => {
    const parsed = adminScheduleInputSchema.parse({
      periods: [{ startDate: '2027-01-10', endDate: '2027-01-19' }],
    })

    expect(parsed.override).toBe(false)
    expect(parsed.confirm).toBe(false)
  })

  it('exige justificativa quando o override está ativo', () => {
    expect(adminScheduleInputSchema.safeParse({
      periods: [],
      override: true,
    }).success).toBe(false)

    expect(adminScheduleInputSchema.safeParse({
      periods: [],
      override: true,
      overrideReason: 'Ajuste autorizado pela chefia.',
    }).success).toBe(true)
  })
})
