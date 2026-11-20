<script setup lang="ts">
import type { EmployeeSummary } from '~~/shared/types/api'
import {
  buildAnnualWeeks,
  countEmployeeDaysInRange,
  getEmployeesInRange,
  groupAnnualWeeksByMonth,
  type AnnualWeek,
} from '~~/shared/utils/calendar'
import { formatDateBR, parseISODate } from '~~/shared/utils/date'

const props = defineProps<{
  employees: EmployeeSummary[]
  cycleStart: string
  cycleEnd: string
}>()

const weeks = computed(() => buildAnnualWeeks(props.cycleStart, props.cycleEnd))
const monthGroups = computed(() => groupAnnualWeeksByMonth(weeks.value))
const rows = computed(() => props.employees.map(employee => ({
  employee,
  totalDays: countEmployeeDaysInRange(employee.periods, props.cycleStart, props.cycleEnd),
  weeks: weeks.value.map(week => ({
    week,
    days: countEmployeeDaysInRange(
      employee.periods,
      week.startDate < props.cycleStart ? props.cycleStart : week.startDate,
      week.endDate > props.cycleEnd ? props.cycleEnd : week.endDate,
    ),
  })),
})))
const weekSummaries = computed(() => weeks.value.map(week => ({
  week,
  count: getEmployeesInRange(
    props.employees,
    week.startDate,
    week.endDate,
    props.cycleStart,
    props.cycleEnd,
  ).length,
})))

function dayOfMonth(value: string): string {
  return String(parseISODate(value)?.getDate() ?? '')
}

function weekLabel(week: AnnualWeek): string {
  return `Semana de ${formatDateBR(week.startDate)} a ${formatDateBR(week.endDate)}`
}

function cellLabel(employee: EmployeeSummary, week: AnnualWeek, days: number): string {
  const detail = days === 0 ? 'sem férias' : `${days} dia(s) de férias`

  return `${employee.name} — ${weekLabel(week)}: ${detail}`
}

function cellClasses(days: number): string {
  return days > 0 ? 'bg-brand-600' : 'bg-white'
}

function countClasses(count: number): string {
  if (count === 0) {
    return 'bg-slate-50 text-slate-400'
  }

  if (count <= 2) {
    return 'bg-brand-50 text-brand-800'
  }

  if (count <= 4) {
    return 'bg-brand-100 text-brand-800'
  }

  return 'bg-brand-600 text-white'
}

function countLabel(week: AnnualWeek, count: number): string {
  return `${weekLabel(week)}: ${count} pessoa(s) ausente(s)`
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>Cada coluna é uma semana (segunda a domingo).</p>
      <ul class="flex flex-wrap items-center gap-3 text-xs">
        <li class="flex items-center gap-1.5">
          <span class="size-3 rounded bg-brand-600" aria-hidden="true" />
          Com férias
        </li>
        <li class="flex items-center gap-1.5">
          <span class="size-3 rounded border border-slate-300 bg-white" aria-hidden="true" />
          Sem férias
        </li>
      </ul>
    </div>

    <p
      v-if="weeks.length === 0"
      class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
    >
      Não foi possível montar a visão anual com o ciclo configurado.
    </p>

    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 print:overflow-visible print:border-0">
      <table class="min-w-max border-collapse text-xs print:text-[7px]">
        <caption class="sr-only">
          Visão anual de férias por semana
        </caption>
        <thead>
          <tr class="bg-slate-50 text-slate-600">
            <th
              rowspan="2"
              scope="col"
              class="sticky left-0 z-20 min-w-44 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold"
            >
              Servidor
            </th>
            <th
              rowspan="2"
              scope="col"
              class="border-b border-slate-200 px-2 py-2 text-center font-semibold"
            >
              Dias
            </th>
            <th
              v-for="group in monthGroups"
              :key="group.key"
              :colspan="group.weeks.length"
              scope="colgroup"
              class="border-b border-l border-slate-200 px-1 py-1.5 text-center font-semibold"
            >
              {{ group.label }}
            </th>
          </tr>
          <tr class="bg-slate-50 text-slate-500">
            <th
              v-for="week in weeks"
              :key="week.startDate"
              scope="col"
              class="border-b border-l border-slate-200 px-1 py-1 text-center font-medium"
              :title="weekLabel(week)"
            >
              {{ dayOfMonth(week.startDate) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.employee.id" class="hover:bg-slate-50">
            <th
              scope="row"
              class="sticky left-0 z-10 min-w-44 border-b border-r border-slate-200 bg-white px-3 py-1.5 text-left font-medium text-slate-900"
            >
              {{ row.employee.name }}
            </th>
            <td class="border-b border-slate-200 px-2 py-1.5 text-center text-slate-600">
              {{ row.totalDays }}
            </td>
            <td
              v-for="cell in row.weeks"
              :key="cell.week.startDate"
              class="h-6 min-w-6 border-b border-l border-slate-200 p-0.5 text-center"
              :class="cellClasses(cell.days)"
              :aria-label="cellLabel(row.employee, cell.week, cell.days)"
              :title="cellLabel(row.employee, cell.week, cell.days)"
            >
              <span
                v-if="cell.days > 0"
                class="mx-auto block size-1.5 rounded-full bg-white"
                aria-hidden="true"
              />
            </td>
          </tr>
          <tr class="bg-slate-50 font-semibold text-slate-700">
            <th
              scope="row"
              class="sticky left-0 z-10 min-w-44 border-r border-slate-200 bg-slate-50 px-3 py-2 text-left"
            >
              Pessoas ausentes na semana
            </th>
            <td class="px-2 py-2 text-center" aria-hidden="true" />
            <td
              v-for="summary in weekSummaries"
              :key="summary.week.startDate"
              class="border-l border-slate-200 px-1 py-2 text-center"
              :class="countClasses(summary.count)"
              :aria-label="countLabel(summary.week, summary.count)"
              :title="countLabel(summary.week, summary.count)"
            >
              {{ summary.count }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="employees.length === 0" class="text-sm text-slate-500">
      Nenhum servidor ativo para exibir.
    </p>
  </div>
</template>
