import { describe, expect, it } from 'vitest'
import {
  formatDateBR,
  formatDateRangeBR,
  parseISODate,
  toISODate,
} from '../../shared/utils/date'

describe('datas civis', () => {
  it('interpreta uma data ISO válida sem deslocar o dia', () => {
    const date = parseISODate('2027-03-10')

    expect(date).not.toBeNull()
    expect(toISODate(date as Date)).toBe('2027-03-10')
  })

  it('rejeita formato inválido', () => {
    expect(parseISODate('10/03/2027')).toBeNull()
    expect(parseISODate('2027-3-10')).toBeNull()
    expect(parseISODate('')).toBeNull()
  })

  it('rejeita datas impossíveis', () => {
    expect(parseISODate('2027-02-29')).toBeNull()
    expect(parseISODate('2027-13-01')).toBeNull()
    expect(parseISODate('2027-04-31')).toBeNull()
  })

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(toISODate(parseISODate('2028-02-29') as Date)).toBe('2028-02-29')
  })

  it('formata no padrão brasileiro', () => {
    expect(formatDateBR('2027-03-10')).toBe('10/03/2027')
    expect(formatDateRangeBR('2027-03-10', '2027-03-26')).toBe('10/03/2027 a 26/03/2027')
  })

  it('devolve o valor original quando a data é inválida', () => {
    expect(formatDateBR('data-invalida')).toBe('data-invalida')
  })
})
