import QRCode from 'qrcode'

/** Build absolute join URL for the current Pages deployment. */
export function buildJoinUrl(code: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('join', code.toUpperCase())
  // Drop hash noise if any
  url.hash = ''
  return url.toString()
}

export function readJoinCodeFromLocation(search = window.location.search) {
  const params = new URLSearchParams(search)
  const raw = params.get('join') ?? params.get('room')
  if (!raw) return null
  const code = raw.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8)
  return code.length >= 4 ? code : null
}

export function clearJoinParamFromUrl() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('join') && !url.searchParams.has('room')) return
  url.searchParams.delete('join')
  url.searchParams.delete('room')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

export async function renderJoinQrDataUrl(code: string) {
  const joinUrl = buildJoinUrl(code)
  return QRCode.toDataURL(joinUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
    color: {
      dark: '#141a1d',
      light: '#f5f7f8',
    },
  })
}
