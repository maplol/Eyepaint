/**
 * ArUco plane lock — types + geometry for EYEPAINT AR mode.
 * Dictionary: js-aruco2 ARUCO_4X4_1000 (center ID 0, corners 1–4).
 */

export type ArViewMode = 'free' | 'ar'

export type ArPhase = 'idle' | 'hunting' | 'locked'

export type Point2 = { x: number; y: number }

export type PlaneLock = {
  /** Marker corners in stage/screen px at lock (order TL,TR,BR,BL-ish from detector) */
  corners: [Point2, Point2, Point2, Point2]
  /** Plane basis in screen space: U = right on paper, V = "forward/up" on paper */
  axisU: Point2
  axisV: Point2
  /** Orientation applied to reference at lock */
  rotateX: number
  rotateY: number
  rotation: number
  /** Suggested scale so marker ≈ reference size */
  scale: number
  /** Marker center in stage coords */
  origin: Point2
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

/** Estimate paper orientation + axes from a marker quad in screen space. */
export function planeLockFromCorners(
  corners: [Point2, Point2, Point2, Point2],
  stage: { width: number; height: number },
  markerId: number,
  quality: number,
): PlaneLock {
  const [c0, c1, c2, c3] = corners
  // Detector order is usually clockwise/counter from one corner — build edges from consecutive points
  const e01 = { x: c1.x - c0.x, y: c1.y - c0.y }
  const e03 = { x: c3.x - c0.x, y: c3.y - c0.y }
  const lenU = Math.hypot(e01.x, e01.y) || 1
  const lenV = Math.hypot(e03.x, e03.y) || 1

  // Choose longer edge as "right" (U), the other as forward (V)
  let axisU: Point2
  let axisV: Point2
  if (lenU >= lenV) {
    axisU = normalize(e01)
    axisV = normalize(e03)
  } else {
    axisU = normalize(e03)
    axisV = normalize(e01)
  }

  // Ensure V points roughly "up the page" (negative screen Y feels forward on a desk cam)
  if (axisV.y > 0) {
    axisV = { x: -axisV.x, y: -axisV.y }
  }

  const origin = {
    x: (c0.x + c1.x + c2.x + c3.x) / 4,
    y: (c0.y + c1.y + c2.y + c3.y) / 4,
  }

  const side = (lenU + lenV) / 2
  const rotation = (Math.atan2(axisU.y, axisU.x) * 180) / Math.PI

  // Foreshortening: compare adjacent edge lengths → tilt toward camera
  const ratio = Math.min(lenU, lenV) / Math.max(lenU, lenV)
  const tilt = Math.min(50, Math.max(0, (1 - ratio) * 70))

  // Which axis is foreshortened more → assign rotateX vs rotateY
  const rotateX = lenV < lenU ? tilt : tilt * 0.35
  const rotateY = lenU < lenV ? (axisU.x >= 0 ? -tilt : tilt) : 0

  const scale = Math.min(2.8, Math.max(0.35, (side / Math.min(stage.width, stage.height)) * 2.2))

  return {
    corners,
    axisU,
    axisV,
    rotateX,
    rotateY,
    rotation,
    scale,
    origin: {
      x: origin.x - stage.width / 2,
      y: origin.y - stage.height / 2,
    },
    quality,
    lockedAt: Date.now(),
    markerId,
  }
}

/** Map screen drag (dx,dy) into plane-local offset along locked axes. */
export function screenDeltaToPlaneOffset(
  dx: number,
  dy: number,
  plane: PlaneLock,
): { du: number; dv: number } {
  // Project screen delta onto plane axes (axes are unit vectors in screen space)
  const du = dx * plane.axisU.x + dy * plane.axisU.y
  const dv = dx * plane.axisV.x + dy * plane.axisV.y
  return { du, dv }
}

/**
 * Apply plane-local UV offset to screen x/y while keeping plane orientation.
 * Moving in +V ("up" on paper) advances along the desk — we also nudge rotateX slightly
 * so projection feels like sliding on the plane.
 */
export function applyPlanePan(
  start: { x: number; y: number; rotateX: number },
  du: number,
  dv: number,
  plane: PlaneLock,
): { x: number; y: number; rotateX: number } {
  const x = start.x + plane.axisU.x * du + plane.axisV.x * dv
  const y = start.y + plane.axisU.y * du + plane.axisV.y * dv
  // Small perspective breathe when sliding "forward" on the plane
  const rotateX = Math.min(60, Math.max(-60, start.rotateX - dv * 0.02))
  return { x, y, rotateX }
}

export function markerAssetUrl(file: string) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}markers/${file}`
}
