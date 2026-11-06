// components/type/holo.ts — the zero-gravity motion behind HoloText.
//
// The slow float (a desynchronised drift and roll per glyph) is a CSS
// keyframe on the compositor (HoloText.module.css); it runs while the
// heading is on screen, which this file flags with data-drift. On top of it,
// one rAF loop adds what needs JS:
//   - field: glyphs near a mouse pointer ease away from it, then drift back
//   - inertia: on a fast scroll each glyph trails by its own amount
//   - warp: scroll speed squeezes the variable width axis (Tektur wdth 100→76)
// The loop only runs while there is something to move: a scroll, a mouse
// near a heading, or glyphs still easing home. Otherwise it sleeps, so an
// idle page (and a phone, which has no mouse) costs no main-thread frames.
// Each frame it reads boxes first, then writes transforms, so the page lays
// out at most once per frame, and it only measures glyphs when the mouse is
// within reach of their heading. Everything eases, so motion never snaps.

type Glyph = { el: HTMLElement; lag: number; x: number; y: number; r: number; tf: string }
type Item = { root: HTMLElement; glyphs: Glyph[]; on: boolean; wdth: number; base: number; moved: boolean }

const items = new Set<Item>()
let live = 0                      // items on screen
let raf = 0
let lastT = 0                     // 0: the next frame starts a fresh dt
let lastScroll = 0
let vel = 0                       // smoothed scroll velocity, px/ms
const pointer = { x: -1e5, y: -1e5 }
let listening = false

const FIELD = 150                 // px radius of the pointer field
const PUSH = 16                   // px at the centre of the field
const REST_VEL = 0.002            // px/ms: below this the scroll counts as still
const REST = 0.02                 // px + deg: a glyph this close to home is home

/** A stable pseudo-random in [0, 1) per glyph (its index and the heading's
    glyph count), so a reload drifts the same way. HoloText seeds the CSS
    float phase with it (--r); the scroll lag here uses the same value. */
export function glyphRnd(i: number, n: number) {
  const h = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453
  return h - Math.floor(h)
}

// The scroll position of whatever is scrolling: the window (Lenis drives it
// on desktop) or a scroll container (the phone layout scrolls .mob-scroll).
// A capture-phase listener sees both; switching containers resets the
// baseline so it never reads as a jump.
let pos = 0
let source: EventTarget | null = null
function onScroll(e: Event) {
  const t = e.target
  const next = t === document || t === document.documentElement ? window.scrollY : (t as Element).scrollTop
  if (t !== source) { source = t; lastScroll = next }
  pos = next
  // asleep with nothing on screen: keep the baseline current instead of waking
  if (live) wake(); else if (!raf) lastScroll = pos
}

function onPointer(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  pointer.x = e.clientX
  pointer.y = e.clientY
  if (live) wake()
}
function offPointer() {
  pointer.x = pointer.y = -1e5
  if (live) wake()
}

function setWdth(it: Item, v: number) {
  it.wdth = v
  it.root.style.setProperty('--holo-wdth', v === it.base ? String(v) : v.toFixed(1))
}

function home(it: Item) {
  for (const g of it.glyphs) {
    if (g.x || g.y || g.r) { g.x = g.y = g.r = 0; g.tf = ''; g.el.style.transform = '' }
  }
  it.moved = false
}

function tick(t: number) {
  raf = 0
  const dt = lastT ? Math.min(64, Math.max(4, t - lastT)) : 16
  lastT = t
  vel += ((pos - lastScroll) / dt - vel) * 0.18
  lastScroll = pos
  if (Math.abs(vel) < REST_VEL) vel = 0
  const speed = Math.abs(vel)

  const on = [...items].filter((it) => it.on)
  if (!on.length) { vel = 0; return }

  // read: only a heading the mouse is within reach of has its glyphs measured
  // (a phone has no mouse, so it never reads at all)
  const mouse = pointer.x > -1e4
  const boxes = on.map((it) => {
    if (!mouse) return null
    const rr = it.root.getBoundingClientRect()
    if (pointer.x < rr.left - FIELD || pointer.x > rr.right + FIELD || pointer.y < rr.top - FIELD || pointer.y > rr.bottom + FIELD) return null
    return it.glyphs.map((g) => {
      const r = g.el.getBoundingClientRect()
      return { x: r.left + r.width / 2 - g.x, y: r.top + r.height / 2 - g.y }
    })
  })

  // write
  let busy = speed > 0
  on.forEach((it, k) => {
    if (speed) {
      const wTarget = it.base - Math.min(it.base - 76, speed * 9)
      if (Math.abs(wTarget - it.wdth) > 0.05) setWdth(it, it.wdth + (wTarget - it.wdth) * 0.14)
    } else if (it.wdth !== it.base) {
      if (Math.abs(it.base - it.wdth) > 0.05) { setWdth(it, it.wdth + (it.base - it.wdth) * 0.14); busy = true }
      else setWdth(it, it.base)
    }

    const bx = boxes[k]
    if (bx) busy = true
    else if (!speed && !it.moved) return   // at rest and nothing to ease home
    let moved = false
    it.glyphs.forEach((g, i) => {
      let tx = 0, ty = -vel * g.lag, tr = 0
      const b = bx?.[i]
      if (b) {
        const dx = b.x - pointer.x, dy = b.y - pointer.y
        const d = Math.hypot(dx, dy)
        if (d < FIELD && d > 0.01) {
          const f = (1 - d / FIELD) ** 2 * PUSH
          tx += (dx / d) * f
          ty += (dy / d) * f
          tr += (dx > 0 ? 1 : -1) * f * 0.35
        }
      }
      g.x += (tx - g.x) * 0.09
      g.y += (ty - g.y) * 0.09
      g.r += (tr - g.r) * 0.09
      if (Math.abs(tx) + Math.abs(ty) + Math.abs(tr) < REST && Math.abs(g.x) + Math.abs(g.y) + Math.abs(g.r) < REST) {
        // home: drop the inline transform once, then leave the glyph alone
        if (g.x || g.y || g.r) { g.x = g.y = g.r = 0; g.tf = ''; g.el.style.transform = '' }
        return
      }
      moved = true
      // a glyph held still by a resting mouse rounds to the same string: skip the write
      const tf = `translate3d(${g.x.toFixed(2)}px, ${g.y.toFixed(2)}px, 0) rotate(${g.r.toFixed(2)}deg)`
      if (tf !== g.tf) { g.tf = tf; g.el.style.transform = tf }
    })
    it.moved = moved
    if (moved) busy = true
  })

  if (busy) raf = requestAnimationFrame(tick)
  else vel = 0
}

function wake() {
  if (raf) return
  lastT = 0
  raf = requestAnimationFrame(tick)
}

/** Start the motion on a heading; returns the cleanup. */
export function holo(root: HTMLElement, glyphEls: HTMLElement[], baseWdth = 100) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  if (!listening) {
    pos = lastScroll = window.scrollY
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', offPointer)
    listening = true
  }
  const glyphs: Glyph[] = glyphEls.map((el, i) => ({ el, lag: 2 + glyphRnd(i, glyphEls.length) * 7, x: 0, y: 0, r: 0, tf: '' }))
  const item: Item = { root, glyphs, on: false, wdth: baseWdth, base: baseWdth, moved: false }
  items.add(item)
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting === item.on) return
    item.on = e.isIntersecting
    live += item.on ? 1 : -1
    // the CSS float only runs while the heading is on screen
    root.toggleAttribute('data-drift', item.on)
    if (item.on) { wake(); return }
    // off screen: drop the warp and any trailing offsets, so it never comes back squeezed
    setWdth(item, item.base)
    home(item)
  }, { rootMargin: '80px 0px' })
  io.observe(root)
  return () => {
    io.disconnect()
    if (item.on) live--
    items.delete(item)
    root.removeAttribute('data-drift')
    glyphEls.forEach((el) => { el.style.transform = '' })
  }
}
