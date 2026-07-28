/** Guide shapes in local layer coords (0..100 viewBox). */

export type GuidePoint = { x: number; y: number }

export type GuideShape =
  | {
      id: string
      type: 'line'
      a: GuidePoint
      b: GuidePoint
      stroke?: string
      dash?: boolean
    }
  | {
      id: string
      type: 'rect'
      x: number
      y: number
      w: number
      h: number
      stroke?: string
    }
  | {
      id: string
      type: 'ellipse'
      cx: number
      cy: number
      rx: number
      ry: number
      stroke?: string
    }
  | {
      id: string
      type: 'circle'
      cx: number
      cy: number
      r: number
      stroke?: string
    }

export type GuideDrawTool = 'select' | 'line' | 'rect' | 'ellipse'

export type GuidePresetKind = 'thirds' | 'face' | 'figure' | 'perspective'

const FACE = '#ffd9bd'
const WHITE = '#ffffff'
const PERSPECTIVE = '#c8e4ef'

let shapeSeq = 0
export function newGuideShapeId(prefix = 'gs') {
  shapeSeq += 1
  return `${prefix}-${Date.now().toString(36)}-${shapeSeq}`
}

function line(
  a: GuidePoint,
  b: GuidePoint,
  opts?: { stroke?: string; dash?: boolean },
): GuideShape {
  return {
    id: newGuideShapeId('ln'),
    type: 'line',
    a,
    b,
    stroke: opts?.stroke,
    dash: opts?.dash,
  }
}

function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  stroke = FACE,
): GuideShape {
  return { id: newGuideShapeId('el'), type: 'ellipse', cx, cy, rx, ry, stroke }
}

function circle(cx: number, cy: number, r: number, stroke = FACE): GuideShape {
  return { id: newGuideShapeId('cir'), type: 'circle', cx, cy, r, stroke }
}

/** Preset templates — same geometry as legacy screen overlays, plus perspective. */
export function shapesForPreset(kind: GuidePresetKind): GuideShape[] {
  if (kind === 'thirds') {
    return [
      line({ x: 33.33, y: 0 }, { x: 33.33, y: 100 }, { stroke: WHITE }),
      line({ x: 66.67, y: 0 }, { x: 66.67, y: 100 }, { stroke: WHITE }),
      line({ x: 0, y: 33.33 }, { x: 100, y: 33.33 }, { stroke: WHITE }),
      line({ x: 0, y: 66.67 }, { x: 100, y: 66.67 }, { stroke: WHITE }),
    ]
  }

  if (kind === 'face') {
    return [
      ellipse(52, 40, 17, 23),
      line({ x: 54, y: 17 }, { x: 52, y: 63 }, { stroke: FACE }),
      line({ x: 36, y: 38 }, { x: 68, y: 36 }, { stroke: FACE }),
      line({ x: 40, y: 48 }, { x: 64, y: 48 }, { stroke: FACE, dash: true }),
      line({ x: 42, y: 55 }, { x: 62, y: 55 }, { stroke: FACE, dash: true }),
    ]
  }

  if (kind === 'figure') {
    return [
      line({ x: 50, y: 4 }, { x: 50, y: 96 }, { stroke: FACE }),
      circle(50, 10, 5),
      line({ x: 34, y: 20 }, { x: 66, y: 20 }, { stroke: FACE }),
      line({ x: 34, y: 20 }, { x: 32, y: 48 }, { stroke: FACE }),
      line({ x: 66, y: 20 }, { x: 68, y: 48 }, { stroke: FACE }),
      line({ x: 38, y: 48 }, { x: 62, y: 48 }, { stroke: FACE }),
      line({ x: 42, y: 48 }, { x: 40, y: 92 }, { stroke: FACE }),
      line({ x: 58, y: 48 }, { x: 60, y: 92 }, { stroke: FACE }),
    ]
  }

  // perspective: horizon + 1 vanishing point + rays
  const vp = { x: 72, y: 42 }
  const rays: GuidePoint[] = [
    { x: 0, y: 18 },
    { x: 0, y: 55 },
    { x: 0, y: 88 },
    { x: 100, y: 22 },
    { x: 100, y: 70 },
    { x: 28, y: 100 },
    { x: 58, y: 100 },
  ]
  return [
    line({ x: 0, y: vp.y }, { x: 100, y: vp.y }, { stroke: PERSPECTIVE }),
    circle(vp.x, vp.y, 1.6, PERSPECTIVE),
    ...rays.map((p) => line(vp, p, { stroke: PERSPECTIVE, dash: true })),
  ]
}

export function normalizeGuideShape(raw: unknown): GuideShape | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<GuideShape> & { type?: string }
  const id = typeof s.id === 'string' ? s.id : newGuideShapeId()
  if (s.type === 'line' && s.a && s.b) {
    return {
      id,
      type: 'line',
      a: { x: Number(s.a.x) || 0, y: Number(s.a.y) || 0 },
      b: { x: Number(s.b.x) || 0, y: Number(s.b.y) || 0 },
      stroke: typeof s.stroke === 'string' ? s.stroke : undefined,
      dash: Boolean(s.dash),
    }
  }
  if (s.type === 'rect') {
    return {
      id,
      type: 'rect',
      x: Number(s.x) || 0,
      y: Number(s.y) || 0,
      w: Number(s.w) || 0,
      h: Number(s.h) || 0,
      stroke: typeof s.stroke === 'string' ? s.stroke : undefined,
    }
  }
  if (s.type === 'ellipse') {
    return {
      id,
      type: 'ellipse',
      cx: Number(s.cx) || 0,
      cy: Number(s.cy) || 0,
      rx: Number(s.rx) || 0,
      ry: Number(s.ry) || 0,
      stroke: typeof s.stroke === 'string' ? s.stroke : undefined,
    }
  }
  if (s.type === 'circle') {
    return {
      id,
      type: 'circle',
      cx: Number(s.cx) || 0,
      cy: Number(s.cy) || 0,
      r: Number(s.r) || 0,
      stroke: typeof s.stroke === 'string' ? s.stroke : undefined,
    }
  }
  return null
}

export function hitTestGuideShape(
  shape: GuideShape,
  p: GuidePoint,
  threshold = 2.8,
): boolean {
  if (shape.type === 'line') {
    return distToSegment(p, shape.a, shape.b) <= threshold
  }
  if (shape.type === 'rect') {
    const x0 = Math.min(shape.x, shape.x + shape.w)
    const x1 = Math.max(shape.x, shape.x + shape.w)
    const y0 = Math.min(shape.y, shape.y + shape.h)
    const y1 = Math.max(shape.y, shape.y + shape.h)
    const inside = p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1
    if (inside) {
      const nearEdge =
        Math.min(p.x - x0, x1 - p.x, p.y - y0, y1 - p.y) <= threshold
      return nearEdge || (x1 - x0 < threshold * 3 && y1 - y0 < threshold * 3)
    }
    return false
  }
  if (shape.type === 'ellipse') {
    const nx = (p.x - shape.cx) / Math.max(0.01, shape.rx)
    const ny = (p.y - shape.cy) / Math.max(0.01, shape.ry)
    const d = Math.hypot(nx, ny)
    return Math.abs(d - 1) <= threshold / Math.max(shape.rx, shape.ry, 1)
  }
  const d = Math.hypot(p.x - shape.cx, p.y - shape.cy)
  return Math.abs(d - shape.r) <= threshold
}

function distToSegment(p: GuidePoint, a: GuidePoint, b: GuidePoint) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function draftShapeFromDrag(
  tool: Exclude<GuideDrawTool, 'select'>,
  start: GuidePoint,
  end: GuidePoint,
): GuideShape {
  if (tool === 'line') {
    return line(start, end, { stroke: FACE })
  }
  if (tool === 'rect') {
    return {
      id: newGuideShapeId('rc'),
      type: 'rect',
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      w: Math.abs(end.x - start.x),
      h: Math.abs(end.y - start.y),
      stroke: FACE,
    }
  }
  const rx = Math.abs(end.x - start.x) / 2
  const ry = Math.abs(end.y - start.y) / 2
  return {
    id: newGuideShapeId('el'),
    type: 'ellipse',
    cx: (start.x + end.x) / 2,
    cy: (start.y + end.y) / 2,
    rx: Math.max(0.5, rx),
    ry: Math.max(0.5, ry),
    stroke: FACE,
  }
}
