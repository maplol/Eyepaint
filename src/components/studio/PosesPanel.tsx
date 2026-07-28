import type { ChangeEvent } from 'react'
import type { OverlayTransform } from '../../hooks/useOverlayTransform'
import { formatPoseStats, type SavedPose } from '../../lib/poses'
import { CornerAction, TrashIcon } from './CornerAction'
import { HoverTooltip } from './HoverTooltip'
import { PanelTabs } from './PanelTabs'
import {
  chipFileClass,
  chipNeutralClass,
  cn,
  fieldLabelClass,
  hiddenFileInputClass,
  panelClass,
  poseSaveClass,
  poseStatClass,
  poseStatIconClass,
  poseStatsClass,
  poseStatValueClass,
  tipClass,
} from './studioUi'

const STAT_LABELS: Record<string, string> = {
  scale: 'Масштаб',
  rotation: 'Поворот',
  tiltX: 'Наклон X',
  tiltY: 'Наклон Y',
  x: 'Сдвиг X',
  y: 'Сдвиг Y',
  opacity: 'Прозрачность',
  flipped: 'Отражение',
}

const STAT_ORDER = [
  'scale',
  'rotation',
  'tiltX',
  'tiltY',
  'x',
  'y',
  'opacity',
  'flipped',
] as const

function StatIcon({ id }: { id: string }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    className: poseStatIconClass,
  }
  switch (id) {
    case 'scale':
      return (
        <svg {...common}>
          <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
          <path d="M14 10 10 14" />
        </svg>
      )
    case 'rotation':
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-2.6-6.3" />
          <path d="M21 3v6h-6" />
        </svg>
      )
    case 'tiltX':
      return (
        <svg {...common}>
          <path d="M4 16 12 8l8 8" />
          <path d="M4 20h16" />
        </svg>
      )
    case 'tiltY':
      return (
        <svg {...common}>
          <path d="M8 4 16 12 8 20" />
          <path d="M4 4v16" />
        </svg>
      )
    case 'x':
      return (
        <svg {...common}>
          <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" />
        </svg>
      )
    case 'y':
      return (
        <svg {...common}>
          <path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" />
        </svg>
      )
    case 'opacity':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" opacity="0.45" />
        </svg>
      )
    case 'flipped':
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M8 8 4 12l4 4M16 8l4 4-4 4" />
        </svg>
      )
    default:
      return null
  }
}

function PoseStatsGrid({ stats }: { stats: Record<string, string> }) {
  return (
    <div className={poseStatsClass}>
      {STAT_ORDER.map((key) => {
        const value = stats[key]
        if (value == null) return null
        const label = STAT_LABELS[key] ?? key
        return (
          <HoverTooltip key={key} label={label} className="min-w-0 w-full [&_>span]:w-full">
            <div className={poseStatClass} aria-label={`${label}: ${value}`}>
              <StatIcon id={key} />
              <strong className={poseStatValueClass}>{value}</strong>
            </div>
          </HoverTooltip>
        )
      })}
    </div>
  )
}

type PosesPanelProps = {
  transform: OverlayTransform
  flipped: boolean
  opacity: number
  poses: SavedPose[]
  onSave: () => void
  onApply: (pose: SavedPose) => void
  onDelete: (id: string) => void
  onClear: () => void
  onExport: () => void
  onImportFile: (file: File | undefined) => void
}

export function PosesPanel(props: PosesPanelProps) {
  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    props.onImportFile(event.target.files?.[0])
    event.target.value = ''
  }

  const currentStats = formatPoseStats({
    transform: props.transform,
    flipped: props.flipped,
    opacity: props.opacity,
  })

  const currentTab = (
    <div className="grid gap-3">
      <PoseStatsGrid stats={currentStats} />
      <button type="button" className={poseSaveClass} onClick={props.onSave}>
        + Сохранить в список
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={chipNeutralClass}
          disabled={props.poses.length === 0}
          onClick={props.onExport}
        >
          Экспорт JSON
        </button>
        <label className={chipFileClass}>
          Импорт JSON
          <input
            className={hiddenFileInputClass}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
          />
        </label>
      </div>
    </div>
  )

  const listTab = (
    <div className="grid gap-2 pb-14">
      {props.poses.length === 0 ? (
        <p className={tipClass}>Список пуст — сохрани несколько позиций</p>
      ) : (
        <>
          <CornerAction label="Очистить всё" onClick={props.onClear}>
            <TrashIcon />
          </CornerAction>
          <p className={fieldLabelClass}>Сохранённые · {props.poses.length}</p>
          <ul className="grid list-none gap-2">
            {props.poses.map((pose) => {
              const stats = formatPoseStats(pose)
              return (
                <li
                  key={pose.id}
                  className="grid gap-2 rounded-2xl border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {pose.thumbnail ? (
                        <img
                          src={pose.thumbnail}
                          alt=""
                          className="h-11 w-11 flex-none rounded-xl border border-[var(--glass-border)] object-cover"
                        />
                      ) : (
                        <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[0.68rem] text-[var(--fg-faint)]">
                          —
                        </span>
                      )}
                      <p className="truncate text-[0.9rem] font-bold text-[var(--fg-strong)]">
                        {pose.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        'inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border border-danger/35 bg-danger/12 px-2.5 py-1 text-[0.75rem] font-semibold leading-none text-[var(--danger-soft)]',
                      )}
                      onClick={() => props.onDelete(pose.id)}
                    >
                      Удалить
                    </button>
                  </div>
                  <PoseStatsGrid stats={stats} />
                  <button
                    type="button"
                    className={chipNeutralClass}
                    onClick={() => props.onApply(pose)}
                  >
                    Применить
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )

  return (
    <div className={cn(panelClass, 'gap-0')}>
      <PanelTabs
        tabs={[
          { id: 'now', label: 'Сейчас', content: currentTab },
          { id: 'list', label: 'Список', content: listTab },
        ]}
        storageKey="eyepaint-poses-tab"
      />
    </div>
  )
}
