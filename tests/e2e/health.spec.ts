import { expect, test } from '@playwright/test'

test('healthcheck responde com banco conectado', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toMatchObject({
    status: 'ok',
    db: 'ok',
  })
})
