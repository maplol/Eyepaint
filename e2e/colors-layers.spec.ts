import { expect, test, enterStudioFromGallery, openStudioTab, prepareApp } from './helpers/app'

test.describe('Colors & layers', () => {
  test.beforeEach(async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await enterStudioFromGallery(page)
  })

  test('цвета: палитра и пресеты без пропадания UI', async ({ page }) => {
    await openStudioTab(page, 'Цвета')

    await expect(page.getByLabel('Точность палитры')).toBeVisible()
    // Дождаться палитры или скелетона/статуса
    await expect(page.getByText(/цветов · выбрано/)).toBeVisible({ timeout: 20_000 })

    const precision = page.getByLabel('Точность палитры')
    await precision.fill('5')
    // UI контролов остаётся
    await expect(page.getByRole('button', { name: 'Пипетка' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Кожа' })).toBeVisible()
    await page.getByRole('button', { name: 'Кожа' }).click()
  })

  test('второй слой становится активным и независимым', async ({ page }) => {
    await openStudioTab(page, 'Основное')

    const galleryInStudio = page
      .locator('aside')
      .locator('label')
      .filter({ hasText: 'Галерея' })
      .locator('input[type="file"]')
    await galleryInStudio.setInputFiles('e2e/fixtures/reference.png')

    const layersList = page.getByRole('list', { name: 'Слои референса' })
    await expect(page.getByText('Слои референса')).toBeVisible()
    await expect(layersList).toBeVisible({ timeout: 10_000 })
    await expect(layersList.getByText(/Активен ·/)).toBeVisible()

    // Переключить на основной
    await layersList.getByRole('button', { name: /^Основной/ }).click()
    await expect(layersList.getByText(/Активен ·/).first()).toBeVisible()

    // Меню порядка
    await page.getByRole('button', { name: 'Меню слоя Основной' }).click()
    await expect(page.getByRole('menuitem', { name: 'На передний план' })).toBeVisible()
    await page.getByRole('menuitem', { name: 'На передний план' }).click()
    await expect(layersList.getByText(/передний/)).toBeVisible()
  })
})
