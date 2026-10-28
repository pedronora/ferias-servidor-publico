<script setup lang="ts">
import type { EmployeeSummary } from '~~/shared/types/api'
import { normalizeApiError } from '~/utils/api-error'

definePageMeta({ middleware: 'admin', layout: 'admin' })

useHead({ title: 'Novo servidor | Administração' })

const form = reactive({ name: '', email: '' })
const errorMessage = ref('')
const saving = ref(false)

async function submit(): Promise<void> {
  errorMessage.value = ''
  saving.value = true

  try {
    const response = await $fetch<{ employee: EmployeeSummary }>('/api/admin/employees', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
      },
    })
    await navigateTo(`/admin/servidores/${response.employee.id}`)
  } catch (error) {
    const normalized = normalizeApiError(error)

    if (normalized.statusCode === 401) {
      await navigateTo('/admin/login')
      return
    }

    errorMessage.value = normalized.message
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
      <h1 class="mt-3 text-2xl font-bold text-slate-900">
        Novo servidor
      </h1>
      <p class="mt-1 text-sm text-slate-600">
        Cadastre o servidor para que ele possa entrar apenas com o e-mail informado.
      </p>
    </div>

    <form class="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" @submit.prevent="submit">
      <div>
        <label for="new-employee-name" class="mb-1 block text-sm font-medium text-slate-700">
          Nome
        </label>
        <input
          id="new-employee-name"
          v-model="form.name"
          type="text"
          required
          maxlength="200"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
        >
      </div>

      <div>
        <label for="new-employee-email" class="mb-1 block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="new-employee-email"
          v-model="form.email"
          type="email"
          required
          maxlength="254"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
          placeholder="servidor@example.com"
        >
      </div>

      <p
        v-if="errorMessage"
        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        role="alert"
        aria-live="polite"
      >
        {{ errorMessage }}
      </p>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="saving"
        >
          {{ saving ? 'Cadastrando...' : 'Cadastrar servidor' }}
        </button>
        <NuxtLink to="/admin" class="text-sm font-medium text-slate-600 hover:underline">
          Cancelar
        </NuxtLink>
      </div>
    </form>
  </section>
</template>
