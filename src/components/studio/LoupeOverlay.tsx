import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { buildOverlayCssTransform } from '../../hooks/useOverlayTransform'
import type { RefLayer } from '../../lib/layers'

type LoupeOverlayProps = {
  visible: boolean
  size: number
  zoom: number
  /** Position in % of stage (0–100) */
  pos: { x: number; y: number }
  stageRef: RefObject<HTMLDivElement | null>
  sourceVideoRef: RefObject<HTMLVideoElement | null>
  primaryLayer: RefLayer | null
  primaryDisplayUrl: string
  opacity: number
  framedPrimary: boolean
  calcFilter?: string
  auxLayers: RefLayer[]
}

export function LoupeOverlay({
  visible,
  size,
  zoom,
  pos,
  stageRef,
  sourceVideoRef,
  primaryLayer,
  primaryDisplayUrl,
  opacity,
  framedPrimary,
  calcFilter,
  auxLayers,
}: LoupeOverlayProps) {
  const loupeVideoRef = useRef<HTMLVideoElement | null>(null)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const node = stageRef.current
    if (!node) return
    const update = () => setStageSize({ w: node.clientWidth, h: node.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [stageRef, visible])

  useLayoutEffect(() => {
    const source = sourceVideoRef.current
    const loupe = loupeVideoRef.current
    if (!source || !loupe || !visible) return

    const syncStream = () => {
      const stream = source.srcObject
      if (stream && loupe.srcObject !== stream) {
        loupe.srcObject = stream
      }
      if (loupe.paused) {
        void loupe.play().catch(() => undefined)
      }
    }

    syncStream()
    const id = window.setInterval(syncStream, 400)
    return () => window.clearInterval(id)
  }, [sourceVideoRef, visible])

  if (!visible || stageSize.w < 2 || stageSize.h < 2) return null

  const px = (pos.x / 100) * stageSize.w
  const py = (pos.y / 100) * stageSize.h
  const contentStyle: CSSProperties = {
    width: stageSize.w,
    height: stageSize.h,
    transform: `translate(${size / 2 - px * zoom}px, ${size / 2 - py * zoom}px) scale(${zoom})`,
    transformOrigin: '0 0',
    willChange: 'transform',
  }

  return (
    <div
      className="pointer-events-none absolute z-[5] overflow-hidden rounded-full border-2 border-[var(--chip-accent-fg)] shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
      style={{
        width: size,
        height: size,
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: 'translate(-50%, -50%)',
        background: '#141a1d',
      }}
      aria-hidden="true"
    >
      <div className="relative overflow-hidden" style={contentStyle}>
        <video
          ref={loupeVideoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: calcFilter }}
          playsInline
          muted
          autoPlay
        />

        {primaryLayer?.visible && (
          <div
            className={
              framedPrimary
                ? 'absolute left-1/2 top-1/2 w-[min(88vw,520px)] origin-center [transform-style:preserve-3d] min-[960px]:w-[min(72vw,620px)] rounded-[4px] outline-2 outline-offset-[6px] outline-[rgba(224,154,106,0.95)]'
                : 'absolute left-1/2 top-1/2 w-[min(88vw,520px)] origin-center [transform-style:preserve-3d] min-[960px]:w-[min(72vw,620px)]'
            }
            style={{
              opacity: opacity * primaryLayer.opacity,
              transform: buildOverlayCssTransform(primaryLayer.transform, primaryLayer.flipped),
            }}
          >
            <img
              src={primaryDisplayUrl}
              alt=""
              draggable={false}
              className="h-auto max-h-[75dvh] w-full object-contain"
            />
          </div>
        )}

        {auxLayers.map((layer) => (
          <div
            key={layer.id}
            className="absolute left-1/2 top-1/2 w-[min(88vw,520px)] origin-center [transform-style:preserve-3d] min-[960px]:w-[min(72vw,620px)]"
            style={{
              opacity: opacity * layer.opacity,
              transform: buildOverlayCssTransform(layer.transform, layer.flipped),
            }}
          >
            <img
              src={layer.url}
              alt=""
              draggable={false}
              className="h-auto max-h-[75dvh] w-full object-contain"
            />
          </div>
        ))}
      </div>

      <span className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full border border-accent/35 bg-ink-deep/75 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--chip-accent-fg)] backdrop-blur-sm">
        {zoom % 1 === 0 ? `${zoom}×` : `${zoom.toFixed(1)}×`}
      </span>
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70"
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-[-5px] h-[calc(100%_+_10px)] w-px -translate-x-1/2 bg-white/55" />
        <span className="absolute left-[-5px] top-1/2 h-px w-[calc(100%_+_10px)] -translate-y-1/2 bg-white/55" />
      </span>
    </div>
  )
}
