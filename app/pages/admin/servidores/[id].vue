<script setup lang="ts">
import type { AdminScheduleInput, PeriodInput } from '~~/shared/schemas/schedule'
import {
  validateForConfirmation,
  validateSchedule,
  validateStructure,
  type ValidationIssue,
  type VacationRules,
} from '~~/shared/rules/vacation'
import type { EmployeeSummary } from '~~/shared/types/api'
import { formatDateBR } from '~~/shared/utils/date'
import { normalizeApiError } from '~/utils/api-error'

definePageMeta({ middleware: 'admin', layout: 'admin' })

useHead({ title: 'Agenda do servidor | Administração' })

interface EmployeeDetailResponse {
  employee: EmployeeSummary
  settings: VacationRules
  issues: ValidationIssue[]
}

const route = useRoute()
const employeeId = computed(() => String(route.params.id))

const { data, pending, error, refresh } = await useFetch<EmployeeDetailResponse>(
  () => `/api/admin/employees/${employeeId.value}`,
  { headers: useRequestHeaders(['cookie']) },
)

const periods = ref<PeriodInput[]>([])
const override = ref(false)
const overrideReason = ref('')
const confirm = ref(false)
const saving = ref(false)
const actionError = ref('')
const actionIssues = ref<ValidationIssue[]>([])
const successMessage = ref('')

watch(data, (value) => {
  if (!value) {
    return
  }

  periods.value = value.employee.periods.map(period => ({
    startDate: period.startDate,
    endDate: period.endDate,
  }))
  confirm.value = value.employee.status === 'confirmed'
  override.value = value.employee.periods.some(period => period.adminOverride)
  overrideReason.value = value.employee.periods.find(period => period.overrideReason)?.overrideReason ?? ''
}, { immediate: true })

const isConfirmed = computed(() => data.value?.employee.status === 'confirmed')
const targetConfirmed = computed(() => confirm.value || isConfirmed.value)
const structuralIssues = computed(() => validateStructure(periods.value))
const businessIssues = computed(() => {
  const rules = data.value?.settings
  if (!rules) {
    return []
  }

  return targetConfirmed.value
    ? validateForConfirmation(periods.value, rules)
    : validateSchedule(periods.value, rules)
})
const blockingIssues = computed(() => override.value ? structuralIssues.value : businessIssues.value)
const canSave = computed(() => !saving.value
  && (!override.value || overrideReason.value.trim().length > 0)
  && blockingIssues.value.length === 0)

function applyResponse(response: EmployeeDetailResponse): void {
  data.value = response
  periods.value = response.employee.periods.map(period => ({
    startDate: period.startDate,
    endDate: period.endDate,
  }))
  confirm.value = response.employee.status === 'confirmed'
}

function clearFeedback(): void {
  actionError.value = ''
  actionIssues.value = []
  successMessage.value = ''
}

function handleRequestError(requestError: unknown): void {
  const normalized = normalizeApiError(requestError)

  if (normalized.statusCode === 401) {
    navigateTo('/admin/login')
    return
  }

  actionError.value = normalized.message
  actionIssues.value = normalized.issues
}

async function saveSchedule(): Promise<void> {
  saving.value = true
  clearFeedback()

  try {
    const body: AdminScheduleInput = {
      periods: periods.value,
      override: override.value,
      confirm: confirm.value,
    }

    if (override.value) {
      body.overrideReason = overrideReason.value.trim()
    }

    const response = await $fetch<EmployeeDetailResponse>(
      `/api/admin/employees/${employeeId.value}/schedule`,
      { method: 'PUT', body },
    )
    applyResponse(response)
    successMessage.value = 'Agenda atualizada com sucesso.'
  } catch (requestError) {
    handleRequestError(requestError)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <div>
      <NuxtLink to="/admin" class="text-sm font-medium text-brand-700 hover:underline">
        ← Voltar para servidores
      </NuxtLink>
    </div>

    <div
      v-if="pending"
      class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600"
    >
      Carregando agenda...
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
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Agenda do servidor
          </p>
          <h1 class="mt-1 text-2xl font-bold text-slate-900">
            {{ data.employee.name }}
          </h1>
          <p class="mt-1 text-sm text-slate-600">
            {{ data.employee.email }} · Ciclo de {{ formatDateBR(data.settings.cycleStart) }} a {{ formatDateBR(data.settings.cycleEnd) }}
          </p>
        </div>
        <StatusBadge :status="data.employee.status" />
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Total marcado</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ data.employee.totalDays }}<span class="text-sm font-medium text-slate-500">/{{ data.settings.totalDays }} dias</span>
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Períodos</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ periods.length }}<span class="text-sm font-medium text-slate-500">/{{ data.settings.maxPeriods }}</span>
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Intervalo mínimo</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ data.settings.minGapDays }}<span class="text-sm font-medium text-slate-500"> dias livres</span>
          </p>
        </div>
      </div>

      <div
        v-if="data.employee.periods.some(period => period.adminOverride)"
        class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        Esta agenda possui ajuste administrativo (override). A justificativa fica registrada nos períodos.
      </div>

      <div
        v-if="successMessage"
        class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        role="status"
        aria-live="polite"
      >
        {{ successMessage }}
      </div>

      <div
        v-if="actionError"
        class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
        role="alert"
        aria-live="polite"
      >
        {{ actionError }}
      </div>

      <ValidationList :issues="actionIssues" />
      <ValidationList v-if="override" :issues="structuralIssues" />
      <ValidationList
        v-if="override"
        :issues="businessIssues"
        variant="warning"
      />
      <ValidationList v-else :issues="businessIssues" />

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
        <h2 class="text-lg font-semibold text-slate-900">
          Períodos de férias
        </h2>
        <p class="mb-4 mt-1 text-sm text-slate-600">
          O salvamento substitui toda a agenda do servidor em uma única transação.
        </p>

        <PeriodsEditor
          v-model="periods"
          :rules="data.settings"
          :disabled="saving"
        />
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 class="text-lg font-semibold text-slate-900">
          Ajustes administrativos
        </h2>

        <div class="mt-4 space-y-4">
          <label for="override-enabled" class="flex items-start gap-3 text-sm text-slate-700">
            <input id="override-enabled" v-model="override" type="checkbox" class="mt-1 size-4 rounded border-slate-300">
            <span>
              <span class="font-medium">Aplicar override</span>
              <span class="block text-xs text-slate-500">
                Ignora as regras de negócio, mas mantém a integridade estrutural das datas e a ausência de sobreposição.
              </span>
            </span>
          </label>

          <div v-if="override">
            <label for="override-reason" class="mb-1 block text-sm font-medium text-slate-700">
              Justificativa do override
            </label>
            <textarea
              id="override-reason"
              v-model="overrideReason"
              rows="3"
              maxlength="500"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
              placeholder="Descreva o motivo administrativo do ajuste."
            />
            <p class="mt-1 text-xs text-slate-500">
              Obrigatória. Será registrada nos períodos.
            </p>
          </div>

          <label for="confirm-schedule" class="flex items-start gap-3 text-sm text-slate-700">
            <input
              id="confirm-schedule"
              v-model="confirm"
              type="checkbox"
              :disabled="isConfirmed"
              class="mt-1 size-4 rounded border-slate-300"
            >
            <span>
              <span class="font-medium">Confirmar agenda</span>
              <span class="block text-xs text-slate-500">
                <template v-if="isConfirmed">
                  A agenda já está confirmada e permanecerá confirmada após o ajuste.
                </template>
                <template v-else>
                  Ao confirmar, a agenda fica somente leitura para o servidor.
                </template>
              </span>
            </span>
          </label>
        </div>

        <div class="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-slate-500">
            <template v-if="override">
              O override será salvo com a justificativa informada.
            </template>
            <template v-else>
              As regras de negócio serão validadas antes de salvar.
            </template>
          </p>
          <button
            type="button"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="!canSave"
            @click="saveSchedule"
          >
            {{ saving ? 'Salvando...' : 'Salvar agenda' }}
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
