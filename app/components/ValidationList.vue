<script setup lang="ts">
import type { ValidationIssue } from '~~/shared/rules/vacation'

const props = withDefaults(defineProps<{
  issues: ValidationIssue[]
  variant?: 'error' | 'warning'
}>(), {
  variant: 'error',
})

const classes = computed(() => props.variant === 'warning'
  ? 'border-amber-200 bg-amber-50 text-amber-900'
  : 'border-rose-200 bg-rose-50 text-rose-900')
</script>

<template>
  <div
    v-if="issues.length > 0"
    class="rounded-xl border p-4 text-sm"
    :class="classes"
    role="alert"
    aria-live="polite"
  >
    <p class="font-semibold">
      {{ variant === 'warning' ? 'Avisos' : 'Corrija antes de continuar' }}
    </p>
    <ul class="mt-2 list-disc space-y-1 pl-5">
      <li v-for="(issue, index) in issues" :key="`${issue.code}-${index}-${issue.message}`">
        {{ issue.message }}
      </li>
    </ul>
  </div>
</template>
