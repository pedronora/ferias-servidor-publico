<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  busy?: boolean
  confirmLabel?: string
}>(), {
  busy: false,
  confirmLabel: 'Confirmar',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        class="absolute inset-0 cursor-default bg-slate-950/50"
        aria-label="Fechar diálogo"
        @click="emit('cancel')"
      />
      <div
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'confirm-dialog-title'"
        class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="confirm-dialog-title" class="text-lg font-semibold text-slate-900">
          {{ title }}
        </h2>
        <p class="mt-2 text-sm text-slate-600">
          {{ description }}
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            :disabled="busy"
            @click="emit('cancel')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ busy ? 'Processando...' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
