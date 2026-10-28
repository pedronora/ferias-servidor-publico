<script setup lang="ts">
import type { EmployeeSummary } from '~~/shared/types/api'
import { formatDateRangeBR } from '~~/shared/utils/date'

definePageMeta({ middleware: 'admin', layout: 'admin' })

useHead({ title: 'Servidores | Administração' })

const search = ref('')
const status = ref('')
const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'partial', label: 'Parcial' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'empty', label: 'Sem agenda' },
]

const { data, pending, error, refresh } = await useFetch<{
  employees: EmployeeSummary[]
  total: number
}>('/api/admin/employees', {
  query: { search, status },
  headers: useRequestHeaders(['cookie']),
})
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">
          Administração
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900">
          Servidores
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          Consulte e ajuste as agendas de férias dos servidores ativos.
        </p>
      </div>
      <p v-if="data" class="text-sm text-slate-600">
        {{ data.total }} servidor(es) encontrado(s)
      </p>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <label for="employee-search" class="mb-1 block text-sm font-medium text-slate-700">
            Buscar por nome ou e-mail
          </label>
          <input
            id="employee-search"
            v-model="search"
            type="search"
            placeholder="Ex.: maria ou maria@example.com"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
          >
        </div>
        <div>
          <label for="employee-status" class="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="employee-status"
            v-model="status"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
          >
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div
      v-if="pending"
      class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600"
    >
      Carregando servidores...
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

    <div
      v-else-if="data && data.employees.length === 0"
      class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600"
    >
      Nenhum servidor encontrado com os filtros atuais.
    </div>

    <div v-else-if="data" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" class="px-4 py-3 font-semibold">Servidor</th>
              <th scope="col" class="px-4 py-3 font-semibold">Períodos</th>
              <th scope="col" class="px-4 py-3 font-semibold">Total</th>
              <th scope="col" class="px-4 py-3 font-semibold">Status</th>
              <th scope="col" class="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="employee in data.employees" :key="employee.id" class="hover:bg-slate-50">
              <td class="px-4 py-3">
                <p class="font-medium text-slate-900">{{ employee.name }}</p>
                <p class="text-xs text-slate-500">{{ employee.email }}</p>
              </td>
              <td class="px-4 py-3 text-slate-600">
                <template v-if="employee.periods.length > 0">
                  <span v-for="period in employee.periods" :key="period.id" class="block text-xs">
                    {{ formatDateRangeBR(period.startDate, period.endDate) }}
                  </span>
                </template>
                <span v-else class="text-xs text-slate-400">Nenhum período</span>
              </td>
              <td class="px-4 py-3 font-medium text-slate-900">
                {{ employee.totalDays }} dias
              </td>
              <td class="px-4 py-3">
                <StatusBadge :status="employee.status" />
              </td>
              <td class="px-4 py-3 text-right">
                <NuxtLink
                  :to="`/admin/servidores/${employee.id}`"
                  class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
                >
                  Abrir agenda
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
