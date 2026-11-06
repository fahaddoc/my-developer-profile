// components/mobile/hero/handoff.ts — MobileSpace's hero takes over from the
// server-rendered stand-in (<HeroShell/>) without a visible seam.
//
// The stand-in is a still copy of the same component, painted from the server
// HTML. When the live hero mounts over it (same place, same image request):
//   1. the live hero skips its entrance (the hero is already on screen) and
//      waits, invisible, until its sticker can paint (it comes from the memory
//      cache, so this is usually the same frame, at most HOLD_MAX_MS);
//   2. in one task it takes over the stand-in's state: the HoloText lock-on
//      (data-on, the measured --holo-w) and the time of every running CSS
//      animation (the glyph drift, the birds), finishing entrances the
//      stand-in already played;
//   3. it shows itself and hides the stand-in in that same task, so the swap
//      lands in one frame; app/page.tsx then unmounts the stand-in.
// A scroll before then swaps at once: the live hero must move with its
// scroller.

let release: (() => void) | null = null

/** app/page.tsx: how to remove the stand-in. Returns the unregister. */
export function registerHeroShell(fn: () => void) {
  release = fn
  return () => {
    if (release === fn) release = null
  }
}

/** Remove the stand-in (no-op once it is gone). The live hero calls it after
 *  the swap; the tunnel calls it on mount. */
export function releaseHeroShell() {
  const fn = release
  release = null
  fn?.()
}

/** How long the live hero may wait for its sticker before it swaps anyway. */
const HOLD_MAX_MS = 300

/**
 * Called by the live hero in a layout effect (before its first paint) with its
 * root (.ms-hero). Returns a cleanup.
 */
export function adoptHeroShell(live: HTMLElement): () => void {
  const shell = document.querySelector<HTMLElement>('[data-hero-shell]')
  const from = shell?.querySelector<HTMLElement>('.ms-hero') ?? null
  // Nothing on screen to take over from (desktop widths, where CSS never
  // shows it, or a hero that already took over): the live hero plays its own
  // entrance.
  if (!shell || !from || shell.hidden || shell.getClientRects().length === 0) {
    releaseHeroShell()
    return () => {}
  }

  // The hero is already on screen: reveal its parts at once. data-now is
  // MobileSpace's "shown, no animation" flag (see its reveal rules).
  live.querySelectorAll('[data-reveal], [data-mask]').forEach((el) => {
    el.setAttribute('data-in', '')
    el.setAttribute('data-now', '')
  })

  let done = false
  let timer = 0
  const stop = () => {
    window.clearTimeout(timer)
    document.removeEventListener('scroll', swap, true)
  }
  function swap() {
    if (done) return
    done = true
    stop()
    if (process.env.NODE_ENV !== 'production') warnIfApart(from!, live)
    carryOver(from!, live)
    live.removeAttribute('data-hero-hold')
    shell!.hidden = true
    releaseHeroShell()
  }

  const shownImg = from.querySelector('img')
  const liveImg = live.querySelector('img')
  if (shownImg && liveImg && shownImg.complete && shownImg.naturalWidth > 0) {
    // The stand-in's portrait is on screen: hold the live hero until its own
    // copy is decoded, so the swap never blinks the photo.
    live.setAttribute('data-hero-hold', '')
    liveImg.decode().then(swap, swap)
    timer = window.setTimeout(swap, HOLD_MAX_MS)
    // capture: a scroll container's scroll events do not bubble
    document.addEventListener('scroll', swap, true)
    return () => {
      if (done) return
      done = true
      stop()
      live.removeAttribute('data-hero-hold')
    }
  }

  // The portrait has not painted yet in either copy: nothing to hold for.
  swap()
  return () => {}
}

// Every element of a hero, in document order. The stand-in wraps its <img> in
// a <picture> (so desktop never downloads it); <source> and <picture> are left
// out on both sides so the two lists line up.
function walk(root: HTMLElement): Element[] {
  return [root, ...Array.from(root.querySelectorAll('*'))].filter(
    (el) => el.tagName !== 'PICTURE' && el.tagName !== 'SOURCE',
  )
}

function animKey(a: Animation) {
  if (typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation) return `a:${a.animationName}`
  if (typeof CSSTransition !== 'undefined' && a instanceof CSSTransition) return `t:${a.transitionProperty}`
  return `x:${a.id}`
}

function finishIfFinite(a: Animation) {
  try {
    const end = a.effect?.getComputedTiming().endTime
    if (typeof end === 'number' && Number.isFinite(end)) a.finish()
  } catch {
    /* an animation that cannot finish is left to run */
  }
}

function carryOver(from: HTMLElement, to: HTMLElement) {
  // HoloText: the lock-on brackets are already on, at the measured width.
  // Set before the animations are read, so the brackets never transition in.
  const h1From = from.querySelector<HTMLElement>('h1')
  const h1To = to.querySelector<HTMLElement>('h1')
  if (h1From && h1To) {
    if (h1From.hasAttribute('data-on')) h1To.setAttribute('data-on', '')
    const w = h1From.style.getPropertyValue('--holo-w')
    if (w) h1To.style.setProperty('--holo-w', w)
  }
  if (typeof document.getAnimations !== 'function') return

  const a = walk(from)
  const b = walk(to)
  const aligned = a.length === b.length && a.every((el, i) => el.tagName === b[i].tagName)
  for (let i = 0; i < b.length; i++) {
    const next = b[i].getAnimations()
    if (!next.length) continue
    const prev = aligned ? a[i].getAnimations() : []
    for (const an of next) {
      const twin = prev.find((p) => animKey(p) === animKey(an))
      // Still running on the stand-in: continue from the same time.
      if (twin && twin.currentTime !== null) an.currentTime = twin.currentTime
      // Not running there: an entrance it already finished (the glyphs'
      // settle, the scan, the brackets' transition). Loops keep their phase.
      else finishIfFinite(an)
    }
  }
}

// Development only: the stand-in's frame copies MobileSpace's .ms-st /
// .ms-inner rules (HeroStyles). Say so loudly if the two ever drift apart.
function warnIfApart(from: HTMLElement, to: HTMLElement) {
  for (const sel of ['img', 'h1', '.ms-hero-lead', '.ms-ctas', '.ms-intro-ctl', '.ms-planet']) {
    const p = from.querySelector(sel)?.getBoundingClientRect()
    const n = to.querySelector(sel)?.getBoundingClientRect()
    if (!p || !n) continue
    const d = Math.max(Math.abs(p.x - n.x), Math.abs(p.y - n.y), Math.abs(p.width - n.width), Math.abs(p.height - n.height))
    if (d > 0.5) {
      console.warn(`[hero handoff] the live hero's ${sel} lays out ${d.toFixed(1)}px away from the server-rendered one; keep HeroStyles' .ms-hero-shell frame in sync with MobileSpace's .ms-st / .ms-inner.`)
    }
  }
}
