import { expect, test } from '@playwright/test'

test('redireciona visitante para o login do servidor', async ({ page }) => {
  await page.goto('/agenda')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar como servidor' })).toBeVisible()
})

test('servidor com agenda confirmada visualiza a escala em modo somente leitura', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('maria@example.com')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/agenda$/)
  await expect(page.getByRole('heading', { name: /Olá, Maria Souza/ })).toBeVisible()
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible()
  await expect(page.getByText(/30\/30 dias/)).toBeVisible()
  await expect(page.getByText('Sua agenda está confirmada e não pode mais ser alterada.')).toBeVisible()
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
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible()

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
