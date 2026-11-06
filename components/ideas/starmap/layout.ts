// components/ideas/starmap/layout.ts — where every project sits on the star
// map. The sky reads left to right as time (2018 → 2026); each category is a
// constellation joined in year order, and the six engineering demos form a
// small cluster ("the lab") at the far right. Positions are hand-placed in a
// 1000 × 560 chart; phones get their own 560 × 1000 chart with time running
// downwards (a straight transpose made labels collide).

import { projects, type Project } from '@/data/projects'
import { engineeringDemos } from '@/data/engineering-demos'

export const W = 1000
export const H = 560

const DEMO_IDS = new Set(engineeringDemos.map((d) => d.id))

// [x, y] in the wide chart (1000 × 560) and in the tall phone chart (560 × 1000)
const POS: Record<string, { wide: [number, number]; tall: [number, number] }> = {
  // web
  leavesystem:     { wide: [95, 300],  tall: [230, 70] },
  khawateen:       { wide: [180, 225], tall: [150, 160] },
  reapagro:        { wide: [222, 335], tall: [300, 195] },
  screening:       { wide: [305, 268], tall: [220, 270] },
  eocean:          { wide: [398, 196], tall: [250, 360] },
  kistpay:         { wide: [492, 288], tall: [200, 470] },
  'as-saqib':      { wide: [728, 214], tall: [180, 650] },
  'agent-shah-3d': { wide: [786, 306], tall: [290, 705] },
  // mobile
  helpers:         { wide: [312, 446], tall: [452, 290] },
  opd:             { wide: [628, 420], tall: [440, 560] },
  // real-time
  konnect:         { wide: [410, 112], tall: [70, 400] },
  // the lab
  voicetrace:      { wide: [902, 142], tall: [140, 830] },
  dealdesk:        { wide: [866, 208], tall: [245, 800] },
  markettrail:     { wide: [930, 244], tall: [360, 815] },
  sprintdock:      { wide: [852, 286], tall: [225, 890] },
  clientlane:      { wide: [912, 316], tall: [340, 900] },
  speakloop:       { wide: [934, 398], tall: [455, 870] },
}

/** Constellation lines (pairs of ids), drawn in this order on load. */
const EDGES: { cat: Project['category']; a: string; b: string }[] = [
  { cat: 'web', a: 'leavesystem', b: 'khawateen' }, { cat: 'web', a: 'leavesystem', b: 'reapagro' },
  { cat: 'web', a: 'khawateen', b: 'screening' }, { cat: 'web', a: 'reapagro', b: 'screening' },
  { cat: 'web', a: 'screening', b: 'eocean' }, { cat: 'web', a: 'eocean', b: 'kistpay' },
  { cat: 'web', a: 'kistpay', b: 'as-saqib' }, { cat: 'web', a: 'as-saqib', b: 'agent-shah-3d' },
  { cat: 'web', a: 'agent-shah-3d', b: 'sprintdock' }, { cat: 'web', a: 'sprintdock', b: 'dealdesk' },
  { cat: 'web', a: 'dealdesk', b: 'markettrail' }, { cat: 'web', a: 'markettrail', b: 'clientlane' },
  { cat: 'web', a: 'clientlane', b: 'sprintdock' },
  { cat: 'mobile', a: 'helpers', b: 'opd' }, { cat: 'mobile', a: 'opd', b: 'speakloop' },
  { cat: 'realtime', a: 'konnect', b: 'voicetrace' },
]

export const LABELS: { id: string; text: string; sea: string; wide: [number, number]; tall: [number, number] }[] = [
  { id: 'web', text: 'Web', sea: 'Web route', wide: [238, 172], tall: [330, 118] },
  { id: 'mobile', text: 'Mobile', sea: 'Mobile route', wide: [470, 470], tall: [470, 248] },
  { id: 'realtime', text: 'Real-time', sea: 'Real-time route', wide: [560, 102], tall: [100, 352] },
  { id: 'lab', text: 'Lab · 6 demos', sea: 'Lab shoals · 6 demos', wide: [893, 462], tall: [300, 962] },
]

/** Year ticks: x along the wide chart, y down the tall one. */
export const YEARS: { year: string; wide: number; tall: number }[] = [
  { year: '2018', wide: 95, tall: 70 }, { year: '2019', wide: 200, tall: 175 }, { year: '2020', wide: 308, tall: 280 },
  { year: '2021', wide: 404, tall: 380 }, { year: '2022', wide: 492, tall: 470 }, { year: '2024', wide: 628, tall: 560 },
  { year: '2026', wide: 757, tall: 680 },
]

export interface Star {
  p: Project
  /** wide-chart position (also drives the sky coordinates) */
  x: number
  y: number
  tall: [number, number]
  demo: boolean
  /** 0 = lab demo, 1 = shipped, 2 = featured */
  mag: 0 | 1 | 2
}

/** Stars in chronological order (oldest first), demos last. */
export const STARS: Star[] = projects
  .filter((p) => POS[p.id])
  .map((p) => ({ p, x: POS[p.id].wide[0], y: POS[p.id].wide[1], tall: POS[p.id].tall, demo: DEMO_IDS.has(p.id), mag: (DEMO_IDS.has(p.id) ? 0 : p.featured ? 2 : 1) as Star['mag'] }))
  .sort((a, b) => Number(a.demo) - Number(b.demo) || Number(a.p.year) - Number(b.p.year) || a.x - b.x)

export const SHIPPED = STARS.filter((s) => !s.demo).length
export const DEMOS = STARS.length - SHIPPED

const INDEX = new Map(STARS.map((s, i) => [s.p.id, i]))
export const LINES = EDGES.filter((e) => INDEX.has(e.a) && INDEX.has(e.b)).map((e) => ({ ...e, i: INDEX.get(e.a)!, j: INDEX.get(e.b)! }))

// "React.js", "React 19" and "React" are the same skill for this purpose.
const norm = (t: string) => t.toLowerCase().replace(/\.js$/, '').replace(/\s+v?\d+$/, '').trim()

/** For each star, the stars sharing at least two technologies (strongest four). */
export const RELATED: number[][] = STARS.map((s, i) => {
  const mine = new Set(s.p.tech.map(norm))
  return STARS
    .map((o, j) => ({ j, n: j === i ? 0 : o.p.tech.filter((t) => mine.has(norm(t))).length }))
    .filter((r) => r.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map((r) => r.j)
})

/** Chart size and a star's point in it, for the wide or the tall (phone) chart. */
export const chart = (tall: boolean) => (tall ? { w: H, h: W } : { w: W, h: H })
export const at = (s: Star, tall: boolean): [number, number] => (tall ? s.tall : [s.x, s.y])

const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0')

/** Sky coordinates for the eyepiece (right ascension / declination). */
export function skyCoords(s: Star) {
  const ra = (s.x / W) * 24
  const dec = 60 - (s.y / H) * 120
  return `RA ${pad(Math.floor(ra))}h ${pad((ra % 1) * 60)}m · Dec ${dec >= 0 ? '+' : '−'}${pad(dec)}°`
}

/** The same point read as a sea chart position (latitude / longitude). */
export function seaCoords(s: Star) {
  const lat = 38 - (s.y / H) * 30
  const lon = 52 + (s.x / W) * 30
  return `${pad(lat)}°${pad((lat % 1) * 60)}′ N · ${pad(lon)}°${pad((lon % 1) * 60)}′ E`
}
