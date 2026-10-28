<script setup lang="ts">
const { admin, logout } = useAdminAuth()
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
    <header class="border-b border-slate-200 bg-white no-print">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div class="flex flex-wrap items-center gap-6">
          <NuxtLink to="/admin" class="flex items-center gap-2 font-semibold text-brand-700">
            <span class="grid size-8 place-items-center rounded-lg bg-brand-100 text-sm">A</span>
            Administração
          </NuxtLink>
          <nav class="flex items-center gap-1 text-sm">
            <NuxtLink
              to="/admin"
              class="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
              active-class="bg-brand-50 text-brand-700"
            >
              Servidores
            </NuxtLink>
            <NuxtLink
              to="/admin/relatorio"
              class="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
              active-class="bg-brand-50 text-brand-700"
            >
              Relatório
            </NuxtLink>
          </nav>
        </div>

        <div class="flex items-center gap-3 text-sm">
          <span class="hidden text-slate-600 sm:inline">{{ admin?.name }}</span>
          <NuxtLink
            to="/agenda"
            class="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Área do servidor
          </NuxtLink>
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

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <slot />
    </main>
  </div>
</template>
