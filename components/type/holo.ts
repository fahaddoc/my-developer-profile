// components/type/holo.ts — the zero-gravity motion behind HoloText.
//
// One rAF loop for every registered heading, running only while one is on
// screen. Each frame it reads every glyph's box first, then writes every
// transform, so the page lays out once per frame. Per glyph:
//   - float: a slow, desynchronised drift and roll (weightless letters)
//   - field: glyphs near the pointer ease away from it, then drift back
//   - inertia: on a fast scroll each glyph trails by its own amount
// Per heading:
//   - warp: scroll speed squeezes the variable width axis (Tektur wdth 100→76)
// Everything eases toward its target, so motion never snaps.

type Glyph = { el: HTMLElement; ph: number; ax: number; ay: number; ar: number; lag: number; x: number; y: number; r: number }
type Item = { root: HTMLElement; glyphs: Glyph[]; on: boolean; wdth: number; base: number }

const items = new Set<Item>()
let raf = 0
let lastT = 0
let lastScroll = 0
let vel = 0                       // smoothed scroll velocity, px/ms
const pointer = { x: -1e5, y: -1e5 }
let listening = false

const FIELD = 150                 // px radius of the pointer field
const PUSH = 16                   // px at the centre of the field

function scrollPos() {
  const L = (window as unknown as { __lenis?: { scroll: number } }).__lenis
  return L ? L.scroll : window.scrollY
}

function onPointer(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  pointer.x = e.clientX
  pointer.y = e.clientY
}
function offPointer() { pointer.x = pointer.y = -1e5 }

function tick(t: number) {
  const dt = Math.min(64, t - lastT || 16)
  lastT = t
  const sy = scrollPos()
  vel += ((sy - lastScroll) / dt - vel) * 0.18
  lastScroll = sy

  const live = [...items].filter((it) => it.on)
  if (!live.length) { raf = 0; return }

  // read
  const boxes = live.map((it) => it.glyphs.map((g) => {
    const r = g.el.getBoundingClientRect()
    return { x: r.left + r.width / 2 - g.x, y: r.top + r.height / 2 - g.y }
  }))

  // write
  const speed = Math.abs(vel)
  live.forEach((it, k) => {
    const wTarget = it.base - Math.min(it.base - 76, speed * 9)
    if (Math.abs(wTarget - it.wdth) > 0.05) {
      it.wdth += (wTarget - it.wdth) * 0.14
      it.root.style.setProperty('--holo-wdth', it.wdth.toFixed(1))
    }
    it.glyphs.forEach((g, i) => {
      const b = boxes[k][i]
      let tx = Math.sin(t * 0.00062 + g.ph) * g.ax
      let ty = Math.cos(t * 0.00081 + g.ph * 1.31) * g.ay
      let tr = Math.sin(t * 0.00054 + g.ph * 0.7) * g.ar
      const dx = b.x - pointer.x, dy = b.y - pointer.y
      const d = Math.hypot(dx, dy)
      if (d < FIELD && d > 0.01) {
        const f = (1 - d / FIELD) ** 2 * PUSH
        tx += (dx / d) * f
        ty += (dy / d) * f
        tr += (dx > 0 ? 1 : -1) * f * 0.35
      }
      ty -= vel * g.lag
      g.x += (tx - g.x) * 0.09
      g.y += (ty - g.y) * 0.09
      g.r += (tr - g.r) * 0.09
      g.el.style.transform = `translate3d(${g.x.toFixed(2)}px, ${g.y.toFixed(2)}px, 0) rotate(${g.r.toFixed(2)}deg)`
    })
  })
  raf = requestAnimationFrame(tick)
}

function wake() {
  if (raf) return
  lastT = performance.now()
  lastScroll = scrollPos()
  raf = requestAnimationFrame(tick)
}

/** Start the motion on a heading; returns the cleanup. */
export function holo(root: HTMLElement, glyphEls: HTMLElement[], baseWdth = 100) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  if (!listening) {
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', offPointer)
    listening = true
  }
  // a stable pseudo-random per glyph, so a reload drifts the same way
  const glyphs: Glyph[] = glyphEls.map((el, i) => {
    const h = Math.sin((i + 1) * 12.9898 + glyphEls.length * 78.233) * 43758.5453
    const rnd = h - Math.floor(h)
    return { el, ph: rnd * 6.283, ax: 1.2 + rnd * 1.6, ay: 1.6 + (1 - rnd) * 2.2, ar: 0.6 + rnd * 1.1, lag: 2 + rnd * 7, x: 0, y: 0, r: 0 }
  })
  const item: Item = { root, glyphs, on: false, wdth: baseWdth, base: baseWdth }
  items.add(item)
  const io = new IntersectionObserver(([e]) => {
    item.on = e.isIntersecting
    if (item.on) { wake(); return }
    // off screen: drop the warp, so it never comes back squeezed
    item.wdth = item.base
    root.style.removeProperty('--holo-wdth')
  }, { rootMargin: '80px 0px' })
  io.observe(root)
  return () => {
    io.disconnect()
    items.delete(item)
    glyphEls.forEach((el) => { el.style.transform = '' })
  }
}
