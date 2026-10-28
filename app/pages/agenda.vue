<script setup lang="ts">
import type { PeriodInput } from '~~/shared/schemas/schedule'
import {
  getTotalDays,
  validateForConfirmation,
  validateSchedule,
  type ValidationIssue,
} from '~~/shared/rules/vacation'
import type { ScheduleResponse } from '~~/shared/types/api'
import { formatDateBR } from '~~/shared/utils/date'
import { normalizeApiError } from '~/utils/api-error'

definePageMeta({ middleware: 'auth' })

useHead({ title: 'Minha agenda | Férias do Servidor' })

const { employee } = useAuth()
const requestFetch = useRequestFetch()

const { data, pending, error, refresh } = await useAsyncData<ScheduleResponse>(
  'employee-schedule',
  () => requestFetch<ScheduleResponse>('/api/me/schedule'),
)

const periods = ref<PeriodInput[]>([])
const saving = ref(false)
const confirming = ref(false)
const showConfirm = ref(false)
const actionError = ref('')
const actionIssues = ref<ValidationIssue[]>([])
const successMessage = ref('')

watch(data, (value) => {
  periods.value = value?.periods.map(period => ({
    startDate: period.startDate,
    endDate: period.endDate,
  })) ?? []
}, { immediate: true })

const rules = computed(() => data.value?.settings ?? null)
const totalDays = computed(() => getTotalDays(periods.value))
const issues = computed(() => rules.value ? validateSchedule(periods.value, rules.value) : [])
const confirmationIssues = computed(() => rules.value
  ? validateForConfirmation(periods.value, rules.value)
  : [])
const canEdit = computed(() => data.value?.canEdit ?? false)
const canConfirm = computed(() => canEdit.value && periods.value.length > 0 && confirmationIssues.value.length === 0)
const remainingDays = computed(() => rules.value ? rules.value.totalDays - totalDays.value : 0)

function applyResponse(response: ScheduleResponse): void {
  data.value = response
  periods.value = response.periods.map(period => ({
    startDate: period.startDate,
    endDate: period.endDate,
  }))
}

function clearFeedback(): void {
  actionError.value = ''
  actionIssues.value = []
  successMessage.value = ''
}

function handleRequestError(requestError: unknown): void {
  const normalized = normalizeApiError(requestError)

  if (normalized.statusCode === 401) {
    navigateTo('/login')
    return
  }

  actionError.value = normalized.message
  actionIssues.value = normalized.issues
}

async function saveDraft(): Promise<void> {
  saving.value = true
  clearFeedback()

  try {
    const response = await $fetch<ScheduleResponse>('/api/me/schedule', {
      method: 'PUT',
      body: { periods: periods.value },
    })
    applyResponse(response)
    successMessage.value = 'Rascunho salvo com sucesso.'
  } catch (requestError) {
    handleRequestError(requestError)
  } finally {
    saving.value = false
  }
}

async function confirmSchedule(): Promise<void> {
  confirming.value = true
  clearFeedback()

  try {
    const response = await $fetch<ScheduleResponse>('/api/me/schedule/confirm', {
      method: 'POST',
    })
    applyResponse(response)
    showConfirm.value = false
    successMessage.value = 'Pedido de férias submetido com sucesso.'
  } catch (requestError) {
    handleRequestError(requestError)
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">
          Área do servidor
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900">
          Olá, {{ employee?.name ?? 'servidor' }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          <template v-if="data">
            Ciclo de {{ formatDateBR(data.settings.cycleStart) }} a {{ formatDateBR(data.settings.cycleEnd) }}.
          </template>
          <template v-else>
            Carregando as regras do seu ciclo.
          </template>
        </p>
      </div>
      <StatusBadge v-if="data" :status="data.status" />
    </div>

    <div
      v-if="pending"
      class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600"
    >
      Carregando sua agenda...
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
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total marcado
          </p>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ totalDays }}<span class="text-sm font-medium text-slate-500">/{{ data.settings.totalDays }} dias</span>
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            {{ remainingDays >= 0 ? 'Faltam' : 'Excede' }}
          </p>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ Math.abs(remainingDays) }}<span class="text-sm font-medium text-slate-500"> dias</span>
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Períodos
          </p>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ periods.length }}<span class="text-sm font-medium text-slate-500">/{{ data.settings.maxPeriods }}</span>
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Intervalo mínimo
          </p>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ data.settings.minGapDays }}<span class="text-sm font-medium text-slate-500"> dias livres</span>
          </p>
        </div>
      </div>

      <div
        v-if="!canEdit"
        class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
      >
        Seu pedido de férias foi submetido e não pode mais ser alterado. A análise será feita pela administração em conversa individual posteriormente.
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
      <ValidationList :issues="issues" />

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-slate-900">
            {{ canEdit ? 'Monte sua agenda' : 'Sua agenda' }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            <template v-if="canEdit">
              Você pode salvar como rascunho e confirmar quando a agenda estiver completa.
            </template>
            <template v-else>
              Visualização somente leitura.
            </template>
          </p>
        </div>

        <PeriodsEditor
          v-model="periods"
          :rules="data.settings"
          :disabled="!canEdit"
        />
      </div>

      <div v-if="canEdit" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-slate-600">
          <template v-if="totalDays !== data.settings.totalDays">
            A confirmação exige exatamente {{ data.settings.totalDays }} dias.
          </template>
          <template v-else-if="issues.length > 0">
            Corrija os avisos antes de confirmar.
          </template>
          <template v-else>
            Agenda pronta para confirmação.
          </template>
        </p>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="saving || confirming"
            @click="saveDraft"
          >
            {{ saving ? 'Salvando...' : 'Salvar rascunho' }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="!canConfirm || saving || confirming"
            @click="showConfirm = true"
          >
            Confirmar agenda
          </button>
        </div>
      </div>

      <ConfirmDialog
        :open="showConfirm"
        title="Confirmar agenda?"
        :description="`Você está confirmando ${totalDays} dias de férias. Depois da confirmação, a agenda fica somente leitura.`"
        :busy="confirming"
        confirm-label="Confirmar definitivamente"
        @cancel="showConfirm = false"
        @confirm="confirmSchedule"
      />
    </template>
  </section>
</template>
