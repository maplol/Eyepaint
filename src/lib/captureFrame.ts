export function captureVideoFrame(
  video: HTMLVideoElement,
  filename = `eyepaint-${Date.now()}.jpg`,
): Promise<File> {
  if (!video.videoWidth || !video.videoHeight) {
    return Promise.reject(new Error('Камера ещё не готова'))
  }

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas недоступен'))

  ctx.drawImage(video, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Не удалось сохранить кадр'))
          return
        }
        resolve(new File([blob], filename, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  })
}
