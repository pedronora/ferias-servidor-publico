import { describe, expect, it } from 'vitest'
import {
  countDays,
  deriveStatus,
  earliestNextStart,
  findLastCompletePeriodBefore,
  findOverlaps,
  firstAvailableDateFrom,
  freeDaysBetween,
  getBlockedGapDates,
  getDisabledDates,
  getOccupiedDates,
  getTotalDays,
  isDateDisabled,
  suggestedInitialDate,
  validateForConfirmation,
  validatePeriod,
  validateSchedule,
  validateStructure,
  type VacationPeriod,
  type VacationRules,
} from '../../shared/rules/vacation'

const rules: VacationRules = {
  cycleStart: '2027-01-01',
  cycleEnd: '2027-12-31',
  totalDays: 30,
  maxPeriods: 3,
  minPeriodDays: 1,
  minGapDays: 15,
}

function period(startDate: string, endDate: string, status: 'draft' | 'confirmed' = 'draft'): VacationPeriod {
  return { startDate, endDate, status }
}

const validSchedule = [
  period('2027-03-10', '2027-03-19', 'confirmed'),
  period('2027-04-04', '2027-04-13', 'confirmed'),
  period('2027-04-29', '2027-05-08', 'confirmed'),
]

describe('contagem de dias', () => {
  it('conta os dois extremos do período', () => {
    expect(countDays('2027-03-10', '2027-03-10')).toBe(1)
    expect(countDays('2027-03-10', '2027-03-19')).toBe(10)
    expect(countDays('2027-12-31', '2028-01-01')).toBe(2)
  })

  it('retorna zero para datas inválidas ou invertidas', () => {
    expect(countDays('2027-02-30', '2027-03-10')).toBe(0)
    expect(countDays('2027-03-10', '2027-03-09')).toBe(0)
    expect(countDays('2027-03-10', 'inválida')).toBe(0)
  })

  it('soma os dias de todos os períodos', () => {
    expect(getTotalDays([])).toBe(0)
    expect(getTotalDays([period('2027-03-10', '2027-03-19'), period('2027-04-04', '2027-04-13')])).toBe(20)
  })
})

describe('intervalo mínimo', () => {
  it('calcula os dias livres entre dois períodos', () => {
    expect(freeDaysBetween('2027-03-19', '2027-04-04')).toBe(15)
    expect(freeDaysBetween('2027-03-19', '2027-04-03')).toBe(14)
    expect(freeDaysBetween('2027-03-19', '2027-03-20')).toBe(0)
    expect(freeDaysBetween('2027-03-19', '2027-03-19')).toBe(-1)
  })

  it('retorna zero para datas inválidas', () => {
    expect(freeDaysBetween('2027-03-19', '2027-02-30')).toBe(0)
    expect(freeDaysBetween('2027-02-30', '2027-04-04')).toBe(0)
  })

  it('calcula a primeira data de início permitida', () => {
    expect(earliestNextStart('2027-03-19', 15)).toBe('2027-04-04')
    expect(earliestNextStart('2027-12-31', 0)).toBe('2028-01-01')
    expect(earliestNextStart('2027-02-30', 15)).toBeNull()
  })
})

describe('data inicial sugerida', () => {
  it('encontra o último período completo anterior', () => {
    const periods = [
      period('2027-03-10', '2027-03-19'),
      period('2027-04-04', ''),
      period('2027-05-01', '2027-05-10'),
    ]

    expect(findLastCompletePeriodBefore(periods, 2)).toEqual(period('2027-03-10', '2027-03-19'))
    expect(findLastCompletePeriodBefore(periods, 0)).toBeNull()
  })

  it('encontra a primeira data disponível a partir de uma referência', () => {
    const periods = [
      period('2027-04-04', '2027-04-13'),
    ]

    expect(firstAvailableDateFrom('2027-04-04', periods, rules)).toBe('2027-04-29')
    expect(firstAvailableDateFrom('2026-12-01', [], rules)).toBe('2027-01-01')
    expect(firstAvailableDateFrom('2027-12-31', [period('2027-12-31', '2027-12-31')], rules)).toBeNull()
  })

  it('retorna nulo para referência ou ciclo inválido', () => {
    expect(firstAvailableDateFrom('2027-02-30', [], rules)).toBeNull()
    expect(firstAvailableDateFrom('2027-03-10', [], { ...rules, cycleStart: 'inválida' })).toBeNull()
    expect(firstAvailableDateFrom('2027-03-10', [], { ...rules, cycleEnd: 'inválida' })).toBeNull()
    expect(firstAvailableDateFrom('2028-01-01', [], rules)).toBeNull()
  })

  it('usa a data inicial do período atual quando já existe', () => {
    const periods = [period('2027-05-10', '2027-05-19')]

    expect(suggestedInitialDate(periods, 0, rules, new Date('2027-01-02T12:00:00'))).toBe('2027-05-10')
  })

  it('retorna vazio quando o ciclo é inválido', () => {
    expect(suggestedInitialDate([], 0, { ...rules, cycleStart: 'inválida' })).toBe('')
    expect(suggestedInitialDate([], 0, { ...rules, cycleEnd: 'inválida' })).toBe('')
  })

  it('abre no início do ciclo quando hoje é anterior ao ciclo', () => {
    expect(suggestedInitialDate([], 0, rules, new Date('2026-10-28T12:00:00'))).toBe('2027-01-01')
  })

  it('usa hoje quando ele está dentro do ciclo', () => {
    expect(suggestedInitialDate([], 0, rules, new Date('2027-05-10T12:00:00'))).toBe('2027-05-10')
  })

  it('limita ao fim do ciclo quando hoje é posterior ao ciclo', () => {
    expect(suggestedInitialDate([], 0, rules, new Date('2028-05-10T12:00:00'))).toBe('2027-12-31')
  })

  it('sugere a primeira data após o último período completo', () => {
    const periods = [
      period('2027-03-10', '2027-03-19'),
      { startDate: '', endDate: '' },
    ]

    expect(suggestedInitialDate(periods, 1, rules, new Date('2027-01-02T12:00:00'))).toBe('2027-04-04')
  })

  it('pula datas ocupadas e intervalos de outros períodos', () => {
    const periods = [
      period('2027-04-04', '2027-04-13'),
      period('2027-03-10', '2027-03-19'),
      { startDate: '', endDate: '' },
    ]

    expect(suggestedInitialDate(periods, 2, rules, new Date('2027-01-02T12:00:00'))).toBe('2027-04-29')
  })

  it('ignora períodos incompletos ao calcular a sugestão', () => {
    const periods = [
      period('2027-03-10', '2027-03-19'),
      { startDate: '2027-04-04', endDate: '' },
      { startDate: '', endDate: '' },
    ]

    expect(suggestedInitialDate(periods, 2, rules, new Date('2027-01-02T12:00:00'))).toBe('2027-04-04')
  })

  it('limita ao início do ciclo quando o período anterior está fora dele', () => {
    const periods = [
      period('2026-12-01', '2026-12-10'),
      { startDate: '', endDate: '' },
    ]

    expect(suggestedInitialDate(periods, 1, rules, new Date('2026-10-28T12:00:00'))).toBe('2027-01-01')
  })

  it('mantém a data sugerida quando não há mais datas disponíveis no ciclo', () => {
    const shortRules: VacationRules = {
      ...rules,
      cycleStart: '2027-01-01',
      cycleEnd: '2027-01-03',
    }
    const periods = [
      period('2027-01-01', '2027-01-03'),
      { startDate: '', endDate: '' },
    ]

    expect(suggestedInitialDate(periods, 1, shortRules, new Date('2026-10-28T12:00:00'))).toBe('2027-01-03')
  })
})

describe('validação de período', () => {
  it('aceita período válido', () => {
    expect(validatePeriod(period('2027-03-10', '2027-03-19'), rules)).toEqual([])
  })

  it('rejeita data inválida', () => {
    const issues = validatePeriod(period('2027-02-30', '2027-03-19'), rules)
    expect(issues).toEqual([
      expect.objectContaining({ code: 'invalid_date', field: 'startDate' }),
    ])
  })

  it('rejeita data final inválida', () => {
    const issues = validatePeriod(period('2027-03-10', '2027-13-01'), rules)
    expect(issues).toEqual([
      expect.objectContaining({ code: 'invalid_date', field: 'endDate' }),
    ])
  })

  it('rejeita fim anterior ao início', () => {
    const issues = validatePeriod(period('2027-03-19', '2027-03-10'), rules)
    expect(issues).toEqual([
      expect.objectContaining({ code: 'end_before_start' }),
    ])
  })

  it('rejeita datas fora do ciclo', () => {
    expect(validatePeriod(period('2026-12-31', '2027-01-10'), rules)).toEqual([
      expect.objectContaining({ code: 'outside_cycle', field: 'startDate' }),
    ])
    expect(validatePeriod(period('2027-12-20', '2028-01-02'), rules)).toEqual([
      expect.objectContaining({ code: 'outside_cycle', field: 'endDate' }),
    ])
  })

  it('rejeita período menor que o mínimo', () => {
    const issues = validatePeriod(period('2027-03-10', '2027-03-10'), { ...rules, minPeriodDays: 2 })
    expect(issues).toEqual([
      expect.objectContaining({ code: 'too_short' }),
    ])
  })
})

describe('validação da agenda', () => {
  it('aceita agenda vazia como rascunho', () => {
    expect(validateSchedule([], rules)).toEqual([])
  })

  it('aceita três períodos com 30 dias e 15 dias livres entre eles', () => {
    expect(validateSchedule(validSchedule, rules)).toEqual([])
  })

  it('rejeita quantidade acima do máximo', () => {
    const issues = validateSchedule([
      ...validSchedule,
      period('2027-06-01', '2027-06-02'),
    ], rules)
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'too_many_periods' }),
    ]))
  })

  it('rejeita sobreposição', () => {
    const issues = validateSchedule([
      period('2027-03-10', '2027-03-19'),
      period('2027-03-19', '2027-03-28'),
    ], rules)
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'overlap', periodIndex: 1 }),
    ]))
  })

  it('rejeita intervalos menores que o mínimo e informa os dias livres', () => {
    const issues = validateSchedule([
      period('2027-03-10', '2027-03-19'),
      period('2027-04-03', '2027-04-12'),
    ], rules)
    expect(issues).toEqual([
      expect.objectContaining({
        code: 'insufficient_gap',
        periodIndex: 1,
        message: 'Existem apenas 14 dias livres entre 19/03/2027 e 03/04/2027; o mínimo é 15.',
      }),
    ])
  })

  it('usa singular quando há apenas um dia livre', () => {
    const issues = validateSchedule([
      period('2027-03-10', '2027-03-19'),
      period('2027-03-21', '2027-03-25'),
    ], rules)
    expect(issues).toEqual([
      expect.objectContaining({
        code: 'insufficient_gap',
        message: 'Existem apenas 1 dia livre entre 19/03/2027 e 21/03/2027; o mínimo é 15.',
      }),
    ])
  })

  it('rejeita total acima do permitido', () => {
    const issues = validateSchedule([
      period('2027-03-10', '2027-03-20'),
      period('2027-04-06', '2027-04-16'),
      period('2027-05-02', '2027-05-12'),
    ], rules)
    expect(issues).toEqual([
      expect.objectContaining({ code: 'exceeds_total' }),
    ])
  })

  it('ignora a checagem de intervalo quando há sobreposição', () => {
    const issues = validateSchedule([
      period('2027-03-10', '2027-03-19'),
      period('2027-03-19', '2027-03-19'),
    ], rules)
    expect(issues.some(issue => issue.code === 'insufficient_gap')).toBe(false)
  })
})

describe('estrutura independente das regras de negócio', () => {
  it('aceita agenda estruturalmente válida mesmo fora do ciclo', () => {
    expect(validateStructure([
      period('2026-12-01', '2026-12-10'),
      period('2026-12-20', '2026-12-30'),
    ])).toEqual([])
  })

  it('rejeita datas inválidas', () => {
    expect(validateStructure([
      period('2027-02-30', '2027-03-10'),
      period('2027-03-10', '2027-13-01'),
    ])).toEqual([
      expect.objectContaining({ code: 'invalid_date', field: 'startDate', periodIndex: 0 }),
      expect.objectContaining({ code: 'invalid_date', field: 'endDate', periodIndex: 1 }),
    ])
  })

  it('rejeita fim anterior ao início e sobreposição', () => {
    expect(validateStructure([
      period('2027-03-19', '2027-03-10'),
      period('2027-03-10', '2027-03-19'),
      period('2027-03-19', '2027-03-28'),
    ])).toEqual([
      expect.objectContaining({ code: 'end_before_start', periodIndex: 0 }),
      expect.objectContaining({ code: 'overlap', periodIndex: 2 }),
    ])
  })
})

describe('confirmação', () => {
  it('exige exatamente o total de dias', () => {
    expect(validateForConfirmation(validSchedule, rules)).toEqual([])

    const issues = validateForConfirmation([
      period('2027-03-10', '2027-03-19'),
    ], rules)
    expect(issues).toEqual([
      expect.objectContaining({ code: 'total_mismatch' }),
    ])
  })

  it('acumula problemas estruturais e de total', () => {
    const issues = validateForConfirmation([
      period('2027-03-10', '2027-03-09'),
    ], rules)
    expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'end_before_start',
      'total_mismatch',
    ]))
  })
})

describe('sobreposição e status', () => {
  it('encontra pares sobrepostos', () => {
    expect(findOverlaps([
      period('2027-03-10', '2027-03-19'),
      period('2027-03-19', '2027-03-28'),
      period('2027-04-10', '2027-04-12'),
    ])).toEqual([[0, 1]])
  })

  it('ignora períodos inválidos na busca por sobreposição', () => {
    expect(findOverlaps([
      period('2027-02-30', '2027-03-19'),
      period('2027-03-10', '2027-03-28'),
    ])).toEqual([])
  })

  it('deriva o status da agenda', () => {
    expect(deriveStatus([])).toBe('empty')
    expect(deriveStatus([period('2027-03-10', '2027-03-19')])).toBe('draft')
    expect(deriveStatus([
      period('2027-03-10', '2027-03-19', 'confirmed'),
      period('2027-04-04', '2027-04-13'),
    ])).toBe('partial')
    expect(deriveStatus(validSchedule)).toBe('confirmed')
  })
})

describe('datas indisponíveis', () => {
  it('lista os dias ocupados', () => {
    expect(getOccupiedDates([period('2027-03-10', '2027-03-12')])).toEqual([
      '2027-03-10',
      '2027-03-11',
      '2027-03-12',
    ])
  })

  it('lista os dias bloqueados pelo intervalo mínimo', () => {
    const blocked = getBlockedGapDates([period('2027-03-10', '2027-03-12')], rules)
    expect(blocked).toHaveLength(15)
    expect(blocked[0]).toBe('2027-03-13')
    expect(blocked.at(-1)).toBe('2027-03-27')
  })

  it('não bloqueia datas fora do ciclo', () => {
    const blocked = getBlockedGapDates([period('2027-12-20', '2027-12-31')], rules)
    expect(blocked).toEqual([])
  })

  it('une dias ocupados e bloqueados sem duplicatas', () => {
    const disabled = getDisabledDates([
      period('2027-03-10', '2027-03-12'),
      period('2027-03-15', '2027-03-16'),
    ], rules)
    expect(disabled).toContain('2027-03-10')
    expect(disabled).toContain('2027-03-13')
    expect(disabled).toContain('2027-03-15')
    expect(new Set(disabled).size).toBe(disabled.length)
    expect(disabled).toEqual([...disabled].sort())
  })

  it('verifica se uma data está indisponível', () => {
    const periods = [period('2027-03-10', '2027-03-12')]
    expect(isDateDisabled('2027-03-10', periods, rules)).toBe(true)
    expect(isDateDisabled('2027-03-20', periods, rules)).toBe(true)
    expect(isDateDisabled('2027-03-28', periods, rules)).toBe(false)
    expect(isDateDisabled('2026-12-31', periods, rules)).toBe(true)
    expect(isDateDisabled('2027-02-30', periods, rules)).toBe(true)
  })

  it('ignora períodos inválidos ao listar datas ocupadas', () => {
    expect(getOccupiedDates([
      period('2027-02-30', '2027-03-10'),
      period('2027-03-10', '2027-13-01'),
      period('2027-03-10', '2027-03-09'),
    ])).toEqual([])
  })

  it('ignora períodos inválidos e ciclo inválido ao bloquear o intervalo', () => {
    expect(getBlockedGapDates([
      period('2027-02-30', '2027-03-10'),
    ], rules)).toEqual([])

    expect(getBlockedGapDates([
      period('2027-03-10', '2027-03-12'),
    ], { ...rules, cycleEnd: 'inválida' })).toEqual([])
  })
})
