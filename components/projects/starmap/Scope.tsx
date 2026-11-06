'use client'

// Scope — the telescope eyepiece the star map opens on a project (a brass
// spyglass in the light theme). Opening is one camera move: the sky dollies in
// on the chosen star (StarMap.module.css, .zoom) while the star's thumbnail
// grows into this lens on the same curve and duration; the view racks focus as
// it lands, then the dossier writes itself in line by line. Closing runs the
// move back, faster, from wherever the lens is (even mid-open). Stepping to
// another star slews the scale ring and swaps the view.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { FaArrowLeft, FaArrowRight, FaXmark } from 'react-icons/fa6'
import type { Project } from '@/data/projects'
import { STARS, seaCoords, skyCoords } from './layout'
import s from './Scope.module.css'

const CAT = { web: 'Web', mobile: 'Mobile', realtime: 'Real-time' } as const
const pad = (n: number) => String(n).padStart(2, '0')

/** The camera curve and timings; StarMap.module.css uses the same (--cam). */
const CAM = 'cubic-bezier(0.32, 0.72, 0, 1)'
const OPEN_MS = 760
const CLOSE_MS = 480

const TICKS = Array.from({ length: 72 }, (_, k) => {
  const a = (k / 72) * Math.PI * 2
  const long = k % 6 === 0
  return { x1: Math.cos(a) * 92, y1: Math.sin(a) * 92, x2: Math.cos(a) * (long ? 84 : 88), y2: Math.sin(a) * (long ? 84 : 88), long }
})

export function Scope({ i, getStar, closing, onClose, onClosed, onStep, onExplore }: {
  i: number
  /** the chosen star's thumbnail; the lens grows out of (and back into) it */
  getStar: () => HTMLElement | null | undefined
  closing: boolean
  onClose: () => void
  onClosed: () => void
  onStep: (d: number) => void
  onExplore: (p: Project) => void
}) {
  const st = STARS[i]
  const p = st.p
  const [stepped, setStepped] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLHeadingElement>(null)
  const starRef = useRef(getStar)
  starRef.current = getStar

  // The lens collapsed onto the star's thumbnail. The lens is measured from
  // layout (offsets), so a lens still mid-animation measures right; the thumb
  // by its centre (the sky zooms about it, so that holds still) and its layout
  // size (not the zoomed one), so the lens lands exactly where the thumbnail
  // reappears.
  const onStar = () => {
    const root = rootRef.current!
    const lens = lensRef.current!
    const r = root.getBoundingClientRect()
    const cx = r.left + lens.offsetLeft + lens.offsetWidth / 2 - root.scrollLeft
    const cy = r.top + lens.offsetTop + lens.offsetHeight / 2 - root.scrollTop
    const thumb = starRef.current()
    if (!thumb) return { transform: 'scale(0.1)', opacity: 0 }
    const t = thumb.getBoundingClientRect()
    const k = Math.max(thumb.offsetWidth / lens.offsetWidth, 0.03)
    return { transform: `translate(${t.left + t.width / 2 - cx}px, ${t.top + t.height / 2 - cy}px) scale(${k})`, opacity: 1 }
  }
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useLayoutEffect(() => {
    headRef.current?.focus({ preventScroll: true })
    if (!reduced()) lensRef.current?.animate([onStar(), { transform: 'none', opacity: 1 }], { duration: OPEN_MS, easing: CAM })
  }, [])

  useEffect(() => {
    if (!closing) return
    const lens = lensRef.current
    if (!lens || reduced()) { onClosed(); return }
    const now = getComputedStyle(lens)
    const from = { transform: now.transform, opacity: now.opacity }
    lens.getAnimations().forEach((a) => a.cancel())
    const anim = lens.animate([from, onStar()], { duration: CLOSE_MS, easing: CAM, fill: 'forwards' })
    anim.onfinish = onClosed
    return () => { anim.onfinish = null }
  }, [closing, onClosed])

  const go = (d: number) => { setStepped(true); onStep(d) }
  const goRef = useRef(go)
  goRef.current = go

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.documentElement.hasAttribute('data-drawer-open')) return
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goRef.current(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goRef.current(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={rootRef}
      className={`${s.scope} ${closing ? s.leaving : ''}`}
      role="dialog"
      aria-label={`${p.title}, through the telescope`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <button type="button" className={`btn btn--ghost btn--icon ${s.close}`} onClick={onClose} aria-label="Close">
        <FaXmark />
      </button>

      <div ref={lensRef} className={s.lens} style={{ '--turn': `${i * 23}deg` } as CSSProperties}>
        <button type="button" className={s.view} onClick={() => onExplore(p)} aria-label={`Explore case study: ${p.title}`}>
          <img key={p.id} className={`${s.shot} ${stepped ? s.slew : s.focus}`} src={p.image} alt="" decoding="async" draggable={false} />
        </button>
        <svg className={s.reticle} viewBox="-100 -100 200 200" aria-hidden>
          <g className={s.ring}>
            {TICKS.map((t, k) => <line key={k} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className={t.long ? s.tickLong : s.tick} />)}
          </g>
          <path className={s.cross} d="M-70 0 H-14 M14 0 H70 M0 -70 V-14 M0 14 V70" />
          <circle className={s.cross} r={5} />
        </svg>
        <span className={`t-data ${s.coords}`} aria-hidden>
          <span className={s.space}>{skyCoords(st)}</span>
          <span className={s.sea}>{seaCoords(st)}</span>
        </span>
      </div>

      <div className={s.info}>
        {/* only the copy swaps per project; the nav stays mounted so it keeps focus */}
        <div key={p.id} className={`${s.copy} ${stepped ? s.swap : s.write}`}>
          <p className={`t-label ${s.kind}`}>
            {st.demo ? 'Lab demo' : st.mag === 2 ? 'Featured · shipped' : 'Shipped'} · {CAT[p.category]}
          </p>
          <h3 ref={headRef} tabIndex={-1} className={`t-title ${s.title}`}>{p.title.replace(' — ', '\u00a0— ')}</h3>
          <p className={`t-data ${s.meta}`}>{p.company} · {p.year}</p>
          <p className={s.tagline}>{p.tagline}</p>
          <p className={s.tech}>{p.tech.join(', ')}</p>
          <div className={s.actions}>
            <button type="button" className="btn btn--primary" onClick={() => onExplore(p)}>
              Explore case study <span className="btn-arrow" aria-hidden="true">→</span>
            </button>
            {p.liveUrl ? (
              <a className="btn btn--ghost" href={p.liveUrl} target="_blank" rel="noreferrer">
                Visit project <span className="btn-arrow" aria-hidden="true">↗</span>
              </a>
            ) : p.githubUrl ? (
              <a className="btn btn--ghost" href={p.githubUrl} target="_blank" rel="noreferrer">
                Source <span className="btn-arrow" aria-hidden="true">↗</span>
              </a>
            ) : null}
          </div>
        </div>
        <div className={`${s.nav} ${stepped ? '' : s.navIn}`}>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => go(-1)} aria-label="Previous project">
            <FaArrowLeft />
          </button>
          <span className={`t-data ${s.count}`}>{pad(i + 1)} / {STARS.length}</span>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => go(1)} aria-label="Next project">
            <FaArrowRight />
          </button>
          <button type="button" className={`btn btn--ghost btn--sm ${s.back}`} onClick={onClose}>
            <span className={s.space}>Back to the sky</span>
            <span className={s.sea}>Back to the chart</span>
          </button>
        </div>
      </div>
    </div>
  )
}
