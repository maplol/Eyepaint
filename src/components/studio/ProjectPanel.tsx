import type { Dispatch, SetStateAction } from 'react'
import type { OverlayTransform } from '../../hooks/useOverlayTransform'
import {
  chipNeutralClass,
  panelClass,
  rangeInputClass,
  sectionTitleClass,
  sliderLabelsClass,
  tipClass,
} from './studioUi'

type ProjectPanelProps = {
  transform: OverlayTransform
  setTransform: Dispatch<SetStateAction<OverlayTransform>>
}

export function ProjectPanel({ transform, setTransform }: ProjectPanelProps) {
  return (
    <div className={panelClass}>
      <p className={sectionTitleClass}>Подстройка под угол листа</p>
      <div>
        <div className={sliderLabelsClass}>
          <span>Наклон X</span>
          <span>{Math.round(transform.rotateX)}°</span>
        </div>
        <input
          className={rangeInputClass}
          type="range"
          min={-60}
          max={60}
          step={1}
          value={transform.rotateX}
          aria-label="Наклон X"
          onChange={(event) =>
            setTransform((prev) => ({ ...prev, rotateX: Number(event.target.value) }))
          }
        />
      </div>
      <div>
        <div className={sliderLabelsClass}>
          <span>Наклон Y</span>
          <span>{Math.round(transform.rotateY)}°</span>
        </div>
        <input
          className={rangeInputClass}
          type="range"
          min={-60}
          max={60}
          step={1}
          value={transform.rotateY}
          aria-label="Наклон Y"
          onChange={(event) =>
            setTransform((prev) => ({ ...prev, rotateY: Number(event.target.value) }))
          }
        />
      </div>
      <div>
        <div className={sliderLabelsClass}>
          <span>Поворот</span>
          <span>{Math.round(transform.rotation)}°</span>
        </div>
        <input
          className={rangeInputClass}
          type="range"
          min={-180}
          max={180}
          step={1}
          value={transform.rotation}
          aria-label="Поворот"
          onChange={(event) =>
            setTransform((prev) => ({ ...prev, rotation: Number(event.target.value) }))
          }
        />
      </div>
      <div>
        <div className={sliderLabelsClass}>
          <span>Масштаб</span>
          <span>{Math.round(transform.scale * 100)}%</span>
        </div>
        <input
          className={rangeInputClass}
          type="range"
          min={0.2}
          max={4}
          step={0.01}
          value={transform.scale}
          aria-label="Масштаб проекции"
          onChange={(event) =>
            setTransform((prev) => ({ ...prev, scale: Number(event.target.value) }))
          }
        />
      </div>
      <button
        type="button"
        className={chipNeutralClass}
        onClick={() =>
          setTransform((prev) => ({
            ...prev,
            rotateX: 0,
            rotateY: 0,
            rotation: 0,
          }))
        }
      >
        Сбросить углы
      </button>
      <p className={tipClass}>
        Если телефон стоит под углом — крути наклоны, пока референс ляжет на лист.
      </p>
    </div>
  )
}
