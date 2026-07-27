export type OnboardingStep = 0 | 1 | 2 | 3

const KEY = 'eyepaint-onboarding-done-v1'

export function isOnboardingDone() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export function markOnboardingDone() {
  localStorage.setItem(KEY, '1')
}

export const ONBOARDING_STEPS = [
  {
    title: 'ПК создаёт комнату',
    body: 'В студии открой ⚙ → Связь → «Создать комнату». Появится код и QR.',
  },
  {
    title: 'Телефон подключается',
    body: 'На телефоне: «Телефон как камера» → введи код или отсканируй QR.',
  },
  {
    title: 'Рисуй через кальку',
    body: 'Наведи телефон на лист, на ПК подгони прозрачность референса и позу.',
  },
] as const
