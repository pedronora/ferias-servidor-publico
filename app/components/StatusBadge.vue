<script setup lang="ts">
import type { ScheduleStatus } from '~~/shared/rules/vacation'

const props = defineProps<{
  status: ScheduleStatus
}>()

const presentation = computed(() => {
  switch (props.status) {
    case 'confirmed':
      return { label: 'Solicitado', classes: 'bg-emerald-100 text-emerald-800 ring-emerald-200' }
    case 'partial':
      return { label: 'Parcial', classes: 'bg-amber-100 text-amber-800 ring-amber-200' }
    case 'draft':
      return { label: 'Rascunho', classes: 'bg-sky-100 text-sky-800 ring-sky-200' }
    default:
      return { label: 'Sem agenda', classes: 'bg-slate-100 text-slate-700 ring-slate-200' }
  }
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
    :class="presentation.classes"
  >
    {{ presentation.label }}
  </span>
</template>
