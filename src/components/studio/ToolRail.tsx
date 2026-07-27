import type { CSSProperties } from 'react'
import {
  cn,
  toolRailBtnActiveClass,
  toolRailBtnClass,
  toolRailClass,
  type StudioToolId,
} from './studioUi'

type Props = {
  activeTool: StudioToolId | null
  layersSheetOpen: boolean
  onSelect: (tool: StudioToolId) => void
}

const TOOLS: {
  id: StudioToolId
  label: string
  title: string
  Icon: () => JSX.Element
}[] = [
  { id: 'hand', label: 'Рука', title: 'Прозрачность, сессия, атмосфера', Icon: IconHand },
  { id: 'eyedropper', label: 'Пипетка', title: 'Цвета и пипетка с холста', Icon: IconEyedropper },
  { id: 'loupe', label: 'Лупа', title: 'Лупа и прицел', Icon: IconLoupe },
  { id: 'perspective', label: 'Проекция', title: 'Сетка перспективы', Icon: IconPerspective },
  { id: 'calc', label: 'Калька', title: 'Калька и сетка', Icon: IconCalc },
  { id: 'guides', label: 'Гиды', title: 'Линии и крестики', Icon: IconGuides },
  { id: 'poses', label: 'Позы', title: 'Скелет и позы', Icon: IconPoses },
  { id: 'layers', label: 'Слои', title: 'Слои и фото', Icon: IconLayers },
]

export function ToolRail({ activeTool, layersSheetOpen, onSelect }: Props) {
  return (
    <aside className={toolRailClass} role="toolbar" aria-label="Инструменты">
      {TOOLS.map((tool) => {
        const active =
          tool.id === 'layers'
            ? activeTool === 'layers' || layersSheetOpen
            : activeTool === tool.id
        return (
          <button
            key={tool.id}
            type="button"
            title={tool.title}
            aria-label={tool.label}
            aria-pressed={active}
            data-tool={tool.id}
            onClick={() => onSelect(tool.id)}
            className={cn(toolRailBtnClass, active && toolRailBtnActiveClass)}
          >
            <tool.Icon />
          </button>
        )
      })}
    </aside>
  )
}

function iconProps(extra?: CSSProperties) {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    style: extra,
  }
}

function IconHand() {
  return (
    <svg {...iconProps()}>
      <path d="M8 11V7.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 10.5V6.2a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14 10.8V7.5a1.5 1.5 0 0 1 3 0V14" />
      <path d="M8 11v2.2c0 2.6 1.7 5.3 4 6.3 2.3-1 4-3.7 4-6.3v-.4" />
      <path d="M8 11c-1.2.4-2 1.5-2 2.8V14c0 3.2 2.2 6.2 5.2 7.2.4.1.8.1 1.2 0" />
    </svg>
  )
}

function IconEyedropper() {
  return (
    <svg {...iconProps()}>
      <path d="m15.5 4.5 4 4" />
      <path d="m14 6 4 4-8.5 8.5H5.5V14.5L14 6Z" />
      <path d="m8.5 15.5 2 2" />
    </svg>
  )
}

function IconLoupe() {
  return (
    <svg {...iconProps()}>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4.5 4.5" />
      <path d="M10.5 8v5M8 10.5h5" />
    </svg>
  )
}

function IconPerspective() {
  return (
    <svg {...iconProps()}>
      <path d="M4 18h16" />
      <path d="M7 18 12 5l5 13" />
      <path d="M5.5 14h13" />
      <path d="M6.5 10.5h11" />
    </svg>
  )
}

function IconCalc() {
  return (
    <svg {...iconProps()}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
      <path d="M4.5 12h15M12 4.5v15" />
      <path d="M8 8h.01M16 8h.01M8 16h.01M16 16h.01" />
    </svg>
  )
}

function IconGuides() {
  return (
    <svg {...iconProps()}>
      <path d="M5 7h14M5 12h14M5 17h14" />
      <path d="M9 5v14M15 5v14" />
    </svg>
  )
}

function IconPoses() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v5" />
      <path d="m8 10 4 2 4-2" />
      <path d="m9 20 3-6 3 6" />
    </svg>
  )
}

function IconLayers() {
  return (
    <svg {...iconProps()}>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </svg>
  )
}
