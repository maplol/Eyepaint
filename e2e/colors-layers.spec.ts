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

  test('экран слоёв: фото-блок, выбор, порядок, меню снаружи', async ({ page }) => {
    await openStudioTab(page, 'Основное')

    // Открыть экран слоёв (фото/галерея теперь здесь)
    await page.getByRole('button', { name: /Слои ·/ }).click()
    const layersSheet = page.getByRole('region', { name: 'Блок слоёв' })
    await expect(layersSheet).toBeVisible()
    await expect(layersSheet.getByRole('button', { name: 'Сфотографировать композит' })).toBeVisible()
    await expect(layersSheet.getByText('Галерея')).toBeVisible()
    await expect(layersSheet.getByRole('button', { name: 'Фиксация' })).toBeVisible()

    const galleryInLayers = layersSheet.locator('label').filter({ hasText: 'Галерея' }).locator('input[type="file"]')
    await galleryInLayers.setInputFiles('e2e/fixtures/reference.png')

    const layersList = page.getByRole('list', { name: 'Слои референса' })
    await expect(layersList).toBeVisible({ timeout: 10_000 })
    await expect(layersList.getByText(/Активен ·/)).toBeVisible()

    // Док и вкладки отдельно
    await openStudioTab(page, 'Цвета')
    await expect(layersSheet).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Цвета' })).toBeVisible()

    await layersList.getByRole('button', { name: /^Основной/ }).click()
    await expect(layersList.getByText(/Активен ·/).first()).toBeVisible()

    await page.getByRole('button', { name: 'Меню слоя Основной' }).click()
    const menu = page.locator('body > [role="menu"]')
    await expect(menu).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'На передний план' })).toBeVisible()
    await page.getByRole('menuitem', { name: 'На передний план' }).click()
    await expect(layersList.getByText(/передний/)).toBeVisible()

    await layersSheet.getByRole('button', { name: 'Закрыть' }).click()
    await expect(layersList).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Слои ·/ })).toBeVisible()
  })
})
