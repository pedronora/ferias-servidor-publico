<template>
  <div class="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
    <div class="w-full max-w-md">
      <div class="mb-6 text-center">
        <div class="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-100 text-lg font-bold text-brand-700">
          F
        </div>
        <h1 class="mt-3 text-2xl font-bold text-slate-900">
          Férias do Servidor
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          Planeje e confirme sua escala de férias.
        </p>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <slot />
      </div>

      <p class="mt-4 text-center text-xs text-slate-500">
        Acesso restrito a servidores e administradores autorizados.
      </p>
    </div>
  </div>
</template>
