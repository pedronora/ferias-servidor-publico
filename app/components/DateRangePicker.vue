<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { ptBR } from 'date-fns/locale'
import type { PeriodInput } from '~~/shared/schemas/schedule'
import { formatDateRangeBR, parseISODate, toISODate } from '~~/shared/utils/date'

const model = defineModel<PeriodInput>({ required: true })

const props = withDefaults(defineProps<{
  disabledDates: string[]
  minDate: string
  maxDate: string
  disabled?: boolean
  initialDate?: string
  label: string
  id: string
}>(), {
  disabled: false,
  initialDate: '',
})

const value = computed<Date[] | null>(() => {
  const start = parseISODate(model.value.startDate)
  const end = parseISODate(model.value.endDate)

  if (!start) {
    return null
  }

  return end ? [start, end] : [start]
})

const disabledDateValues = computed(() => props.disabledDates
  .map(parseISODate)
  .filter((date): date is Date => date !== null))

const minDateValue = computed(() => parseISODate(props.minDate) ?? new Date(1970, 0, 1))
const maxDateValue = computed(() => parseISODate(props.maxDate) ?? new Date(2100, 11, 31))

const initialDateValue = computed(() => {
  const selectedStart = parseISODate(model.value.startDate)
  if (selectedStart) {
    return selectedStart
  }

  const configuredInitial = parseISODate(props.initialDate)
  if (configuredInitial) {
    return configuredInitial
  }

  const today = new Date()
  const fallback = today < minDateValue.value ? minDateValue.value : today
  return fallback > maxDateValue.value ? maxDateValue.value : fallback
})

function normalizeDate(value: unknown): string {
  if (value instanceof Date) {
    return toISODate(value)
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  return ''
}

function updateValue(value: unknown): void {
  const values = Array.isArray(value) ? value : value ? [value] : []
  const startDate = normalizeDate(values[0])
  const endDate = normalizeDate(values[1])

  model.value = { startDate, endDate }
}
</script>

<template>
  <div>
    <label
      :for="id"
      class="mb-1 block text-sm font-medium text-slate-700"
    >
      {{ label }}
    </label>
    <ClientOnly>
      <VueDatePicker
        :model-value="value"
        :range="{ partialRange: false }"
        :enable-time-picker="false"
        :auto-apply="true"
        :min-date="minDateValue"
        :max-date="maxDateValue"
        :start-date="initialDateValue"
        focus-start-date
        :disabled-dates="disabledDateValues"
        :disabled="disabled"
        :locale="ptBR"
        :formats="{ input: 'dd/MM/yyyy', preview: 'dd/MM/yyyy' }"
        :text-input="{ format: 'dd/MM/yyyy' }"
        v-bind="{ ariaLabels: { input: label } }"
        :input-attrs="{ id }"
        @update:model-value="updateValue"
      />
      <template #fallback>
        <input
          :id="id"
          type="text"
          disabled
          class="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"
          :value="model.startDate && model.endDate ? formatDateRangeBR(model.startDate, model.endDate) : ''"
        >
      </template>
    </ClientOnly>
    <p class="mt-1 text-xs text-slate-500">
      Selecione a data inicial e a data final. Datas ocupadas ou dentro do intervalo mínimo ficam bloqueadas.
    </p>
  </div>
</template>
