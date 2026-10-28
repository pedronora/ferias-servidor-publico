import { expect, test } from '@playwright/test'

test('redireciona visitante para o login do servidor', async ({ page }) => {
  await page.goto('/agenda')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar como servidor' })).toBeVisible()
})

test('servidor com pedido submetido visualiza a escala em modo somente leitura', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('maria@example.com')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/agenda$/)
  await expect(page.getByRole('heading', { name: /Olá, Maria Souza/ })).toBeVisible()
  await expect(page.getByText('Solicitado', { exact: true })).toBeVisible()
  await expect(page.getByText(/30\/30 dias/)).toBeVisible()
  await expect(page.getByText('Seu pedido de férias foi submetido e não pode mais ser alterado. A análise será feita pela administração em conversa individual posteriormente.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('servidor com rascunho salva e gerencia períodos', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@example.com')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/agenda$/)
  await expect(page.getByRole('heading', { name: /Olá, Ana Lima/ })).toBeVisible()
  await expect(page.getByText('Rascunho', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Adicionar período' }).click()
  await expect(page.getByRole('heading', { name: 'Período 2' })).toBeVisible()

  await page.getByRole('button', { name: 'Remover' }).nth(1).click()
  await expect(page.getByRole('heading', { name: 'Período 2' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByText('Rascunho salvo com sucesso.')).toBeVisible()
})

test('admin consulta servidores, abre agenda e gera relatório com CSV', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('E-mail').fill('admin@example.com')
  await page.getByLabel('Senha').fill('admin12345')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Servidores' })).toBeVisible()
  await expect(page.getByText('Maria Souza')).toBeVisible()
  await expect(page.getByText('João Pereira')).toBeVisible()
  await expect(page.getByText('Ana Lima')).toBeVisible()

  await page.getByRole('row', { name: /Maria Souza/ })
    .getByRole('link', { name: 'Abrir agenda' })
    .click()

  await expect(page).toHaveURL(/\/admin\/servidores\/[0-9a-f-]+$/)
  await expect(page.getByRole('heading', { name: 'Maria Souza' })).toBeVisible()
  await expect(page.getByText('Solicitado', { exact: true })).toBeVisible()

  await page.getByLabel('Aplicar override').check()
  await expect(page.getByLabel('Justificativa do override')).toBeVisible()
  await page.getByLabel('Aplicar override').uncheck()

  await page.getByRole('link', { name: 'Relatório' }).click()
  await expect(page).toHaveURL(/\/admin\/relatorio$/)
  await expect(page.getByRole('heading', { name: 'Relatório consolidado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Coincidências de férias' })).toBeVisible()
  await expect(page.getByRole('row', { name: /João Pereira.*Maria Souza/ }).first()).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^relatorio-ferias-\d{4}-\d{2}-\d{2}\.csv$/)
})

test('admin cadastra, edita, desativa e reativa servidor', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('E-mail').fill('admin@example.com')
  await page.getByLabel('Senha').fill('admin12345')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await page.getByRole('link', { name: 'Novo servidor' }).click()

  await expect(page).toHaveURL(/\/admin\/servidores\/novo$/)
  await page.getByLabel('Nome').fill('Servidor E2E')
  await page.getByLabel('E-mail').fill('servidor.e2e@example.com')
  await page.getByRole('button', { name: 'Cadastrar servidor' }).click()

  await expect(page).toHaveURL(/\/admin\/servidores\/[0-9a-f-]+$/)
  const detailUrl = page.url()
  await expect(page.getByRole('heading', { name: 'Servidor E2E' })).toBeVisible()

  await page.getByLabel('Nome').fill('Servidor E2E Editado')
  await page.getByLabel('E-mail').fill('servidor.editado@example.com')
  await page.getByRole('button', { name: 'Salvar dados' }).click()
  await expect(page.getByRole('heading', { name: 'Servidor E2E Editado' })).toBeVisible()

  await page.getByRole('button', { name: 'Desativar servidor' }).click()
  await page.getByRole('button', { name: 'Desativar', exact: true }).click()
  await expect(page.getByText('Inativo', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reativar servidor' })).toBeVisible()

  await page.goto('/login')
  await page.getByLabel('E-mail').fill('servidor.editado@example.com')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('Não foi possível entrar com este e-mail.')).toBeVisible()

  await page.goto(detailUrl)
  await page.getByRole('button', { name: 'Reativar servidor' }).click()
  await expect(page.getByText('Inativo', { exact: true })).toHaveCount(0)

  await page.goto('/login')
  await page.getByLabel('E-mail').fill('servidor.editado@example.com')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/agenda$/)
  await expect(page.getByRole('heading', { name: /Olá, Servidor E2E Editado/ })).toBeVisible()
})

test('exibe as datas do seletor em DD/MM/AAAA', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@example.com')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/agenda$/)
  await page.getByRole('button', { name: 'Adicionar período' }).click()

  const periodInput = page.getByLabel('Início e fim do período 2')
  await periodInput.fill('10/03/2027 - 19/03/2027')
  await periodInput.press('Enter')
  await page.getByRole('heading', { name: 'Período 2' }).click()

  await expect(periodInput).toHaveValue('10/03/2027 - 19/03/2027')
})

test('abre o primeiro período no início do ciclo quando ainda não há datas', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })

  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
  const headers = { origin: baseURL }
  const email = `data-inicial-${Date.now()}@example.com`

  const adminLogin = await page.request.post(`${baseURL}/api/admin/auth/login`, {
    headers,
    data: { email: 'admin@example.com', password: 'admin12345' },
  })
  expect(adminLogin.ok()).toBeTruthy()

  const created = await page.request.post(`${baseURL}/api/admin/employees`, {
    headers,
    data: { name: 'Servidor Data Inicial', email },
  })
  expect(created.status()).toBe(201)

  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/agenda$/)
  await page.getByRole('button', { name: 'Adicionar período' }).click()

  const periodInput = page.getByLabel('Início e fim do período 1')
  await periodInput.click()
  await expect(page.locator('[data-test-id="dp-2027-01-01"]')).toBeVisible()
})

test('seleciona um período completo clicando no calendário', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-01-02T12:00:00Z') })

  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@example.com')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/agenda$/)
  await page.getByRole('button', { name: 'Adicionar período' }).click()

  const periodInput = page.getByLabel('Início e fim do período 2')
  await periodInput.click()
  await expect(page.locator('[data-test-id="dp-2027-08-04"]')).toBeVisible()
  await page.locator('[data-test-id="dp-2027-08-04"]').click()
  await page.locator('[data-test-id="dp-2027-08-13"]').click()

  await expect(periodInput).toHaveValue('04/08/2027 - 13/08/2027')

  await page.getByRole('button', { name: 'Adicionar período' }).click()
  const period3Input = page.getByLabel('Início e fim do período 3')
  await period3Input.click()
  await expect(page.locator('[data-test-id="dp-2027-08-29"]')).toBeVisible()
  await page.locator('[data-test-id="dp-2027-08-29"]').click()
  await page.locator('[data-test-id="dp-2027-08-31"]').click()

  await expect(period3Input).toHaveValue('29/08/2027 - 31/08/2027')
})
