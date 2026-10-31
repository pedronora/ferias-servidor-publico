<script setup lang="ts">
import { normalizeApiError } from '~/utils/api-error'

definePageMeta({ layout: 'auth' })

useHead({ title: 'Admin | Férias do Servidor' })

const { session, fetchSession, login } = useAdminAuth()
const form = reactive({ email: '', password: '' })
const errorMessage = ref('')
const loading = ref(false)
const showPassword = ref(false)
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
        <div class="relative">
          <input
            id="admin-password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-brand-600"
          >
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-700"
            :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
            :aria-pressed="showPassword"
            aria-controls="admin-password"
            @click="showPassword = !showPassword"
          >
            <svg
              v-if="showPassword"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>
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
