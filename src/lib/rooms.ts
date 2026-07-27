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

export function hostPeerId(code: string) {
  return `eyp-${normalizeRoomCode(code)}-h`
}

export function cameraPeerId(code: string) {
  return `eyp-${normalizeRoomCode(code)}-c`
}
