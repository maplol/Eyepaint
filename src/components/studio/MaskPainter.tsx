import { useEffect, useRef } from 'react'
import type { BrushMaskSettings } from '../../lib/brushMask'
import { loadMaskImage } from '../../lib/brushMask'

type MaskPainterProps = {
  settings: BrushMaskSettings
  onChange: (dataUrl: string) => void
  className?: string
}

export function MaskPainter({ settings, onChange, className }: MaskPainterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sync = async () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (!settings.dataUrl) return
      try {
        const img = await loadMaskImage(settings.dataUrl)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      } catch {
        /* ignore */
      }
    }
    void sync()
  }, [settings.dataUrl])

  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * canvas.width
    const y = ((clientY - rect.top) / rect.height) * canvas.height
    const radius = (settings.brushSize / 100) * Math.min(canvas.width, canvas.height) * 0.18

    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = radius * 2

    if (last.current) {
      ctx.beginPath()
      ctx.moveTo(last.current.x, last.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    last.current = { x, y }
  }

  const commit = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }

  if (!settings.editing) return null

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={512}
      className={className}
      style={{
        touchAction: 'none',
        opacity: 0.55,
        mixBlendMode: 'screen',
        cursor: 'crosshair',
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        drawing.current = true
        last.current = null
        paintAt(event.clientX, event.clientY)
      }}
      onPointerMove={(event) => {
        if (!drawing.current) return
        event.stopPropagation()
        paintAt(event.clientX, event.clientY)
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        drawing.current = false
        last.current = null
        commit()
      }}
      onPointerCancel={() => {
        drawing.current = false
        last.current = null
      }}
    />
  )
}
