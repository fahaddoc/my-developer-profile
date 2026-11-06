// components/nav/route.ts — geometry and timing shared by the flight-plan rail
// and the nav computer.

import type { StationDef } from '@/lib/tunnel'

/** Vertical distance between two stops on the rail, px. */
export const ROW = 46

// A slight, irregular sideways drift per stop, so the rail reads as a flown
// trajectory rather than a bulleted list.
const DRIFT = [12, 18, 11, 19, 12, 18, 12, 17]

export function stopPoint(i: number): [number, number] {
  return [DRIFT[i % DRIFT.length], ROW / 2 + i * ROW]
}

/** One smooth (Catmull-Rom) cubic segment per pair of neighbouring stops. */
export function routeSegments(n: number): string[] {
  const p = Array.from({ length: n }, (_, i) => stopPoint(i))
  const at = (i: number) => p[Math.max(0, Math.min(n - 1, i))]
  const r = (v: number) => Math.round(v * 100) / 100
  return Array.from({ length: Math.max(0, n - 1) }, (_, i) => {
    const [x0, y0] = at(i - 1), [x1, y1] = at(i), [x2, y2] = at(i + 1), [x3, y3] = at(i + 2)
    const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6]
    const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6]
    return `M${x1} ${y1} C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${x2} ${y2}`
  })
}

/** Where on the route the journey is: segment index and how far along it. */
export function routePosition(stations: StationDef[], t: number): { seg: number; f: number } {
  const last = stations.length - 1
  if (last < 1 || t <= stations[0].t) return { seg: 0, f: 0 }
  if (t >= stations[last].t) return { seg: last - 1, f: 1 }
  for (let i = 0; i < last; i++) {
    const a = stations[i].t, b = stations[i + 1].t
    if (t <= b) return { seg: i, f: (t - a) / (b - a) }
  }
  return { seg: last - 1, f: 1 }
}

/** Flight time between two points of the journey, seconds. Mirrors the
    duration scrollToStation() in TunnelHUD gives the camera flight. */
export function eta(fromT: number, toT: number) {
  return Math.min(1.4, 0.7 + Math.abs(toT - fromT) * 1.2)
}
