import { describe, expect, it } from 'vitest'
import { adminLoginSchema, employeeLoginSchema } from '../../shared/schemas/auth'
import { createEmployeeSchema, updateEmployeeSchema } from '../../shared/schemas/employee'
import {
  adminScheduleInputSchema,
  periodInputSchema,
  scheduleInputSchema,
} from '../../shared/schemas/schedule'

describe('schemas de autenticação', () => {
  it('normaliza o e-mail do servidor e não exige senha', () => {
    const parsed = employeeLoginSchema.parse({
      email: '  maria@example.com  ',
    })

    expect(parsed.email).toBe('maria@example.com')
  })

  it('rejeita e-mail inválido no login do servidor', () => {
    expect(employeeLoginSchema.safeParse({ email: 'invalido' }).success).toBe(false)
  })

  it('mantém a senha obrigatória no login administrativo', () => {
    const parsed = adminLoginSchema.parse({
      email: '  admin@example.com  ',
      password: 'admin12345',
    })

    expect(parsed.email).toBe('admin@example.com')
    expect(adminLoginSchema.safeParse({ email: 'admin@example.com', password: '' }).success).toBe(false)
  })
})

describe('schemas de servidor', () => {
  it('valida o cadastro de servidor', () => {
    expect(createEmployeeSchema.parse({
      name: '  Maria Souza  ',
      email: '  maria@example.com  ',
    })).toEqual({
      name: 'Maria Souza',
      email: 'maria@example.com',
    })
    expect(createEmployeeSchema.safeParse({ name: ' ', email: 'maria@example.com' }).success).toBe(false)
    expect(createEmployeeSchema.safeParse({ name: 'Maria', email: 'invalido' }).success).toBe(false)
  })

  it('exige ao menos um campo na atualização de servidor', () => {
    expect(updateEmployeeSchema.safeParse({}).success).toBe(false)
    expect(updateEmployeeSchema.parse({ isActive: false })).toEqual({ isActive: false })
    expect(updateEmployeeSchema.parse({ name: 'Novo nome' })).toEqual({ name: 'Novo nome' })
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
