<script setup lang="ts">
const { employee, logout } = useAuth()
const loggingOut = ref(false)

async function handleLogout(): Promise<void> {
  loggingOut.value = true
  try {
    await logout()
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <NuxtLink to="/agenda" class="flex items-center gap-2 font-semibold text-brand-700">
          <span class="grid size-8 place-items-center rounded-lg bg-brand-100 text-sm">F</span>
          Férias do Servidor
        </NuxtLink>

        <div class="flex items-center gap-3 text-sm">
          <span class="hidden text-slate-600 sm:inline">{{ employee?.name }}</span>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            :disabled="loggingOut"
            @click="handleLogout"
          >
            {{ loggingOut ? 'Saindo...' : 'Sair' }}
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <slot />
    </main>

    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto max-w-5xl px-4 py-4 text-xs text-slate-500">
        As datas de férias são civis e não sofrem deslocamento de fuso horário.
      </div>
    </footer>
  </div>
</template>
