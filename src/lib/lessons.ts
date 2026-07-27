import type { GuideKind } from './studioTools'

export type LessonCard = {
  id: string
  title: string
  description: string
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
    description: 'Лицо под углом — гид осей + мягкая калька',
    image: `${BASE}lessons/portrait.svg`,
    guide: 'face',
    opacity: 0.42,
    calcStrength: 0.55,
  },
  {
    id: 'figure-standing',
    title: 'Фигура стоя',
    description: 'Пропорции роста и осевая линия',
    image: `${BASE}lessons/figure.svg`,
    guide: 'figure',
    opacity: 0.4,
    calcStrength: 0.45,
  },
  {
    id: 'still-life',
    title: 'Натюрморт',
    description: 'Сетка 3×3 для композиции предметов',
    image: `${BASE}lessons/still-life.svg`,
    guide: 'thirds',
    opacity: 0.48,
    calcStrength: 0.4,
  },
]

export function getLessonById(id: string) {
  return LESSONS.find((lesson) => lesson.id === id) ?? null
}
