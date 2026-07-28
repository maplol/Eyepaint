export type CoachPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right'

export type CoachStep = {
  /** CSS-селектор цели; null — карточка по центру без стрелки */
  target: string | null
  title: string
  body: string
  placement?: CoachPlacement
}

const WELCOME_KEY = 'eyepaint-onboarding-done-v1'
const STUDIO_KEY = 'eyepaint-studio-tour-v1'
const CAMERA_KEY = 'eyepaint-camera-tour-v1'

export function isOnboardingDone() {
  try {
    return localStorage.getItem(WELCOME_KEY) === '1'
  } catch {
    return true
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(WELCOME_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isStudioTourDone() {
  try {
    return localStorage.getItem(STUDIO_KEY) === '1'
  } catch {
    return true
  }
}

export function markStudioTourDone() {
  try {
    localStorage.setItem(STUDIO_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isCameraTourDone() {
  try {
    return localStorage.getItem(CAMERA_KEY) === '1'
  } catch {
    return true
  }
}

export function markCameraTourDone() {
  try {
    localStorage.setItem(CAMERA_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Поэтапный тур на экране старта — стрелка на каждую кнопку */
export const WELCOME_COACH_STEPS: CoachStep[] = [
  {
    target: null,
    title: 'Добро пожаловать',
    body: 'Короткий тур со стрелками: покажем каждую важную кнопку. Можно пропустить и потом жать «?» для справки.',
  },
  {
    target: '[data-help="welcome-capture"]',
    title: 'Сфотографировать',
    body: 'Снимок с камеры сразу станет референсом в студии — самый быстрый старт без комнаты.',
    placement: 'top',
  },
  {
    target: '[data-help="welcome-gallery"]',
    title: 'Из галереи',
    body: 'Загрузить готовое фото или картинку с диска и сразу открыть студию.',
    placement: 'top',
  },
  {
    target: '[data-help="welcome-project"]',
    title: 'Открыть проект',
    body: 'Файл .eyepaint.json со слоями, позой и настройками — полный перенос сессии.',
    placement: 'top',
  },
  {
    target: '[data-help="welcome-phone"]',
    title: 'Телефон как камера',
    body: 'Экран телефона для стрима листа. На ПК потом создашь комнату в ⚙ → Связь.',
    placement: 'top',
  },
  {
    target: '[data-help="welcome-lesson-portrait-34"]',
    title: 'Уроки',
    body: 'Готовые постановки с гидом и калькой. Можно сразу обводить — начнём с портрета 3/4.',
    placement: 'top',
  },
  {
    target: '[data-help="help-toggle"]',
    title: 'Справка «?»',
    body: 'Включи «?» и кликай по элементам — карточка расскажет, что делает кнопка. Тур на этом закончен.',
    placement: 'bottom',
  },
]

/** Тур студии — по одной кнопке рельсы и шапки */
export const STUDIO_COACH_STEPS: CoachStep[] = [
  {
    target: null,
    title: 'Студия',
    body: 'Референс поверх камеры. Сейчас пройдём рельсу инструментов слева и важные кнопки сверху.',
  },
  {
    target: '[data-help="hand"]',
    title: 'Рука',
    body: 'Двигай слой, прозрачность, таймер сессии и атмосфера. Повторный клик выключает панель.',
    placement: 'right',
  },
  {
    target: '[data-help="eyedropper"]',
    title: 'Пипетка',
    body: 'Цвета с референса и палитра. Тап по слою берёт оттенок.',
    placement: 'right',
  },
  {
    target: '[data-help="loupe"]',
    title: 'Лупа',
    body: 'Увеличение участка. На телефоне палец водит лупу, не двигает слой.',
    placement: 'right',
  },
  {
    target: '[data-help="perspective"]',
    title: 'Проекция',
    body: 'Наклон и поворот под угол телефона над бумагой.',
    placement: 'right',
  },
  {
    target: '[data-help="calc"]',
    title: 'Калька',
    body: 'Контраст камеры, чтобы карандаш читался сквозь видео. «Закрыть» панель не гасит режим.',
    placement: 'right',
  },
  {
    target: '[data-help="guides"]',
    title: 'Гиды',
    body: 'Трети, лицо или фигура. Липкий режим — выключается повторным кликом в рельсе.',
    placement: 'right',
  },
  {
    target: '[data-help="poses"]',
    title: 'Позы',
    body: 'Сохрани ракурс слоя и верни его позже из списка.',
    placement: 'right',
  },
  {
    target: '[data-help="layers"]',
    title: 'Слои',
    body: 'Несколько референсов, порядок и прозрачность. На мобилке при инструменте — компактная шапка.',
    placement: 'right',
  },
  {
    target: '[data-help="studio-settings"]',
    title: 'Настройки',
    body: 'Связь (комната/QR), хоткеи, флаги и сохранение проекта.',
    placement: 'bottom',
  },
  {
    target: '[data-help="help-toggle"]',
    title: 'Справка в студии',
    body: '«?» снова включает подсказки по клику. Можно рисовать!',
    placement: 'bottom',
  },
]

export const CAMERA_COACH_STEPS: CoachStep[] = [
  {
    target: null,
    title: 'Камера телефона',
    body: 'Этот экран стримит лист на ПК. Пара шагов — и понятно, куда жать.',
  },
  {
    target: '[data-help="camera-code"]',
    title: 'Код комнаты',
    body: 'Тот же код, что на ПК в ⚙ → Связь. Можно прийти по QR-ссылке.',
    placement: 'top',
  },
  {
    target: '[data-help="camera-start"]',
    title: 'Подключиться',
    body: 'Запускает камеру и отправку в комнату. Держи телефон над листом ровно.',
    placement: 'top',
  },
  {
    target: '[data-help="help-toggle"]',
    title: 'Справка',
    body: '«?» — подсказки по кнопкам. «Памятка» — краткий чеклист на этом экране.',
    placement: 'bottom',
  },
]

/** @deprecated alias for tests / old imports */
export const ONBOARDING_STEPS = WELCOME_COACH_STEPS
