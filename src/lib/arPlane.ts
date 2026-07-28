/**
 * ArUco plane lock — homography → CSS matrix3d so the photo sits on the paper plane.
 * Dictionary: js-aruco2 ARUCO_4X4_1000 (center ID 0, corners 1–4).
 */

export type ArViewMode = 'free' | 'ar'

export type ArPhase = 'idle' | 'hunting' | 'locked'

export type Point2 = { x: number; y: number }

export type PlaneLock = {
  /** Ordered TL, TR, BR, BL in stage px */
  corners: [Point2, Point2, Point2, Point2]
  /** Homography: marker unit square (0..1)² → stage px (row-major 3×3, h22=1) */
  H: number[]
  /** Right / forward axes in screen space (unit) — for pan mapping */
  axisU: Point2
  axisV: Point2
  /** Marker side length in stage px */
  markerSidePx: number
  /** How many marker-sides wide the photo is on the plane */
  coverFactor: number
  /** Photo aspect width/height */
  aspect: number
  /** Plane UV offset in marker units (0 = centered on marker) */
  u: number
  v: number
  quality: number
  lockedAt: number
  markerId: number
}

export const AR_MARKER = {
  dictionary: 'ARUCO_4X4_1000' as const,
  centerId: 0,
  cornerIds: [1, 2, 3, 4] as const,
  stableFramesNeeded: 8,
  minQuality: 0.55,
  /** Photo covers this many marker sides on the paper */
  defaultCoverFactor: 3.2,
}

export function dist(a: Point2, b: Point2) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function mid(a: Point2, b: Point2): Point2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function normalize(v: Point2): Point2 {
  const len = Math.hypot(v.x, v.y) || 1
  return { x: v.x / len, y: v.y / len }
}

/** Order corners to TL, TR, BR, BL (screen coords, Y down). */
export function orderCornersTLTRBRBL(corners: Point2[]): [Point2, Point2, Point2, Point2] {
  const pts = corners.slice(0, 4)
  if (pts.length < 4) {
    const z = { x: 0, y: 0 }
    return [pts[0] ?? z, pts[1] ?? z, pts[2] ?? z, pts[3] ?? z]
  }
  const c = {
    x: (pts[0]!.x + pts[1]!.x + pts[2]!.x + pts[3]!.x) / 4,
    y: (pts[0]!.y + pts[1]!.y + pts[2]!.y + pts[3]!.y) / 4,
  }
  // Angle from +X, Y-down → sort clockwise starting from top-left-ish
  const sorted = [...pts].sort((a, b) => {
    const aa = Math.atan2(a.y - c.y, a.x - c.x)
    const bb = Math.atan2(b.y - c.y, b.x - c.x)
    return aa - bb
  })
  // Find point with minimal x+y as TL candidate, rotate array to start there
  let best = 0
  let bestScore = Infinity
  for (let i = 0; i < 4; i++) {
    const p = sorted[i]!
    const score = p.x + p.y
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  }
  const ordered = [0, 1, 2, 3].map((i) => sorted[(best + i) % 4]!) as [
    Point2,
    Point2,
    Point2,
    Point2,
  ]
  // Ensure TR is to the right of TL (not BL)
  const tl = ordered[0]
  const a = ordered[1]
  const d = ordered[3]
  if (dist(tl, a) < dist(tl, d) && a.x < d.x) {
    // likely TL, BL, BR, TR — reorder
    return [ordered[0], ordered[3], ordered[2], ordered[1]]
  }
  // Check winding: TR should have larger x than TL on average
  if (ordered[1].x + ordered[2].x < ordered[0].x + ordered[3].x) {
    return [ordered[0], ordered[3], ordered[2], ordered[1]]
  }
  return ordered
}

/**
 * DLT homography from 4 point pairs. Returns row-major 3×3 with H[8]=1.
 * Maps src → dst.
 */
export function findHomography(
  src: [Point2, Point2, Point2, Point2],
  dst: [Point2, Point2, Point2, Point2],
): number[] {
  // Solve for h0..h7 with h8=1 via Gaussian elimination on 8×8
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const s = src[i]!
    const d = dst[i]!
    A.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y])
    b.push(d.x)
    A.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y])
    b.push(d.y)
  }
  const h = solveLinearSystem(A, b)
  return [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!, 1]
}

export function applyHomography(H: number[], p: Point2): Point2 {
  const w = H[6]! * p.x + H[7]! * p.y + H[8]!
  const inv = w !== 0 ? 1 / w : 1
  return {
    x: (H[0]! * p.x + H[1]! * p.y + H[2]!) * inv,
    y: (H[3]! * p.x + H[4]! * p.y + H[5]!) * inv,
  }
}

/** Gaussian elimination for square system Ax=b */
function solveLinearSystem(Ain: number[][], bin: number[]): number[] {
  const n = bin.length
  const M = Ain.map((row, i) => [...row, bin[i]!])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r
    }
    const tmp = M[col]!
    M[col] = M[pivot]!
    M[pivot] = tmp
    const div = M[col]![col]! || 1e-12
    for (let c = col; c <= n; c++) M[col]![c]! /= div
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r]![col]!
      for (let c = col; c <= n; c++) M[r]![c]! -= f * M[col]![c]!
    }
  }
  return M.map((row) => row[n]!)
}

/**
 * CSS matrix3d mapping an element of size (w×h) with origin at its center
 * onto destination quad TL,TR,BR,BL in the same coordinate system as the element parent
 * (stage-center relative px when combined with translate(-50%,-50%) on a centered node).
 */
export function matrix3dFromQuad(
  width: number,
  height: number,
  dst: [Point2, Point2, Point2, Point2],
): string {
  const w2 = width / 2
  const h2 = height / 2
  const src: [Point2, Point2, Point2, Point2] = [
    { x: -w2, y: -h2 },
    { x: w2, y: -h2 },
    { x: w2, y: h2 },
    { x: -w2, y: h2 },
  ]
  const H = findHomography(src, dst)
  // Homography as 3D affine with z=0: map (x,y,0,1)
  // | h0 h1 0 h2 |
  // | h3 h4 0 h5 |
  // | 0  0  1 0  |
  // | h6 h7 0 h8 |
  const m = [
    H[0]!, H[3]!, 0, H[6]!,
    H[1]!, H[4]!, 0, H[7]!,
    0, 0, 1, 0,
    H[2]!, H[5]!, 0, H[8]!,
  ]
  return `matrix3d(${m.map((v) => Number(v.toFixed(6))).join(',')})`
}

/** Destination quad for the photo on the plane (stage abs px). */
export function photoQuadOnPlane(plane: PlaneLock): [Point2, Point2, Point2, Point2] {
  const hw = plane.coverFactor / 2
  const hh = plane.coverFactor / (2 * Math.max(0.2, plane.aspect))
  const u0 = 0.5 + plane.u
  const v0 = 0.5 + plane.v
  const local: [Point2, Point2, Point2, Point2] = [
    { x: u0 - hw, y: v0 - hh },
    { x: u0 + hw, y: v0 - hh },
    { x: u0 + hw, y: v0 + hh },
    { x: u0 - hw, y: v0 + hh },
  ]
  return local.map((p) => applyHomography(plane.H, p)) as [
    Point2,
    Point2,
    Point2,
    Point2,
  ]
}

/** Stage-abs quad → coords relative to stage center (for matrix3d on centered layer). */
export function toStageCentered(
  quad: [Point2, Point2, Point2, Point2],
  stage: { width: number; height: number },
): [Point2, Point2, Point2, Point2] {
  const ox = stage.width / 2
  const oy = stage.height / 2
  return quad.map((p) => ({ x: p.x - ox, y: p.y - oy })) as [
    Point2,
    Point2,
    Point2,
    Point2,
  ]
}

export function buildArPlaneCssTransform(
  plane: PlaneLock,
  stage: { width: number; height: number },
  element: { width: number; height: number },
  flipped: boolean,
): string {
  const absQuad = photoQuadOnPlane(plane)
  const centered = toStageCentered(absQuad, stage)
  const matrix = matrix3dFromQuad(element.width, element.height, centered)
  const flip = flipped ? 'scaleX(-1)' : ''
  return ['translate(-50%, -50%)', matrix, flip].filter(Boolean).join(' ')
}

export function planeLockFromCorners(
  corners: [Point2, Point2, Point2, Point2],
  stage: { width: number; height: number },
  markerId: number,
  quality: number,
  aspect = 1,
): PlaneLock {
  const ordered = orderCornersTLTRBRBL(corners)
  const [tl, tr, br, bl] = ordered

  const unit: [Point2, Point2, Point2, Point2] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ]
  const H = findHomography(unit, ordered)

  const top = dist(tl, tr)
  const bottom = dist(bl, br)
  const left = dist(tl, bl)
  const right = dist(tr, br)
  const markerSidePx = (top + bottom + left + right) / 4

  let axisU = normalize({ x: tr.x - tl.x + br.x - bl.x, y: tr.y - tl.y + br.y - bl.y })
  let axisV = normalize({ x: tl.x - bl.x + tr.x - br.x, y: tl.y - bl.y + tr.y - br.y })
  // V should point toward top of marker (usually up / -Y on screen)
  if (axisV.y > 0) axisV = { x: -axisV.x, y: -axisV.y }
  // Keep U roughly right-handed with V
  const cross = axisU.x * axisV.y - axisU.y * axisV.x
  if (cross > 0) axisU = { x: -axisU.x, y: -axisU.y }

  void stage

  return {
    corners: ordered,
    H,
    axisU,
    axisV,
    markerSidePx,
    coverFactor: AR_MARKER.defaultCoverFactor,
    aspect: Math.max(0.35, aspect),
    u: 0,
    v: 0,
    quality,
    lockedAt: Date.now(),
    markerId,
  }
}

/** Screen drag → UV delta in marker units. */
export function screenDeltaToPlaneOffset(
  dx: number,
  dy: number,
  plane: PlaneLock,
): { du: number; dv: number } {
  const side = plane.markerSidePx || 1
  const du = (dx * plane.axisU.x + dy * plane.axisU.y) / side
  const dv = (dx * plane.axisV.x + dy * plane.axisV.y) / side
  return { du, dv }
}

/** Slide photo on the locked plane (UV only — perspective from H stays correct). */
export function applyPlanePan(plane: PlaneLock, du: number, dv: number): PlaneLock {
  return {
    ...plane,
    u: plane.u + du,
    v: plane.v + dv,
  }
}

export function markerAssetUrl(file: string) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}markers/${file}`
}
