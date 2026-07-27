const ROOM_CODE_KEY = 'eyepaint-room-code-v1'

export function createRoomCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const values = crypto.getRandomValues(new Uint32Array(length))
  for (let i = 0; i < length; i += 1) {
    code += alphabet[values[i]! % alphabet.length]
  }
  return code
}

export function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export function loadSavedRoomCode() {
  try {
    const raw = localStorage.getItem(ROOM_CODE_KEY)
    const normalized = normalizeRoomCode(raw ?? '')
    if (normalized.length >= 4) return normalized
  } catch {
    /* ignore */
  }
  const fresh = createRoomCode()
  saveRoomCode(fresh)
  return fresh
}

export function saveRoomCode(code: string) {
  const normalized = normalizeRoomCode(code)
  if (normalized.length < 4) return
  try {
    localStorage.setItem(ROOM_CODE_KEY, normalized)
  } catch {
    /* ignore */
  }
}

export function hostPeerId(code: string) {
  return `eyp-${normalizeRoomCode(code)}-h`
}

export function cameraPeerId(code: string) {
  return `eyp-${normalizeRoomCode(code)}-c`
}
