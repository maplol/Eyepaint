import {
  expect,
  test,
  enterStudioFromGallery,
  openStudioTool,
  prepareApp,
  FIXTURE_IMAGE,
} from './helpers/app'

test.describe('Studio smoke', () => {
  test.beforeEach(async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await enterStudioFromGallery(page)
  })

  test('инструменты рельсы открывают панели', async ({ page }) => {
    for (const tool of ['Рука', 'Проекция', 'Пипетка', 'Позы'] as const) {
      await openStudioTool(page, tool)
    }
  })

  test('режим Свободный | AR в шапке', async ({ page }) => {
    const arTab = page.getByRole('tab', { name: 'AR' })
    const freeTab = page.getByRole('tab', { name: 'Свободный' })
    await expect(freeTab).toBeVisible()
    await expect(arTab).toBeVisible()
    await arTab.click()
    await expect(page.getByText(/Ищи маркер|Готовлю AR/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Маркер' })).toBeVisible()
    await freeTab.click()
    await expect(freeTab).toHaveAttribute('aria-selected', 'true')
  })

  test('калька, гиды, лупа и атмосфера', async ({ page }) => {
    await openStudioTool(page, 'Калька')
    await expect(page.getByText('Сила')).toBeVisible()

    await openStudioTool(page, 'Гиды')
    await expect(page.getByText('Прозрачность гида')).toBeVisible()
    await page.getByRole('button', { name: 'Лицо' }).click()

    await openStudioTool(page, 'Лупа')
    await expect(page.getByText('Размер', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '2×', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '2.5×', exact: true }).click()

    await openStudioTool(page, 'Рука')
    await page.getByRole('button', { name: 'Настройки' }).click()
    await page.getByRole('button', { name: 'Тема' }).click()
    await page.getByRole('button', { name: 'Светлая' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-atmosphere', 'light')
    await page.getByRole('button', { name: 'Тёмная' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-atmosphere', 'dark')
    await page.getByRole('dialog', { name: 'Настройки' }).getByRole('button', { name: 'Закрыть' }).click()
  })

  test('гиды sticky: Закрыть не гасит, повторный клик гасит', async ({ page }) => {
    const rail = page.getByRole('toolbar', { name: 'Инструменты' })
    const guidesBtn = rail.getByRole('button', { name: 'Гиды' })

    await openStudioTool(page, 'Гиды')
    await expect(page.getByText('Прозрачность гида')).toBeVisible()
    await expect(guidesBtn).toHaveAttribute('aria-pressed', 'true')

    await page.getByLabel('Настройки инструмента').getByRole('button', { name: 'Закрыть' }).click()
    await expect(page.getByLabel('Настройки инструмента')).toHaveCount(0)
    await expect(guidesBtn).toHaveAttribute('aria-pressed', 'true')

    await guidesBtn.click()
    await expect(page.getByText('Прозрачность гида')).toBeVisible()
    await expect(guidesBtn).toHaveAttribute('aria-pressed', 'true')

    await guidesBtn.click()
    await expect(page.getByLabel('Настройки инструмента')).toHaveCount(0)
    await expect(guidesBtn).toHaveAttribute('aria-pressed', 'false')
  })

  test('сессия и снимок прогресса не ломают UI', async ({ page }) => {
    await openStudioTool(page, 'Рука')
    await page.getByRole('tab', { name: 'Сессия' }).click()
    await page.getByRole('button', { name: '25 мин' }).click()
    await expect(page.getByText(/\d+:\d+/)).toBeVisible()
    await page.getByRole('button', { name: 'Снимок прогресса' }).click()
  })

  test('скрытие UI и возврат', async ({ page }) => {
    await page.getByRole('button', { name: 'Скрыть интерфейс' }).click()
    await expect(page.getByLabel('Инструменты')).toHaveCount(0)
    await page.getByRole('button', { name: 'Показать интерфейс' }).click()
    await expect(page.getByRole('toolbar', { name: 'Инструменты' })).toBeVisible()
  })

  test('настройки: вкладка Проект и сохранение', async ({ page }) => {
    await page.getByRole('button', { name: 'Настройки' }).click()
    const dialog = page.getByRole('dialog', { name: 'Настройки' })
    await expect(dialog).toBeVisible()
    await page.getByRole('button', { name: 'Проект' }).click()
    await expect(dialog.getByRole('button', { name: 'Сохранить проект в файл' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Очистить автосейв' })).toBeVisible()
  })

  test('назад на Welcome', async ({ page }) => {
    await page.getByRole('button', { name: 'Назад' }).click()
    await expect(page.getByRole('button', { name: 'Телефон как камера' })).toBeVisible()
  })
})

test.describe('Studio projection & poses', () => {
  test.beforeEach(async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await enterStudioFromGallery(page, FIXTURE_IMAGE)
  })

  test('проекция меняет подписи углов', async ({ page }) => {
    await openStudioTool(page, 'Проекция')
    await page.getByLabel('Наклон X').fill('20')
    await expect(page.getByText('20°').first()).toBeVisible()
  })

  test('сохранение позы', async ({ page }) => {
    await openStudioTool(page, 'Позы')
    await page.getByRole('button', { name: '+ Сохранить в список' }).click()
    await page.getByRole('tab', { name: 'Список' }).click()
    await expect(page.getByText(/Сохранённые ·/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Применить' }).first()).toBeVisible()
  })
})
