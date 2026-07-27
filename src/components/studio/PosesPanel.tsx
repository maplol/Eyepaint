import type { ChangeEvent } from 'react'
import type { OverlayTransform } from '../../hooks/useOverlayTransform'
import { formatPoseStats, type SavedPose } from '../../lib/poses'
import {
  chipFileClass,
  chipNeutralClass,
  hiddenFileInputClass,
  panelClass,
  poseSaveClass,
  poseStatClass,
  poseStatLabelClass,
  poseStatsClass,
  poseStatValueClass,
  tipClass,
} from './studioUi'

const STAT_LABELS: Record<string, string> = {
  scale: 'Масштаб',
  rotation: 'Поворот',
  tiltX: 'Наклон X',
  tiltY: 'Наклон Y',
  x: 'X',
  y: 'Y',
  opacity: 'Прозр.',
  flipped: 'Отражение',
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

  return (
    <div className={panelClass}>
      <div className="grid gap-[0.55rem] rounded-2xl border border-[var(--line-soft)] bg-[rgba(20,26,29,0.28)] px-3 py-[0.7rem]">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-[rgba(231,238,240,0.58)]">
          Сейчас
        </p>
        <div className={poseStatsClass}>
          {Object.entries(
            formatPoseStats({
              transform: props.transform,
              flipped: props.flipped,
              opacity: props.opacity,
            }),
          ).map(([key, value]) => (
            <div key={key} className={poseStatClass}>
              <span className={poseStatLabelClass}>{STAT_LABELS[key] ?? key}</span>
              <strong className={poseStatValueClass}>{value}</strong>
            </div>
          ))}
        </div>
      </div>

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

      {props.poses.length === 0 ? (
        <p className={tipClass}>Список пуст — сохрани несколько позиций</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 text-[0.8rem] text-[rgba(231,238,240,0.62)]">
            <span>Сохранённые · {props.poses.length}</span>
            <button
              type="button"
              className="text-[0.78rem] font-semibold text-[var(--danger)]"
              onClick={props.onClear}
            >
              Очистить всё
            </button>
          </div>
          <ul className="grid list-none gap-[0.55rem]">
            {props.poses.map((pose) => {
              const stats = formatPoseStats(pose)
              return (
                <li
                  key={pose.id}
                  className="grid gap-[0.55rem] rounded-2xl border border-[var(--line-soft)] bg-[var(--glass-fill)] p-[0.7rem]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {pose.thumbnail ? (
                        <img
                          src={pose.thumbnail}
                          alt=""
                          className="h-12 w-12 flex-none rounded-xl border border-[var(--glass-border)] object-cover"
                        />
                      ) : (
                        <span className="grid h-12 w-12 flex-none place-items-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[0.68rem] text-[var(--fg-faint)]">
                          —
                        </span>
                      )}
                      <p className="truncate text-[0.95rem] font-bold text-[var(--paper)]">
                        {pose.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="min-h-[1.9rem] shrink-0 rounded-full border border-[rgba(239,139,139,0.35)] bg-[rgba(239,139,139,0.12)] px-[0.65rem] py-1 text-[0.75rem] font-semibold text-[var(--danger-soft)]"
                      onClick={() => props.onDelete(pose.id)}
                    >
                      Удалить
                    </button>
                  </div>
                  <div className={poseStatsClass}>
                    {Object.entries(stats).map(([key, value]) => (
                      <div key={key} className={poseStatClass}>
                        <span className={poseStatLabelClass}>{STAT_LABELS[key] ?? key}</span>
                        <strong className={poseStatValueClass}>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="min-h-[2.35rem] rounded-[12px] border border-[var(--line)] bg-[var(--glass-fill-mid)] text-[0.86rem] font-bold text-[var(--fg-strong)]"
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
}
