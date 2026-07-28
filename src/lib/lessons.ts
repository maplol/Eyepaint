import type { GuideKind } from './studioTools'

export type LessonCard = {
  id: string
  title: string
  description: string
  tip: string
  image: string
  guide: GuideKind
  opacity: number
  calcStrength?: number
}

const BASE = import.meta.env.BASE_URL

export const LESSONS: LessonCard[] = [
  {
    id: 'portrait-34',
    title: 'Портрет 3/4',
    description: 'Овал, ось лица и линия глаз — классическая постановка головы',
    tip: 'Совмести овал гида с головой на референсе. Линия глаз — на половине высоты головы.',
    image: `${BASE}lessons/portrait.svg`,
    guide: 'face',
    opacity: 0.46,
    calcStrength: 0.5,
  },
  {
    id: 'figure-standing',
    title: 'Фигура стоя',
    description: 'Прямая ось роста, плечи и таз параллельны — 8 голов',
    tip: 'Держи позвоночник строго вертикально. Плечи и таз — горизонтальные линии, ноги почти параллельны.',
    image: `${BASE}lessons/figure.svg`,
    guide: 'figure',
    opacity: 0.44,
    calcStrength: 0.42,
  },
  {
    id: 'still-life',
    title: 'Натюрморт',
    description: 'Предметы по правилу третей: бутылка · чаша · коробка',
    tip: 'Включи сетку 3×3. Крупный предмет — на пересечении линий, не в самом центре.',
    image: `${BASE}lessons/still-life.svg`,
    guide: 'thirds',
    opacity: 0.5,
    calcStrength: 0.38,
  },
]

export function getLessonById(id: string) {
  return LESSONS.find((lesson) => lesson.id === id) ?? null
}
