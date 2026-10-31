<script setup lang="ts">
import type { EmployeeSummary } from '~~/shared/types/api'
import { formatDateRangeBR } from '~~/shared/utils/date'
import { normalizeApiError } from '~/utils/api-error'

definePageMeta({ middleware: 'admin', layout: 'admin' })

useHead({ title: 'Servidores | Administração' })

const search = ref('')
const status = ref('')
const situation = ref('all')
const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'partial', label: 'Parcial' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'empty', label: 'Sem agenda' },
]
const situationOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
]
const reactivatingId = ref('')
const actionError = ref('')

const { data, pending, error, refresh } = await useFetch<{
  employees: EmployeeSummary[]
  total: number
}>('/api/admin/employees', {
  query: { search, status, situation },
  headers: useRequestHeaders(['cookie']),
})

async function reactivate(employee: EmployeeSummary): Promise<void> {
  reactivatingId.value = employee.id
  actionError.value = ''

  try {
    await $fetch(`/api/admin/employees/${employee.id}`, {
      method: 'PATCH',
      body: { isActive: true },
    })
    await refresh()
  } catch (requestError) {
    actionError.value = normalizeApiError(requestError).message
  } finally {
    reactivatingId.value = ''
  }
}
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
          Consulte, cadastre e gerencie as agendas dos servidores.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <p v-if="data" class="text-sm text-slate-600">
          {{ data.total }} servidor(es) encontrado(s)
        </p>
        <NuxtLink
          to="/admin/servidores/novo"
          class="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Novo servidor
        </NuxtLink>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="grid gap-3 sm:grid-cols-[1fr_200px_200px]">
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
        <div>
          <label for="employee-situation" class="mb-1 block text-sm font-medium text-slate-700">
            Situação
          </label>
          <select
            id="employee-situation"
            v-model="situation"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
          >
            <option v-for="option in situationOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div
      v-if="actionError"
      class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
      role="alert"
    >
      {{ actionError }}
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
      <div class="hidden lg:block">
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
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-slate-900">{{ employee.name }}</p>
                  <span
                    v-if="!employee.isActive"
                    class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
                  >
                    Inativo
                  </span>
                </div>
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
                <div class="flex justify-end gap-2">
                  <NuxtLink
                    :to="`/admin/servidores/${employee.id}`"
                    class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
                  >
                    Abrir agenda
                  </NuxtLink>
                  <button
                    v-if="!employee.isActive"
                    type="button"
                    class="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    :disabled="reactivatingId === employee.id"
                    @click="reactivate(employee)"
                  >
                    {{ reactivatingId === employee.id ? 'Reativando...' : 'Reativar' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="divide-y divide-slate-100 lg:hidden">
        <li v-for="employee in data.employees" :key="employee.id" class="space-y-3 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                {{ employee.name }}
                <span
                  v-if="!employee.isActive"
                  class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
                >
                  Inativo
                </span>
              </p>
              <p class="truncate text-xs text-slate-500">
                {{ employee.email }}
              </p>
            </div>
            <StatusBadge :status="employee.status" />
          </div>

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

          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm font-medium text-slate-900">
              {{ employee.totalDays }} dias
            </p>
            <div class="flex flex-wrap gap-2">
              <NuxtLink
                :to="`/admin/servidores/${employee.id}`"
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
              >
                Abrir agenda
              </NuxtLink>
              <button
                v-if="!employee.isActive"
                type="button"
                class="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                :disabled="reactivatingId === employee.id"
                @click="reactivate(employee)"
              >
                {{ reactivatingId === employee.id ? 'Reativando...' : 'Reativar' }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
