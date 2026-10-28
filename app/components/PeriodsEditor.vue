<script setup lang="ts">
import type { PeriodInput } from '~~/shared/schemas/schedule'
import { countDays, getDisabledDates, suggestedInitialDate, type VacationRules } from '~~/shared/rules/vacation'

const periods = defineModel<PeriodInput[]>({ required: true })

const props = withDefaults(defineProps<{
  rules: VacationRules
  disabled?: boolean
}>(), {
  disabled: false,
})

function updatePeriod(index: number, value: PeriodInput): void {
  const next = [...periods.value]
  next[index] = value
  periods.value = next
}

function addPeriod(): void {
  if (periods.value.length >= props.rules.maxPeriods) {
    return
  }

  periods.value = [
    ...periods.value,
    { startDate: '', endDate: '' },
  ]
}

function removePeriod(index: number): void {
  periods.value = periods.value.filter((_, current) => current !== index)
}

function disabledDatesFor(index: number): string[] {
  const otherPeriods = periods.value.filter((_, current) => current !== index)
  return getDisabledDates(otherPeriods, props.rules)
}

function daysFor(period: PeriodInput): number {
  return period.startDate && period.endDate ? countDays(period.startDate, period.endDate) : 0
}

function initialDateFor(index: number): string {
  return suggestedInitialDate(periods.value, index, props.rules)
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="periods.length === 0"
      class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600"
    >
      Nenhum período adicionado. Use o botão abaixo para começar.
    </div>

    <article
      v-for="(period, index) in periods"
      :key="index"
      class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-slate-900">
            Período {{ index + 1 }}
          </h3>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {{ daysFor(period) }} dia(s)
          </span>
        </div>
        <button
          v-if="!disabled"
          type="button"
          class="rounded-lg px-2 py-1 text-sm font-medium text-rose-700 hover:bg-rose-50"
          @click="removePeriod(index)"
        >
          Remover
        </button>
      </div>

      <DateRangePicker
        :id="`period-${index}`"
        :model-value="period"
        :label="`Início e fim do período ${index + 1}`"
        :disabled-dates="disabledDatesFor(index)"
        :initial-date="initialDateFor(index)"
        :min-date="rules.cycleStart"
        :max-date="rules.cycleEnd"
        :disabled="disabled"
        @update:model-value="updatePeriod(index, $event)"
      />
    </article>

    <div v-if="!disabled" class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        :disabled="periods.length >= rules.maxPeriods"
        @click="addPeriod"
      >
        Adicionar período
      </button>
      <p class="text-xs text-slate-500">
        Máximo de {{ rules.maxPeriods }} períodos; mínimo de {{ rules.minPeriodDays }} dia(s) por período.
      </p>
    </div>
  </div>
</template>
