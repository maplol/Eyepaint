const HOST_CODE_KEY = 'eyepaint-host-room-code-v1'
const JOIN_CODE_KEY = 'eyepaint-join-room-code-v1'

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

export function roomTopicId(code: string) {
  return `eyepaint-${normalizeRoomCode(code)}`
}

function readCode(key: string) {
  try {
    const normalized = normalizeRoomCode(localStorage.getItem(key) ?? '')
    return normalized.length >= 4 ? normalized : null
  } catch {
    return null
  }
}

function writeCode(key: string, code: string) {
  const normalized = normalizeRoomCode(code)
  if (normalized.length < 4) return
  try {
    localStorage.setItem(key, normalized)
  } catch {
    /* ignore */
  }
}

/** Код, который ПК создал как хост комнаты */
export function loadHostRoomCode() {
  return readCode(HOST_CODE_KEY)
}

export function saveHostRoomCode(code: string) {
  writeCode(HOST_CODE_KEY, code)
}

/** Код, который телефон вводил для подключения */
export function loadJoinRoomCode() {
  return readCode(JOIN_CODE_KEY) ?? ''
}

export function saveJoinRoomCode(code: string) {
  writeCode(JOIN_CODE_KEY, code)
}

export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
