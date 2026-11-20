<script setup lang="ts">
import type { EmployeeSummary } from '~~/shared/types/api'
import {
  buildMonthWeeks,
  countEmployeesInMonth,
  formatMonthLabel,
  getCycleMonths,
  getCycleYears,
  getEmployeesOnDate,
  type MonthDay,
} from '~~/shared/utils/calendar'
import { formatDateBR } from '~~/shared/utils/date'

const props = defineProps<{
  employees: EmployeeSummary[]
  cycleStart: string
  cycleEnd: string
  initialMonth: { year: number, month: number }
}>()

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long' })

const cycleMonths = computed(() => getCycleMonths(props.cycleStart, props.cycleEnd))
const years = computed(() => getCycleYears(props.cycleStart, props.cycleEnd))
const initial = cycleMonths.value.find(month =>
  month.year === props.initialMonth.year && month.month === props.initialMonth.month) ?? cycleMonths.value[0]
const selectedYear = ref(initial?.year ?? props.initialMonth.year)
const selectedMonth = ref(initial?.month ?? props.initialMonth.month)

const availableMonths = computed(() =>
  cycleMonths.value.filter(month => month.year === selectedYear.value))
const selectedMonthOption = computed(() =>
  availableMonths.value.find(month => month.month === selectedMonth.value))
const selectedMonthLabel = computed(() =>
  selectedMonthOption.value?.label ?? formatMonthLabel(selectedYear.value, selectedMonth.value))
const currentIndex = computed(() => cycleMonths.value.findIndex(month =>
  month.year === selectedYear.value && month.month === selectedMonth.value))
const canGoPrevious = computed(() => currentIndex.value > 0)
const canGoNext = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < cycleMonths.value.length - 1)
const weeks = computed(() =>
  buildMonthWeeks(selectedYear.value, selectedMonth.value, props.cycleStart, props.cycleEnd))
const employeesByDate = computed(() => {
  const map = new Map<string, EmployeeSummary[]>()

  for (const week of weeks.value) {
    for (const day of week.days) {
      if (!day.inMonth || !day.inCycle) {
        continue
      }

      map.set(
        day.date,
        getEmployeesOnDate(props.employees, day.date, props.cycleStart, props.cycleEnd),
      )
    }
  }

  return map
})
const calendarWeeks = computed(() => weeks.value.map(week => ({
  days: week.days.map(day => ({
    ...day,
    names: day.inMonth && day.inCycle
      ? (employeesByDate.value.get(day.date) ?? []).map(employee => employee.name)
      : [],
  })),
})))
const peopleInMonth = computed(() => countEmployeesInMonth(
  props.employees,
  selectedYear.value,
  selectedMonth.value,
  props.cycleStart,
  props.cycleEnd,
))

watch(selectedYear, () => {
  if (!availableMonths.value.some(month => month.month === selectedMonth.value)) {
    selectedMonth.value = availableMonths.value[0]?.month ?? selectedMonth.value
  }
})

function monthName(month: number): string {
  const value = MONTH_FORMATTER.format(new Date(2020, month - 1, 1))
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function goToPreviousMonth(): void {
  const target = cycleMonths.value[currentIndex.value - 1]

  if (!target) {
    return
  }

  selectedYear.value = target.year
  selectedMonth.value = target.month
}

function goToNextMonth(): void {
  const target = cycleMonths.value[currentIndex.value + 1]

  if (!target) {
    return
  }

  selectedYear.value = target.year
  selectedMonth.value = target.month
}

function dayClasses(day: MonthDay & { names: string[] }): string {
  if (!day.inMonth) {
    return 'bg-slate-50 text-slate-300'
  }

  if (!day.inCycle) {
    return 'bg-slate-100 text-slate-400'
  }

  if (day.names.length > 0) {
    return 'bg-brand-50 ring-1 ring-inset ring-brand-100'
  }

  return 'bg-white'
}

function dayLabel(day: MonthDay & { names: string[] }): string {
  if (!day.inMonth) {
    return ''
  }

  if (!day.inCycle) {
    return `${formatDateBR(day.date)}: fora do ciclo`
  }

  return day.names.length === 0
    ? `${formatDateBR(day.date)}: sem férias`
    : `${formatDateBR(day.date)}: ${day.names.join(', ')}`
}
</script>

<template>
  <div class="space-y-4">
    <p
      v-if="cycleMonths.length === 0"
      class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
    >
      Não foi possível montar o calendário com o ciclo configurado.
    </p>

    <template v-else>
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label for="calendar-month" class="mb-1 block text-sm font-medium text-slate-700">
              Mês
            </label>
            <select
              id="calendar-month"
              v-model.number="selectedMonth"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
            >
              <option
                v-for="month in availableMonths"
                :key="month.month"
                :value="month.month"
              >
                {{ monthName(month.month) }}
              </option>
            </select>
          </div>

          <div>
            <label for="calendar-year" class="mb-1 block text-sm font-medium text-slate-700">
              Ano
            </label>
            <select
              id="calendar-year"
              v-model.number="selectedYear"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
            >
              <option v-for="year in years" :key="year" :value="year">
                {{ year }}
              </option>
            </select>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canGoPrevious"
              aria-label="Mês anterior"
              title="Mês anterior"
              @click="goToPreviousMonth"
            >
              ‹
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canGoNext"
              aria-label="Próximo mês"
              title="Próximo mês"
              @click="goToNextMonth"
            >
              ›
            </button>
          </div>
        </div>

        <p class="text-sm text-slate-600">
          Pessoas com férias no mês:
          <strong class="text-slate-900">{{ peopleInMonth }}</strong>
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <h3 class="text-base font-semibold text-slate-900">
          {{ selectedMonthLabel }}
        </h3>
        <p class="text-xs text-slate-500">
          Dias com fundo azul têm pelo menos uma pessoa de férias.
        </p>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200 print:overflow-visible print:border-0">
        <table class="min-w-[700px] table-fixed border-collapse text-xs print:min-w-0 print:text-[9px]">
          <caption class="sr-only">
            Calendário mensal de férias
          </caption>
          <thead>
            <tr class="bg-slate-50 text-slate-600">
              <th
                v-for="weekday in WEEKDAYS"
                :key="weekday"
                scope="col"
                class="border-b border-l border-slate-200 px-2 py-2 text-center font-semibold first:border-l-0"
              >
                {{ weekday }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(week, weekIndex) in calendarWeeks" :key="weekIndex">
              <td
                v-for="day in week.days"
                :key="day.date"
                class="h-24 border-b border-l border-slate-200 p-2 align-top first:border-l-0"
                :class="dayClasses(day)"
                :aria-label="dayLabel(day) || undefined"
              >
                <span
                  v-if="day.inMonth"
                  class="text-xs font-semibold"
                  :class="day.inCycle ? 'text-slate-700' : 'text-slate-400'"
                >
                  {{ day.day }}
                </span>

                <div v-if="day.names.length > 0" class="mt-1 space-y-0.5">
                  <p
                    v-for="name in day.names.slice(0, 3)"
                    :key="name"
                    class="truncate text-[10px] leading-tight text-brand-800"
                  >
                    {{ name }}
                  </p>
                  <p v-if="day.names.length > 3" class="text-[10px] font-medium text-brand-700">
                    +{{ day.names.length - 3 }}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="peopleInMonth === 0" class="text-sm text-slate-500">
        Nenhum servidor com férias neste mês.
      </p>
    </template>
  </div>
</template>
