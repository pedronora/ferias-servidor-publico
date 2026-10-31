<script setup lang="ts">
import type { EmployeeSummary, ReportResponse, ScheduleStatus } from '~~/shared/types/api'
import { formatDateRangeBR } from '~~/shared/utils/date'

definePageMeta({ middleware: 'admin', layout: 'admin' })

useHead({ title: 'Relatório | Administração' })

const { data, pending, error, refresh } = await useFetch<ReportResponse>('/api/admin/report', {
  headers: useRequestHeaders(['cookie']),
})

const statusLabels: Record<ScheduleStatus, string> = {
  empty: 'Sem agenda',
  draft: 'Rascunho',
  partial: 'Parcial',
  confirmed: 'Confirmada',
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

function formatDateTimeBR(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date)
}

function periodsText(employee: EmployeeSummary): string {
  if (employee.periods.length === 0) {
    return 'Nenhum período'
  }

  return employee.periods
    .map(period => formatDateRangeBR(period.startDate, period.endDate))
    .join(' | ')
}

function csvValue(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`
}

function exportCsv(): void {
  if (!import.meta.client || !data.value) {
    return
  }

  const rows = [
    ['Nome', 'E-mail', 'Status', 'Total de dias', 'Períodos'].map(csvValue).join(';'),
    ...data.value.employees.map(employee => [
      employee.name,
      employee.email,
      statusLabels[employee.status],
      employee.totalDays,
      periodsText(employee),
    ].map(csvValue).join(';')),
  ]
  const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `relatorio-ferias-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function printReport(): void {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">
          Administração
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900">
          Relatório consolidado
        </h1>
        <p v-if="data" class="mt-1 text-sm text-slate-600">
          Ciclo de {{ formatDateRangeBR(data.settings.cycleStart, data.settings.cycleEnd) }}
          · Gerado em {{ formatDateTimeBR(data.generatedAt) }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          @click="printReport"
        >
          Imprimir
        </button>
        <button
          type="button"
          class="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="!data"
          @click="exportCsv"
        >
          Exportar CSV
        </button>
      </div>
    </div>

    <div
      v-if="pending"
      class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600"
    >
      Gerando relatório...
    </div>

    <div
      v-else-if="error"
      class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800"
      role="alert"
    >
      <p>{{ error.message }}</p>
      <button
        type="button"
        class="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 font-medium hover:bg-rose-100"
        @click="refresh()"
      >
        Tentar novamente
      </button>
    </div>

    <template v-else-if="data">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Servidores ativos</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ data.summary.employees }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Com agenda</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ data.summary.withSchedule }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Confirmadas</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ data.summary.confirmed }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Dias marcados</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ data.summary.totalVacationDays }}</p>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">
          Situação por servidor
        </h2>
        <div class="mt-3 hidden lg:block print:block">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" class="px-3 py-2 font-semibold">Servidor</th>
                <th scope="col" class="px-3 py-2 font-semibold">Status</th>
                <th scope="col" class="px-3 py-2 font-semibold">Dias</th>
                <th scope="col" class="px-3 py-2 font-semibold">Períodos</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="employee in data.employees" :key="employee.id">
                <td class="px-3 py-3">
                  <NuxtLink
                    :to="`/admin/servidores/${employee.id}`"
                    class="font-medium text-brand-700 hover:underline"
                  >
                    {{ employee.name }}
                  </NuxtLink>
                  <p class="text-xs text-slate-500">{{ employee.email }}</p>
                </td>
                <td class="px-3 py-3">
                  <StatusBadge :status="employee.status" />
                </td>
                <td class="px-3 py-3 font-medium text-slate-900">
                  {{ employee.totalDays }}/{{ data.settings.totalDays }}
                </td>
                <td class="px-3 py-3 text-xs text-slate-600">
                  {{ periodsText(employee) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul class="mt-3 divide-y divide-slate-100 lg:hidden print:hidden">
          <li v-for="employee in data.employees" :key="employee.id" class="space-y-2 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <NuxtLink
                  :to="`/admin/servidores/${employee.id}`"
                  class="font-medium text-brand-700 hover:underline"
                >
                  {{ employee.name }}
                </NuxtLink>
                <p class="truncate text-xs text-slate-500">
                  {{ employee.email }}
                </p>
              </div>
              <StatusBadge :status="employee.status" />
            </div>

            <p class="text-sm font-medium text-slate-900">
              {{ employee.totalDays }}/{{ data.settings.totalDays }} dias
            </p>

            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
                Períodos
              </p>
              <template v-if="employee.periods.length > 0">
                <p v-for="period in employee.periods" :key="period.id" class="text-xs text-slate-600">
                  {{ formatDateRangeBR(period.startDate, period.endDate) }}
                </p>
              </template>
              <p v-else class="text-xs text-slate-400">
                Nenhum período
              </p>
            </div>
          </li>
        </ul>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">
          Coincidências de férias
        </h2>
        <p class="mt-1 text-sm text-slate-600">
          Pares de servidores com períodos sobrepostos no ciclo.
        </p>

        <p v-if="data.coincidences.length === 0" class="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          Nenhuma coincidência encontrada.
        </p>

        <template v-else>
          <div class="mt-3 hidden lg:block print:block">
            <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" class="px-3 py-2 font-semibold">Servidor A</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Servidor B</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Período sobreposto</th>
                  <th scope="col" class="px-3 py-2 font-semibold">Dias</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="coincidence in data.coincidences" :key="`${coincidence.employeeA.id}-${coincidence.employeeB.id}-${coincidence.startDate}`">
                  <td class="px-3 py-2">{{ coincidence.employeeA.name }}</td>
                  <td class="px-3 py-2">{{ coincidence.employeeB.name }}</td>
                  <td class="px-3 py-2">
                    {{ formatDateRangeBR(coincidence.startDate, coincidence.endDate) }}
                  </td>
                  <td class="px-3 py-2 font-medium">{{ coincidence.days }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <ul class="mt-3 divide-y divide-slate-100 lg:hidden print:hidden">
            <li
              v-for="coincidence in data.coincidences"
              :key="`${coincidence.employeeA.id}-${coincidence.employeeB.id}-${coincidence.startDate}`"
              class="space-y-2 py-3"
            >
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Servidor A
                  </p>
                  <p class="text-sm text-slate-900">
                    {{ coincidence.employeeA.name }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Servidor B
                  </p>
                  <p class="text-sm text-slate-900">
                    {{ coincidence.employeeB.name }}
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm text-slate-600">
                  {{ formatDateRangeBR(coincidence.startDate, coincidence.endDate) }}
                </p>
                <p class="text-sm font-medium text-slate-900">
                  {{ coincidence.days }} dias
                </p>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </template>
  </section>
</template>
