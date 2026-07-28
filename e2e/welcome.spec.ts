import { expect, test, dismissOnboardingIfAny, prepareApp } from './helpers/app'

test.describe('Welcome', () => {
  test('показывает бренд и основные CTA', async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await dismissOnboardingIfAny(page)

    await expect(page.getByText('EYEPAINT').first()).toBeVisible()
    await expect(page.getByText(/Смотри сквозь референс/i)).toBeVisible()
    await expect(page.getByText('Сфотографировать')).toBeVisible()
    await expect(page.getByText('Из галереи')).toBeVisible()
    await expect(page.getByText('Открыть проект')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Телефон как камера' })).toBeVisible()
  })

  test('уроки открывают студию', async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await dismissOnboardingIfAny(page)

    await page.getByRole('button', { name: 'Портрет 3/4' }).click()
    await expect(page.getByRole('toolbar', { name: 'Инструменты' })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('toolbar', { name: 'Инструменты' }).getByRole('button', { name: 'Гиды' }).click()
    await expect(page.getByText('Направляющие')).toBeVisible()
  })

  test('онбординг можно пройти и пропустить', async ({ page }) => {
    await prepareApp(page, { onboardingDone: false })
    await page.goto('./')

    await expect(page.getByText(/Старт · 1\//)).toBeVisible()
    await page.getByRole('button', { name: 'Дальше' }).click()
    await expect(page.getByText(/Старт · 2\//)).toBeVisible()
    await page.getByRole('button', { name: 'Пропустить' }).click()
    await expect(page.getByText(/Старт ·/)).toHaveCount(0)
  })

  test('режим подсказок рассказывает про кнопку', async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await dismissOnboardingIfAny(page)

    await page.getByRole('button', { name: 'Включить подсказки' }).click()
    await expect(page.getByRole('button', { name: 'Выключить подсказки' })).toBeVisible()
    await page.getByRole('button', { name: 'Телефон как камера' }).click()
    await expect(page.getByRole('dialog', { name: 'Телефон как камера' })).toBeVisible()
    await expect(page.getByText(/ПК создаёт комнату/i)).toBeVisible()
    await page.getByRole('button', { name: 'Понятно' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
