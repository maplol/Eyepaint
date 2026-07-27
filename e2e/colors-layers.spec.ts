import { expect, test, enterStudioFromGallery, openStudioTool, prepareApp } from './helpers/app'

test.describe('Colors & layers', () => {
  test.beforeEach(async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await enterStudioFromGallery(page)
  })

  test('цвета: палитра и пресеты без пропадания UI', async ({ page }) => {
    await openStudioTool(page, 'Пипетка')

    await expect(page.getByLabel('Точность палитры')).toBeVisible()
    await expect(page.getByText(/цветов · выбрано/)).toBeVisible({ timeout: 20_000 })

    const precision = page.getByLabel('Точность палитры')
    await precision.fill('5')
    const panel = page.getByLabel('Настройки инструмента')
    await expect(panel.getByRole('button', { name: 'Пипетка' })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Кожа' })).toBeVisible()
    await panel.getByRole('button', { name: 'Кожа' }).click()
  })

  test('слои: фото-блок, выбор, порядок, меню', async ({ page }) => {
    const viewport = page.viewportSize()
    const isDesktop = (viewport?.width ?? 0) >= 960

    if (isDesktop) {
      await expect(page.getByRole('region', { name: 'Блок слоёв' })).toBeVisible()
    } else {
      await openStudioTool(page, 'Слои')
      const chip = page.getByRole('button', { name: /Слои ·/ })
      if (await chip.isVisible().catch(() => false)) {
        await chip.click()
      }
      await expect(page.getByRole('region', { name: 'Блок слоёв' })).toBeVisible()
    }

    const layersSheet = page.getByRole('region', { name: 'Блок слоёв' })
    await expect(layersSheet.getByRole('button', { name: 'Сфотографировать композит' })).toBeVisible()
    await expect(layersSheet.getByText('Галерея')).toBeVisible()
    await expect(layersSheet.getByRole('button', { name: 'Фиксация' })).toBeVisible()

    const galleryInLayers = layersSheet.locator('label').filter({ hasText: 'Галерея' }).locator('input[type="file"]')
    await galleryInLayers.setInputFiles('e2e/fixtures/reference.png')

    const layersList = page.getByRole('list', { name: 'Слои референса' })
    await expect(layersList).toBeVisible({ timeout: 10_000 })
    await expect(layersList.getByText(/Активен ·/)).toBeVisible()

    await layersList.getByRole('button', { name: /^Основной/ }).click()
    await expect(layersList.getByText(/Активен ·/).first()).toBeVisible()

    await page.getByRole('button', { name: 'Меню слоя Основной' }).click()
    const menu = page.locator('body > [role="menu"]')
    await expect(menu).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'На передний план' })).toBeVisible()
    await page.getByRole('menuitem', { name: 'На передний план' }).click()
    await expect(layersList.getByText(/передний/)).toBeVisible()

    // Инструмент не должен ломать слой на ПК; на телефоне sheet сворачивается
    await openStudioTool(page, 'Пипетка')
    if (isDesktop) {
      await expect(layersList).toBeVisible()
    } else {
      await expect(page.getByRole('button', { name: /Слои ·/ })).toBeVisible()
    }
  })
})
