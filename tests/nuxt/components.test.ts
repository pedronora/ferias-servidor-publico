import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '../../app/components/ConfirmDialog.vue'
import DateRangePicker from '../../app/components/DateRangePicker.vue'
import PeriodsEditor from '../../app/components/PeriodsEditor.vue'
import StatusBadge from '../../app/components/StatusBadge.vue'
import ValidationList from '../../app/components/ValidationList.vue'
import type { PeriodInput } from '../../shared/schemas/schedule'
import type { VacationRules } from '../../shared/rules/vacation'

const rules: VacationRules = {
  cycleStart: '2027-01-01',
  cycleEnd: '2027-12-31',
  totalDays: 30,
  maxPeriods: 3,
  minPeriodDays: 1,
  minGapDays: 15,
}

describe('StatusBadge', () => {
  it.each([
    ['confirmed', 'Solicitado'],
    ['partial', 'Parcial'],
    ['draft', 'Rascunho'],
    ['empty', 'Sem agenda'],
  ] as const)('exibe o rótulo de %s', (status, label) => {
    const wrapper = mount(StatusBadge, { props: { status } })

    expect(wrapper.text()).toBe(label)
    expect(wrapper.classes()).toContain('rounded-full')
  })
})

describe('ValidationList', () => {
  it('não renderiza nada sem problemas', () => {
    const wrapper = mount(ValidationList, { props: { issues: [] } })

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('lista os problemas e usa o título de erro por padrão', () => {
    const wrapper = mount(ValidationList, {
      props: {
        issues: [
          { code: 'too_short', message: 'Período muito curto.' },
          { code: 'overlap', message: 'Períodos sobrepostos.' },
        ],
      },
    })

    expect(wrapper.get('[role="alert"]').text()).toContain('Corrija antes de continuar')
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('usa o estilo de aviso quando solicitado', () => {
    const wrapper = mount(ValidationList, {
      props: {
        variant: 'warning',
        issues: [{ code: 'total_mismatch', message: 'Total diferente.' }],
      },
    })

    expect(wrapper.text()).toContain('Avisos')
    expect(wrapper.get('[role="alert"]').classes()).toContain('border-amber-200')
  })
})

describe('ConfirmDialog', () => {
  function mountDialog(open = true, busy = false) {
    return mount(ConfirmDialog, {
      props: {
        open,
        busy,
        title: 'Confirmar agenda?',
        description: 'Depois não será possível alterar.',
        confirmLabel: 'Confirmar agora',
      },
      global: {
        stubs: { Teleport: true },
      },
    })
  }

  it('não renderiza o diálogo quando fechado', () => {
    const wrapper = mountDialog(false)

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('emite cancelar ao clicar no botão ou no fundo', async () => {
    const wrapper = mountDialog()

    await wrapper.get('button[aria-label="Fechar diálogo"]').trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'Cancelar')!.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(2)
  })

  it('desabilita os botões enquanto processa', () => {
    const wrapper = mountDialog(true, true)

    const dialogButtons = wrapper.get('[role="dialog"]').findAll('button')

    expect(wrapper.get('[role="dialog"]').text()).toContain('Processando...')
    expect(dialogButtons.every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })

  it('emite confirmar ao clicar no botão principal', async () => {
    const wrapper = mountDialog()

    await wrapper.findAll('button').find(button => button.text() === 'Confirmar agora')!.trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})

describe('PeriodsEditor', () => {
  function mountEditor(modelValue: PeriodInput[], disabled = false) {
    return mount(PeriodsEditor, {
      props: { modelValue, rules, disabled },
      global: { stubs: { DateRangePicker: true } },
    })
  }

  it('adiciona e remove períodos', async () => {
    const wrapper = mountEditor([])

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([
      { startDate: '', endDate: '' },
    ])

    const withPeriod = mountEditor([{ startDate: '2027-01-10', endDate: '2027-01-19' }])
    await withPeriod.findAll('button').find(button => button.text() === 'Remover')!.trigger('click')

    expect(withPeriod.emitted('update:modelValue')?.[0]?.[0]).toEqual([])
  })

  it('mostra a quantidade de dias e bloqueia o limite de períodos', () => {
    const wrapper = mountEditor([
      { startDate: '2027-01-10', endDate: '2027-01-19' },
      { startDate: '2027-02-04', endDate: '2027-02-13' },
      { startDate: '2027-03-01', endDate: '2027-03-10' },
    ])

    expect(wrapper.text()).toContain('10 dia(s)')
    expect(wrapper.findAll('button').find(button => button.text() === 'Adicionar período')!.attributes('disabled')).toBeDefined()
  })

  it('esconde as ações quando está desabilitado', () => {
    const wrapper = mountEditor([{ startDate: '2027-01-10', endDate: '2027-01-19' }], true)

    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.text()).toContain('Período 1')
  })
})

describe('DateRangePicker', () => {
  const VueDatePickerStub = defineComponent({
    name: 'VueDatePicker',
    props: ['modelValue', 'disabledDates', 'minDate', 'maxDate', 'startDate', 'focusStartDate', 'disabled', 'range', 'formats', 'textInput', 'ariaLabels', 'locale'],
    emits: ['update:modelValue'],
    template: '<div data-test="date-picker" />',
  })

  const ClientOnlyStub = defineComponent({
    name: 'ClientOnly',
    template: '<div><slot /></div>',
  })

  interface PickerWrapper {
    props: (name: string) => unknown
    vm: { $emit: (event: string, ...args: unknown[]) => void }
  }

  function mountPicker(options: { modelValue?: PeriodInput, initialDate?: string } = {}) {
    return mount(DateRangePicker, {
      props: {
        id: 'period-0',
        label: 'Período 1',
        modelValue: options.modelValue ?? { startDate: '2027-01-10', endDate: '2027-01-19' },
        initialDate: options.initialDate ?? '2027-02-04',
        disabledDates: ['2027-02-01', 'data-invalida'],
        minDate: '2027-01-01',
        maxDate: '2027-12-31',
      },
      global: {
        stubs: {
          VueDatePicker: VueDatePickerStub,
          ClientOnly: ClientOnlyStub,
        },
      },
    })
  }

  it('associa o rótulo ao controle e normaliza a seleção', async () => {
    const wrapper = mountPicker()
    const picker = wrapper.getComponent('[data-test="date-picker"]') as unknown as PickerWrapper

    expect(wrapper.get('label').attributes('for')).toBe('period-0')
    expect(picker.props('disabledDates')).toHaveLength(1)
    expect(picker.props('startDate')).toEqual(new Date(2027, 0, 10))
    expect(picker.props('focusStartDate')).toBe(true)
    expect(picker.props('range')).toEqual({ partialRange: false })
    expect(picker.props('formats')).toEqual({ input: 'dd/MM/yyyy', preview: 'dd/MM/yyyy' })
    expect(picker.props('textInput')).toEqual({ format: 'dd/MM/yyyy' })
    expect(picker.props('ariaLabels')).toEqual({ input: 'Período 1' })

    await picker.vm.$emit('update:modelValue', ['2027-03-10', '2027-03-19'])

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({
      startDate: '2027-03-10',
      endDate: '2027-03-19',
    })
  })

  it('abre na data inicial sugerida quando o período está vazio', () => {
    const wrapper = mountPicker({
      modelValue: { startDate: '', endDate: '' },
      initialDate: '2027-08-04',
    })
    const picker = wrapper.getComponent('[data-test="date-picker"]') as unknown as PickerWrapper

    expect(picker.props('startDate')).toEqual(new Date(2027, 7, 4))
  })

  it('usa o início do ciclo quando não há data sugerida e hoje é anterior ao ciclo', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-28T12:00:00'))

    try {
      const wrapper = mountPicker({
        modelValue: { startDate: '', endDate: '' },
        initialDate: '',
      })
      const picker = wrapper.getComponent('[data-test="date-picker"]') as unknown as PickerWrapper

      expect(picker.props('startDate')).toEqual(new Date(2027, 0, 1))
    } finally {
      vi.useRealTimers()
    }
  })

  it('mantém a data final vazia enquanto o período está incompleto', async () => {
    const wrapper = mountPicker()
    const picker = wrapper.getComponent('[data-test="date-picker"]') as unknown as PickerWrapper

    await picker.vm.$emit('update:modelValue', [new Date(2027, 3, 4)])

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({
      startDate: '2027-04-04',
      endDate: '',
    })
  })

  it('completa o período ao receber a segunda data', async () => {
    const wrapper = mountPicker()
    const picker = wrapper.getComponent('[data-test="date-picker"]') as unknown as PickerWrapper

    await picker.vm.$emit('update:modelValue', [new Date(2027, 3, 4)])
    await picker.vm.$emit('update:modelValue', [new Date(2027, 3, 4), new Date(2027, 3, 13)])

    expect(wrapper.emitted('update:modelValue')?.[1]?.[0]).toEqual({
      startDate: '2027-04-04',
      endDate: '2027-04-13',
    })
  })

  it('lida com seleção vazia', async () => {
    const wrapper = mountPicker()
    const picker = wrapper.getComponent('[data-test="date-picker"]') as unknown as PickerWrapper

    await picker.vm.$emit('update:modelValue', null)

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({
      startDate: '',
      endDate: '',
    })
  })
})
