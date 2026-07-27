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

  test('слои: фото-блок, выбор, порядок, меню', async ({ page }, testInfo) => {
    const layersSheet = page.getByRole('region', { name: 'Блок слоёв' })
    if (!(await layersSheet.isVisible().catch(() => false))) {
      await openStudioTool(page, 'Слои')
      const chip = page.getByRole('button', { name: /Слои ·/ })
      if (await chip.isVisible().catch(() => false)) {
        await chip.click()
      }
    }
    await expect(layersSheet).toBeVisible()

    await expect(layersSheet.getByRole('button', { name: 'Сфотографировать композит' })).toBeVisible()
    await expect(layersSheet.getByText('Галерея')).toBeVisible()
    await expect(layersSheet.getByRole('button', { name: 'Фиксация' })).toBeVisible()

    const galleryInLayers = layersSheet
      .locator('label')
      .filter({ hasText: 'Галерея' })
      .locator('input[type="file"]')
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

    // Смена инструмента не прячет блок слоёв (на мобилке — компактная шапка)
    await openStudioTool(page, 'Пипетка')
    await expect(page.getByLabel('Блок слоёв')).toBeVisible()
    if (testInfo.project.name === 'mobile-chrome') {
      await expect(page.getByRole('button', { name: 'Развернуть' })).toBeVisible()
      await expect(layersList).toHaveCount(0)
      await page.getByRole('button', { name: 'Развернуть' }).click()
      await expect(layersList).toBeVisible()
    } else {
      await expect(layersList).toBeVisible()
    }

    // Кнопка «Слои» сворачивает блок и на ПК, и на телефоне
    await openStudioTool(page, 'Слои')
    await expect(layersList).toHaveCount(0)
  })

  test('три слоя не перекрывают UI — слои закрываются', async ({ page }) => {
    const layersSheet = page.getByLabel('Блок слоёв')
    if (!(await layersSheet.isVisible().catch(() => false))) {
      await openStudioTool(page, 'Слои')
      const chip = page.getByRole('button', { name: /Слои ·/ })
      if (await chip.isVisible().catch(() => false)) await chip.click()
    }
    await expect(layersSheet).toBeVisible()

    const galleryInLayers = layersSheet
      .locator('label')
      .filter({ hasText: 'Галерея' })
      .locator('input[type="file"]')
    await galleryInLayers.setInputFiles('e2e/fixtures/reference.png')
    await galleryInLayers.setInputFiles('e2e/fixtures/reference.png')

    const layersList = page.getByRole('list', { name: 'Слои референса' })
    await expect(layersList.getByRole('listitem')).toHaveCount(3, { timeout: 10_000 })

    // UI поверх stage: закрытие слоёв кликабельно даже с тремя оверлеями
    const closeBtn = layersSheet.getByRole('button', { name: 'Закрыть' })
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ timeout: 5_000 })
      await expect(layersList).toHaveCount(0)
    } else {
      await openStudioTool(page, 'Слои')
      await expect(layersList).toHaveCount(0)
    }
    await expect(page.getByRole('toolbar', { name: 'Инструменты' })).toBeVisible()
  })

  test('можно добавить больше трёх слоёв', async ({ page }) => {
    const layersSheet = page.getByLabel('Блок слоёв')
    if (!(await layersSheet.isVisible().catch(() => false))) {
      await openStudioTool(page, 'Слои')
      const chip = page.getByRole('button', { name: /Слои ·/ })
      if (await chip.isVisible().catch(() => false)) await chip.click()
    }
    await expect(layersSheet).toBeVisible()

    const galleryInLayers = layersSheet
      .locator('label')
      .filter({ hasText: 'Галерея' })
      .locator('input[type="file"]')

    for (let i = 0; i < 4; i++) {
      await galleryInLayers.setInputFiles('e2e/fixtures/reference.png')
    }

    const layersList = page.getByRole('list', { name: 'Слои референса' })
    await expect(layersList.getByRole('listitem')).toHaveCount(5, { timeout: 10_000 })
  })
})
