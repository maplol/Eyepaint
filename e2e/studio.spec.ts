import {
  expect,
  test,
  enterStudioFromGallery,
  openStudioTab,
  prepareApp,
  FIXTURE_IMAGE,
} from './helpers/app'

test.describe('Studio smoke', () => {
  test.beforeEach(async ({ page }) => {
    await prepareApp(page)
    await page.goto('./')
    await enterStudioFromGallery(page)
  })

  test('вкладки дока переключаются', async ({ page }) => {
    for (const tab of ['Основное', 'Проекция', 'Цвета', 'Позы'] as const) {
      await openStudioTab(page, tab)
    }
  })

  test('калька, гиды, лупа и атмосфера', async ({ page }) => {
    await openStudioTab(page, 'Основное')

    await page.getByRole('button', { name: 'Выкл' }).first().click()
    await expect(page.getByText('Сила')).toBeVisible()

    await page.getByRole('button', { name: '3×3' }).click()
    await expect(page.getByText('Прозрачность сетки')).toBeVisible()

    // Лупа: кнопка Вкл рядом с блоком Лупа
    const loupeCard = page.locator('div').filter({ hasText: /^Лупа/ }).first()
    await loupeCard.getByRole('button', { name: 'Выкл' }).click()
    await expect(page.getByText('Размер')).toBeVisible()
    await expect(page.getByRole('button', { name: '2×', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '2.5×', exact: true }).click()

    await page.getByRole('button', { name: 'Светлая' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-atmosphere', 'light')
    await page.getByRole('button', { name: 'Тёмная' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-atmosphere', 'dark')
  })

  test('сессия и снимок прогресса не ломают UI', async ({ page }) => {
    await openStudioTab(page, 'Основное')
    await page.getByRole('button', { name: '25 мин' }).click()
    await expect(page.getByText(/\d+:\d+/)).toBeVisible()
    await page.getByRole('button', { name: 'Снимок прогресса' }).click()
  })

  test('скрытие UI и возврат', async ({ page }) => {
    await page.getByRole('button', { name: 'Скрыть' }).click()
    await expect(page.getByRole('tab', { name: 'Основное' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Показать интерфейс' }).click()
    await expect(page.getByRole('tab', { name: 'Основное' })).toBeVisible()
  })

  test('настройки: вкладка Проект и сохранение', async ({ page }) => {
    await page.getByRole('button', { name: 'Настройки' }).click()
    await page.getByRole('button', { name: 'Проект' }).click()
    await expect(page.getByRole('button', { name: 'Сохранить проект в файл' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Очистить автосейв' })).toBeVisible()
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
    await openStudioTab(page, 'Проекция')
    await page.getByLabel('Наклон X').fill('20')
    await expect(page.getByText('20°').first()).toBeVisible()
  })

  test('сохранение позы', async ({ page }) => {
    await openStudioTab(page, 'Позы')
    await page.getByRole('button', { name: '+ Сохранить в список' }).click()
    await expect(page.getByText(/Сохранённые ·/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Применить' }).first()).toBeVisible()
  })
})
