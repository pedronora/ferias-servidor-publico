import { describe, expect, it } from 'vitest'
import {
  buildAnnualWeeks,
  buildMonthWeeks,
  countEmployeeDaysInRange,
  countEmployeesInMonth,
  getCycleMonths,
  getCycleYears,
  getEmployeesInRange,
  getEmployeesOnDate,
  groupAnnualWeeksByMonth,
  resolveInitialMonth,
} from '../../shared/utils/calendar'

const employees = [
  {
    id: 'ana',
    periods: [{ startDate: '2027-01-10', endDate: '2027-01-19' }],
  },
  {
    id: 'bia',
    periods: [{ startDate: '2027-01-19', endDate: '2027-01-25' }],
  },
  {
    id: 'caio',
    periods: [{ startDate: '2027-01-31', endDate: '2027-02-02' }],
  },
]

describe('visão anual', () => {
  it('gera as semanas de segunda a domingo do ciclo', () => {
    const weeks = buildAnnualWeeks('2027-01-01', '2027-12-31')

    expect(weeks).toHaveLength(53)
    expect(weeks[0]).toEqual({
      startDate: '2026-12-28',
      endDate: '2027-01-03',
      monthKey: '2027-01',
    })
    expect(weeks[weeks.length - 1]).toEqual({
      startDate: '2027-12-27',
      endDate: '2028-01-02',
      monthKey: '2027-12',
    })
  })

  it('agrupa os meses pela semana que contém o dia 1º', () => {
    const groups = groupAnnualWeeksByMonth(buildAnnualWeeks('2027-01-01', '2027-12-31'))

    expect(groups.map(group => group.label)).toEqual([
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ])
    expect(groups.map(group => group.weeks.length)).toEqual([
      5,
      4,
      4,
      4,
      5,
      4,
      4,
      5,
      4,
      5,
      4,
      5,
    ])
    expect(groups[0]!.weeks[0]!.startDate).toBe('2026-12-28')
  })

  it('inclui o ano no rótulo quando o ciclo atravessa anos', () => {
    const groups = groupAnnualWeeksByMonth(buildAnnualWeeks('2026-07-01', '2027-06-30'))

    expect(groups[0]!.label).toBe('Jul/2026')
    expect(groups[groups.length - 1]!.label).toBe('Jun/2027')
  })

  it('retorna vazio para um ciclo inválido', () => {
    expect(buildAnnualWeeks('2027-12-31', '2027-01-01')).toEqual([])
    expect(buildAnnualWeeks('data-invalida', '2027-12-31')).toEqual([])
  })
})

describe('calendário mensal', () => {
  it('monta a grade de domingo a sábado', () => {
    const weeks = buildMonthWeeks(2027, 1, '2027-01-01', '2027-12-31')

    expect(weeks).toHaveLength(6)
    expect(weeks[0]!.days[0]).toEqual({
      date: '2026-12-27',
      day: 27,
      inMonth: false,
      inCycle: false,
    })
    expect(weeks[0]!.days[5]).toEqual({
      date: '2027-01-01',
      day: 1,
      inMonth: true,
      inCycle: true,
    })
  })

  it('rejeita meses fora do intervalo', () => {
    expect(buildMonthWeeks(2027, 0, '2027-01-01', '2027-12-31')).toEqual([])
    expect(buildMonthWeeks(2027, 13, '2027-01-01', '2027-12-31')).toEqual([])
  })

  it('lista os meses e anos do ciclo', () => {
    const months = getCycleMonths('2026-11-01', '2027-02-28')

    expect(months.map(month => month.label)).toEqual([
      'Novembro de 2026',
      'Dezembro de 2026',
      'Janeiro de 2027',
      'Fevereiro de 2027',
    ])
    expect(getCycleYears('2026-11-01', '2027-02-28')).toEqual([2026, 2027])
  })
})

describe('consultas de férias', () => {
  it('encontra servidores em uma data, inclusive nas bordas', () => {
    expect(getEmployeesOnDate(employees, '2027-01-19', '2027-01-01', '2027-12-31'))
      .toEqual([employees[0], employees[1]])
    expect(getEmployeesOnDate(employees, '2027-01-09', '2027-01-01', '2027-12-31'))
      .toEqual([])
    expect(getEmployeesOnDate(employees, '2026-12-31', '2027-01-01', '2027-12-31'))
      .toEqual([])
  })

  it('encontra servidores em um intervalo', () => {
    expect(getEmployeesInRange(employees, '2027-01-20', '2027-01-21', '2027-01-01', '2027-12-31'))
      .toEqual([employees[1]])
    expect(getEmployeesInRange(employees, '2027-01-01', '2027-01-09', '2027-01-01', '2027-12-31'))
      .toEqual([])
  })

  it('conta os dias de férias dentro de um intervalo', () => {
    expect(countEmployeeDaysInRange(
      [{ startDate: '2027-01-10', endDate: '2027-01-19' }],
      '2027-01-08',
      '2027-01-12',
    )).toBe(3)
    expect(countEmployeeDaysInRange([], '2027-01-08', '2027-01-12')).toBe(0)
  })

  it('conta servidores distintos com férias no mês', () => {
    expect(countEmployeesInMonth(employees, 2027, 1, '2027-01-01', '2027-12-31')).toBe(3)
    expect(countEmployeesInMonth(employees, 2027, 2, '2027-01-01', '2027-12-31')).toBe(1)
    expect(countEmployeesInMonth(employees, 2027, 13, '2027-01-01', '2027-12-31')).toBe(0)
  })
})

describe('mês inicial', () => {
  it('usa o mês atual quando ele está dentro do ciclo', () => {
    expect(resolveInitialMonth('2027-07-15T12:00:00Z', '2027-01-01', '2027-12-31'))
      .toEqual({ year: 2027, month: 7 })
  })

  it('limita o mês aos extremos do ciclo', () => {
    expect(resolveInitialMonth('2026-11-19T12:00:00Z', '2027-01-01', '2027-12-31'))
      .toEqual({ year: 2027, month: 1 })
    expect(resolveInitialMonth('2028-01-15T12:00:00Z', '2027-01-01', '2027-12-31'))
      .toEqual({ year: 2027, month: 12 })
  })

  it('considera o fuso de São Paulo', () => {
    expect(resolveInitialMonth('2027-08-01T01:00:00Z', '2027-01-01', '2027-12-31'))
      .toEqual({ year: 2027, month: 7 })
  })

  it('usa o início do ciclo quando a data gerada é inválida', () => {
    expect(resolveInitialMonth('data-invalida', '2027-03-01', '2027-12-31'))
      .toEqual({ year: 2027, month: 3 })
  })
})
