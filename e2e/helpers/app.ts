import { test as base, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const FIXTURE_IMAGE = path.join(__dirname, '..', 'fixtures', 'reference.png')

/** Mock camera + onboarding flag before app boots. */
export async function prepareApp(page: Page, opts?: { onboardingDone?: boolean }) {
  const onboardingDone = opts?.onboardingDone ?? true

  await page.addInitScript((done) => {
    try {
      if (done) localStorage.setItem('eyepaint-onboarding-done-v1', '1')
      else localStorage.removeItem('eyepaint-onboarding-done-v1')
      localStorage.setItem('eyepaint-layers-sheet-open-v1', '0')
      localStorage.removeItem('eyepaint-layers-panel-open-v1')
    } catch {
      /* ignore */
    }

    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#2a343a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#e09a6a'
      ctx.fillRect(200, 120, 880, 480)
    }

    const stream =
      typeof canvas.captureStream === 'function'
        ? canvas.captureStream(24)
        : new MediaStream()

    const mediaDevices = navigator.mediaDevices ?? ({} as MediaDevices)
    mediaDevices.getUserMedia = async () => stream
    mediaDevices.enumerateDevices = async () => [
      {
        deviceId: 'fake',
        groupId: 'g1',
        kind: 'videoinput' as MediaDeviceKind,
        label: 'Fake Cam',
        toJSON() {
          return this
        },
      },
    ]
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: mediaDevices,
    })
  }, onboardingDone)
}

type Fixtures = {
  app: Page
}

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    await prepareApp(page)
    await page.goto('./')
    await use(page)
  },
})

export { expect }

export async function dismissOnboardingIfAny(page: Page) {
  const skip = page.getByRole('button', { name: 'Пропустить' })
  if (await skip.isVisible().catch(() => false)) {
    await skip.click()
  }
}

export async function enterStudioFromGallery(page: Page, file = FIXTURE_IMAGE) {
  await dismissOnboardingIfAny(page)
  const input = page.locator('label', { hasText: 'Из галереи' }).locator('input[type="file"]')
  await input.setInputFiles(file)
  await expect(page.getByRole('tab', { name: 'Основное' })).toBeVisible({ timeout: 20_000 })
}

export async function openStudioTab(
  page: Page,
  name: 'Основное' | 'Проекция' | 'Цвета' | 'Позы',
) {
  await page.getByRole('tab', { name }).click()
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true')
}
