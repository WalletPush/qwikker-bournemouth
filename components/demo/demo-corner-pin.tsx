'use client'

/**
 * CornerPin — maps a rectangular design onto an arbitrary quadrilateral (the
 * real face of a product in a photo) using a projective transform (homography)
 * expressed as a CSS matrix3d. This is what makes the "printed" artwork follow
 * the exact angle/perspective of the table tent, window cling or counter card,
 * instead of sitting flat on top.
 *
 * Give it the four face corners as fractions (0–1) of the backing image AND the
 * image's measured pixel size. It renders `children` (authored at a fixed BASE
 * width) warped onto that face.
 *
 * IMPORTANT: the size MUST be the real, laid-out size of the backing <img>
 * (measured by the parent once the image has loaded). Self-measuring a wrapper
 * div races the image layout and produced shrunk/offset artwork.
 *
 * Math: classic general 2D projection (basisToPoints / adjugate) — maps the
 * design's own corners to the destination corners.
 */

import { useMemo } from 'react'

type Pt = [number, number]

function adj(m: number[]) {
  return [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ]
}
function multmm(a: number[], b: number[]) {
  const c = new Array(9).fill(0)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0
    for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]
    c[3 * i + j] = s
  }
  return c
}
function multmv(m: number[], v: number[]) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}
function basisToPoints(p1: Pt, p2: Pt, p3: Pt, p4: Pt) {
  const m = [p1[0], p2[0], p3[0], p1[1], p2[1], p3[1], 1, 1, 1]
  const v = multmv(adj(m), [p4[0], p4[1], 1])
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]])
}
function projection(src: [Pt, Pt, Pt, Pt], dst: [Pt, Pt, Pt, Pt]) {
  const s = basisToPoints(src[0], src[1], src[2], src[3])
  const d = basisToPoints(dst[0], dst[1], dst[2], dst[3])
  return multmm(d, adj(s))
}

export function CornerPin({
  corners,
  size,
  base = 360,
  children,
}: {
  /** Face corners as fractions of the backing image (0–1). */
  corners: { tl: Pt; tr: Pt; br: Pt; bl: Pt }
  /** The backing image's REAL laid-out size in px (measured by the parent). */
  size: { w: number; h: number } | null
  /** Authoring width in px for the design (matrix scales it to the face). */
  base?: number
  children: React.ReactNode
}) {
  const style = useMemo<React.CSSProperties>(() => {
    if (!size || !size.w || !size.h) return { opacity: 0, position: 'absolute', left: 0, top: 0 }
    const { w: W, h: H } = size
    const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

    const TL: Pt = [corners.tl[0] * W, corners.tl[1] * H]
    const TR: Pt = [corners.tr[0] * W, corners.tr[1] * H]
    const BR: Pt = [corners.br[0] * W, corners.br[1] * H]
    const BL: Pt = [corners.bl[0] * W, corners.bl[1] * H]

    // Design canvas aspect ≈ the quad's true aspect (min distortion).
    const wAvg = (dist(TL, TR) + dist(BL, BR)) / 2
    const hAvg = (dist(TL, BL) + dist(TR, BR)) / 2
    const eW = base
    const eH = base * (hAvg / Math.max(wAvg, 1))

    const src: [Pt, Pt, Pt, Pt] = [[0, 0], [eW, 0], [0, eH], [eW, eH]]
    const dst: [Pt, Pt, Pt, Pt] = [TL, TR, BL, BR]
    const t = projection(src, dst)
    for (let i = 0; i < 9; i++) t[i] = t[i] / t[8]
    const m = [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]]

    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: eW,
      height: eH,
      transformOrigin: '0 0',
      transform: `matrix3d(${m.join(',')})`,
      opacity: 1,
    }
  }, [corners, base, size])

  return (
    <div className="pointer-events-none absolute inset-0">
      <div style={style}>{children}</div>
    </div>
  )
}
