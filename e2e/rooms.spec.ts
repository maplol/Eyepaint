import { expect, test, enterStudioFromGallery, prepareApp } from './helpers/app'

test.describe('Rooms & camera', () => {
  test('CameraRoom UI с телефона', async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await page.getByRole('button', { name: 'Телефон как камера' }).click()

    await expect(page.getByLabel('Код с компьютера')).toBeVisible()
    await expect(page.getByRole('button', { name: /Подключиться|Отключиться/ })).toBeVisible()
    await page.getByRole('button', { name: 'Назад' }).click()
    await expect(page.getByText('EYEPAINT').first()).toBeVisible()
  })

  test('deep-link ?join= сразу ищет комнату', async ({ page }) => {
    await prepareApp(page)
    await page.goto('./?join=ABC123')
    await expect(page.getByText(/EYEPAINT · Камера/)).toBeVisible()
    await expect(page.getByText(/Ищу комнату|Подключ|Жду/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Отключиться' })).toBeVisible()
  })

  test('ПК: создать комнату и увидеть код/QR', async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await enterStudioFromGallery(page)

    await page.getByRole('button', { name: 'Настройки' }).click()
    await expect(page.getByRole('dialog', { name: 'Настройки' })).toBeVisible()
    await page.getByRole('button', { name: 'Связь' }).click()
    await page.getByRole('button', { name: 'Создать комнату' }).click()

    await expect(page.getByText('Код комнаты')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Копировать' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Новый код' })).toBeVisible()
  })
})
