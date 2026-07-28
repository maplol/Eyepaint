export type HelpTip = {
  id: string
  title: string
  body: string
  page: 'welcome' | 'studio' | 'camera' | 'shared'
}

/** Подробные подсказки по всем кликабельным зонам */
export const HELP_TIPS: Record<string, HelpTip> = {
  'welcome-brand': {
    id: 'welcome-brand',
    page: 'welcome',
    title: 'EYEPAINT',
    body: 'Приложение-калька: референс полупрозрачно поверх камеры, чтобы срисовывать на бумагу. ПК — студия, телефон — камера листа.',
  },
  'welcome-capture': {
    id: 'welcome-capture',
    page: 'welcome',
    title: 'Сфотографировать',
    body: 'Открывает камеру устройства, снимок становится референсом в студии. Удобно без комнаты — локальная камера ПК или телефона.',
  },
  'welcome-gallery': {
    id: 'welcome-gallery',
    page: 'welcome',
    title: 'Из галереи',
    body: 'Выбери готовое фото или SVG с диска. Сразу попадёшь в студию с этим референсом как основным слоем.',
  },
  'welcome-project': {
    id: 'welcome-project',
    page: 'welcome',
    title: 'Открыть проект',
    body: 'Файл .eyepaint.json: слои, поза, гиды, палитры. Полное восстановление сессии с другого устройства или бэкапа.',
  },
  'welcome-continue': {
    id: 'welcome-continue',
    page: 'welcome',
    title: 'Продолжить сессию',
    body: 'Автосейв в браузере. Если рисовал раньше на этом устройстве — вернёт слои и настройки без файла.',
  },
  'welcome-phone': {
    id: 'welcome-phone',
    page: 'welcome',
    title: 'Телефон как камера',
    body: 'Открывает экран подключения телефона. На ПК сначала создай комнату в ⚙ → Связь, затем на телефоне введи код или QR.',
  },
  'welcome-lesson-portrait-34': {
    id: 'welcome-lesson-portrait-34',
    page: 'welcome',
    title: 'Урок · Портрет 3/4',
    body: 'Ставит референс головы в 3/4, гид «лицо» (овал + оси) и мягкую кальку. Совмести овал с головой и веди линию глаз.',
  },
  'welcome-lesson-figure-standing': {
    id: 'welcome-lesson-figure-standing',
    page: 'welcome',
    title: 'Урок · Фигура стоя',
    body: 'Прямая фигура на 8 голов, гид с вертикальной осью. Следи, чтобы плечи и таз были горизонтальны — без «кривых» ног.',
  },
  'welcome-lesson-still-life': {
    id: 'welcome-lesson-still-life',
    page: 'welcome',
    title: 'Урок · Натюрморт',
    body: 'Композиция по третям: бутылка, чаша, коробка. Сетка 3×3 помогает не ставить всё в центр кадра.',
  },

  'studio-back': {
    id: 'studio-back',
    page: 'studio',
    title: 'Назад',
    body: 'Выход на экран старта. Автосейв обычно уже записан; можно продолжить сессию позже.',
  },
  'studio-settings': {
    id: 'studio-settings',
    page: 'studio',
    title: 'Настройки',
    body: 'Связь (комната/QR), хоткеи, флаги фич, сохранение проекта. Не выключает гиды и кальку — только прячет панель инструмента.',
  },
  'studio-hide': {
    id: 'studio-hide',
    page: 'studio',
    title: 'Скрыть интерфейс',
    body: 'Убирает рельсу и панели, остаётся холст. Справа внизу кнопка «Показать» вернёт UI. Удобно для чистого обвода.',
  },
  'studio-show': {
    id: 'studio-show',
    page: 'studio',
    title: 'Показать интерфейс',
    body: 'Возвращает рельсу, слои и панели после режима «Скрыть».',
  },

  hand: {
    id: 'hand',
    page: 'studio',
    title: 'Рука',
    body: 'Основной режим: двигай активный слой жестами, крути прозрачность референса, таймер сессии (25/45/90), светлая/тёмная атмосфера, снимок прогресса.',
  },
  eyedropper: {
    id: 'eyedropper',
    page: 'studio',
    title: 'Пипетка / цвета',
    body: 'Палитра с референса, пресеты (кожа и др.), точность. Режим пипетки — тап по слою берёт цвет. Повторный клик в рельсе выключает.',
  },
  loupe: {
    id: 'loupe',
    page: 'studio',
    title: 'Лупа',
    body: 'Увеличение участка сцены. На телефоне палец водит лупу, pan слоя отключён. Размер и кратность — в панели. Повторный клик выключает.',
  },
  perspective: {
    id: 'perspective',
    page: 'studio',
    title: 'Проекция',
    body: 'Наклон X/Y, поворот, масштаб — чтобы референс совпал с углом телефона над листом. Сбрасывай оси, если картинка «уехала».',
  },
  calc: {
    id: 'calc',
    page: 'studio',
    title: 'Калька',
    body: 'Фильтр камеры: сильнее контраст/выбеливание, чтобы карандаш на бумаге читался сквозь видео. Липкий режим: «Закрыть» панель не гасит кальку.',
  },
  guides: {
    id: 'guides',
    page: 'studio',
    title: 'Гиды',
    body: 'Трети · лицо · фигура. Полупрозрачные линии поверх сцены. Липкий режим: повторный клик в рельсе выключает, «Закрыть» — нет.',
  },
  poses: {
    id: 'poses',
    page: 'studio',
    title: 'Позы',
    body: 'Сохрани transform активного слоя в список, примени позже или экспортируй JSON. Удобно для серии ракурсов одной постановки.',
  },
  layers: {
    id: 'layers',
    page: 'studio',
    title: 'Слои',
    body: 'Несколько референсов: галерея/камера добавляют слой, DnD меняет порядок, меню — на передний/задний план. На мобилке при открытом инструменте — компактная шапка.',
  },

  'settings-link': {
    id: 'settings-link',
    page: 'studio',
    title: 'Связь',
    body: 'Создай комнату на ПК: код + QR. Телефон подключается к этому коду и шлёт камеру. Здесь же статус и «Новый код».',
  },
  'settings-keys': {
    id: 'settings-keys',
    page: 'studio',
    title: 'Хоткеи',
    body: 'Клавиши pan / rotate / scale / tilt на ПК. Подсказки также над холстом, когда панель инструмента закрыта.',
  },
  'settings-flags': {
    id: 'settings-flags',
    page: 'studio',
    title: 'Флаги',
    body: 'Включение фич: слои, уроки, кисть-маска, галерея сессии. Выключи лишнее, если нужен минимальный UI.',
  },
  'settings-project': {
    id: 'settings-project',
    page: 'studio',
    title: 'Проект',
    body: 'Сохранить .eyepaint.json на диск или очистить автосейв браузера. Не забудь сохраниться перед сменой устройства.',
  },
  'settings-theme': {
    id: 'settings-theme',
    page: 'studio',
    title: 'Тема',
    body: 'Тёмная или светлая атмосфера студии. Светлая доступна, если включён флаг «Светлая тема».',
  },

  'camera-code': {
    id: 'camera-code',
    page: 'camera',
    title: 'Код комнаты',
    body: 'Тот же код, что показал ПК в ⚙ → Связь. Можно вставить из буфера или прийти по ссылке ?join=',
  },
  'camera-start': {
    id: 'camera-start',
    page: 'camera',
    title: 'Подключиться',
    body: 'Запускает камеру телефона и WebRTC в комнату. Держи телефон над листом стабильно.',
  },
  'camera-quality': {
    id: 'camera-quality',
    page: 'camera',
    title: 'Качество стрима',
    body: 'Баланс чёткости и стабильности. На слабой сети бери ниже — меньше лагов у ведущего на ПК.',
  },
  'camera-torch': {
    id: 'camera-torch',
    page: 'camera',
    title: 'Фонарик',
    body: 'Подсветка листа. Также можно включить с ПК командой в студии, если телефон поддерживает torch.',
  },
  'camera-freeze': {
    id: 'camera-freeze',
    page: 'camera',
    title: 'Freeze',
    body: 'Замораживает кадр — удобно обводить без дрожания рук. С ПК тоже можно слать freeze.',
  },
  'camera-exposure': {
    id: 'camera-exposure',
    page: 'camera',
    title: 'Экспозиция',
    body: 'Яркость камеры. Если бумага белая «выбита» — убавь; если темно — прибавь.',
  },
  'camera-help': {
    id: 'camera-help',
    page: 'camera',
    title: 'Справка камеры',
    body: 'Краткая памятка экрана телефона. Тап по превью ставит фокус в точку.',
  },
  'camera-exit': {
    id: 'camera-exit',
    page: 'camera',
    title: 'Выход',
    body: 'Закрывает экран камеры и возвращает на старт. Стрим останавливается.',
  },

  'help-toggle': {
    id: 'help-toggle',
    page: 'shared',
    title: 'Режим подсказок',
    body: 'Когда «?» активен (подсвечен), клик по любому элементу с подсказкой открывает карточку вместо обычного действия. Выключи «?», чтобы снова работать как обычно.',
  },
}

export function getHelpTip(id: string | null | undefined): HelpTip | null {
  if (!id) return null
  return HELP_TIPS[id] ?? null
}
