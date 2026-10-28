<script setup lang="ts">
definePageMeta({ layout: false })

const { fetchSession } = useAuth()
const session = await fetchSession()

await navigateTo(session.authenticated ? '/agenda' : '/login')
</script>

<template>
  <div />
</template>
