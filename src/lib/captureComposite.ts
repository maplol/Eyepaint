import type { OverlayTransform } from '../hooks/useOverlayTransform'

type CaptureCompositeArgs = {
  stage: HTMLElement
  video: HTMLVideoElement
  overlayImage: HTMLImageElement
  transform: OverlayTransform
  opacity: number
  flipped: boolean
  framed?: boolean
}

function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) throw new Error('Камера ещё не готова')

  const scale = Math.max(width / vw, height / vh)
  const drawW = vw * scale
  const drawH = vh * scale
  const x = (width - drawW) / 2
  const y = (height - drawH) / 2
  ctx.drawImage(video, x, y, drawW, drawH)
}

function overlayDrawSize(stage: HTMLElement, image: HTMLImageElement) {
  const maxW = Math.min(stage.clientWidth * 0.88, 520)
  const maxH = stage.clientHeight * 0.75
  const aspect = image.naturalWidth / Math.max(1, image.naturalHeight)
  let drawW = maxW
  let drawH = drawW / aspect
  if (drawH > maxH) {
    drawH = maxH
    drawW = drawH * aspect
  }
  return { drawW, drawH }
}

export async function captureCompositeFrame(args: CaptureCompositeArgs): Promise<File> {
  const { stage, video, overlayImage, transform, opacity, flipped, framed } = args
  if (!overlayImage.naturalWidth) {
    throw new Error('Референс ещё не загружен')
  }

  const width = Math.max(1, stage.clientWidth)
  const height = Math.max(1, stage.clientHeight)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas недоступен')

  ctx.scale(dpr, dpr)
  drawVideoCover(ctx, video, width, height)

  const { drawW, drawH } = overlayDrawSize(stage, overlayImage)
  ctx.save()
  ctx.translate(width / 2 + transform.x, height / 2 + transform.y)
  ctx.rotate((transform.rotation * Math.PI) / 180)
  // Approximate perspective tilt for the saved photo.
  const shearX = Math.tan(((transform.rotateY || 0) * Math.PI) / 180) * 0.35
  const shearY = Math.tan(((transform.rotateX || 0) * Math.PI) / 180) * 0.35
  ctx.transform(1, shearY, shearX, 1, 0, 0)
  ctx.scale(transform.scale * (flipped ? -1 : 1), transform.scale)
  ctx.globalAlpha = opacity
  ctx.drawImage(overlayImage, -drawW / 2, -drawH / 2, drawW, drawH)

  if (framed) {
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(224, 154, 106, 0.95)'
    ctx.lineWidth = 3
    ctx.strokeRect(-drawW / 2 - 4, -drawH / 2 - 4, drawW + 8, drawH + 8)
  }
  ctx.restore()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Не удалось сохранить фото'))
          return
        }
        resolve(
          new File([blob], `eyepaint-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          }),
        )
      },
      'image/jpeg',
      0.92,
    )
  })
}

export async function saveImageToDevice(file: File) {
  const payload = { files: [file], title: 'EYEPAINT', text: 'Снимок из EYEPAINT' }

  if (typeof navigator.canShare === 'function' && navigator.canShare(payload)) {
    await navigator.share(payload)
    return 'shared' as const
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  return 'downloaded' as const
}
