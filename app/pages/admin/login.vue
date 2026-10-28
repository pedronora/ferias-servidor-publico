<script setup lang="ts">
import { normalizeApiError } from '~/utils/api-error'

definePageMeta({ layout: 'auth' })

useHead({ title: 'Admin | Férias do Servidor' })

const { session, fetchSession, login } = useAdminAuth()
const form = reactive({ email: '', password: '' })
const errorMessage = ref('')
const loading = ref(false)
const isDev = import.meta.dev

if (!session.value.authenticated) {
  await fetchSession().catch(() => null)
}

if (session.value.authenticated) {
  await navigateTo('/admin')
}

async function submit(): Promise<void> {
  errorMessage.value = ''
  loading.value = true

  try {
    await login(form.email, form.password)
    await navigateTo('/admin')
  } catch (error) {
    const normalized = normalizeApiError(error)
    errorMessage.value = normalized.statusCode === 429 && normalized.retryAfterSeconds
      ? `Muitas tentativas. Tente novamente em ${Math.ceil(normalized.retryAfterSeconds / 60)} minuto(s).`
      : normalized.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-slate-900">
      Entrar como administrador
    </h2>
    <p class="mt-1 text-sm text-slate-600">
      Acesse a gestão de servidores e o relatório consolidado.
    </p>

    <form class="mt-5 space-y-4" @submit.prevent="submit">
      <div>
        <label for="admin-email" class="mb-1 block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="admin-email"
          v-model="form.email"
          type="email"
          required
          autocomplete="username"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
        >
      </div>

      <div>
        <label for="admin-password" class="mb-1 block text-sm font-medium text-slate-700">
          Senha
        </label>
        <input
          id="admin-password"
          v-model="form.password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
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

      <button
        type="submit"
        class="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        :disabled="loading"
      >
        {{ loading ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>

    <div v-if="isDev" class="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
      Demonstração: <strong>admin@example.com</strong> / <strong>admin12345</strong>
    </div>

    <div class="mt-5 border-t border-slate-200 pt-4 text-center">
      <NuxtLink to="/login" class="text-sm font-medium text-brand-700 hover:underline">
        Área do servidor
      </NuxtLink>
    </div>
  </div>
</template>
