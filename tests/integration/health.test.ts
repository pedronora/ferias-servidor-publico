import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

describe('GET /api/health', async () => {
  await setup({
    server: true,
    build: true,
    port: 3101,
    env: {
      DATABASE_URL: process.env.DATABASE_URL
        ?? 'postgresql://ferias:ferias_dev_password@localhost:5433/ferias_test',
      NUXT_SESSION_SECRET: 'test-session-secret-com-pelo-menos-32-caracteres',
      NUXT_PUBLIC_APP_URL: 'http://localhost:3101',
    },
  })

  it('retorna 200 quando o banco responde', async () => {
    const result = await $fetch('/api/health')

    expect(result).toMatchObject({
      status: 'ok',
      db: 'ok',
    })
    expect(typeof result.timestamp).toBe('string')
  })
})
