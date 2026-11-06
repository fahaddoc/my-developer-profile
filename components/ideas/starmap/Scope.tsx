'use client'

// Scope — the telescope eyepiece the star map opens on a project (a brass
// spyglass in the light theme). The lens grows out of the chosen star and
// shrinks back into it on close; stepping to the next star slews the scale
// ring and pans the view. The project shot drifts slowly inside the round
// view, as if the telescope were tracking it.

import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { FaArrowLeft, FaArrowRight, FaXmark } from 'react-icons/fa6'
import { openCaseStudy } from '../concepts'
import { STARS, seaCoords, skyCoords } from './layout'
import s from './Scope.module.css'

const CAT = { web: 'Web', mobile: 'Mobile', realtime: 'Real-time' } as const
const pad = (n: number) => String(n).padStart(2, '0')
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'

const TICKS = Array.from({ length: 72 }, (_, k) => {
  const a = (k / 72) * Math.PI * 2
  const long = k % 6 === 0
  return { x1: Math.cos(a) * 92, y1: Math.sin(a) * 92, x2: Math.cos(a) * (long ? 84 : 88), y2: Math.sin(a) * (long ? 84 : 88), long }
})

export function Scope({ i, getStar, closing, onClose, onClosed, onStep }: {
  i: number
  /** the chosen star's button; the lens grows out of (and back into) it */
  getStar: () => HTMLElement | null | undefined
  closing: boolean
  onClose: () => void
  onClosed: () => void
  onStep: (d: number) => void
}) {
  const st = STARS[i]
  const p = st.p
  const rootRef = useRef<HTMLDivElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLHeadingElement>(null)
  const starRef = useRef(getStar)
  starRef.current = getStar

  // The lens collapsed onto its star. Measured from layout (offsets), not from
  // getBoundingClientRect, so a lens still mid-animation measures correctly.
  // The sky zooms about this star, so its centre on screen holds still.
  const onStar = () => {
    const root = rootRef.current!
    const lens = lensRef.current!
    const r = root.getBoundingClientRect()
    const cx = r.left + lens.offsetLeft + lens.offsetWidth / 2 - root.scrollLeft
    const cy = r.top + lens.offsetTop + lens.offsetHeight / 2 - root.scrollTop
    const star = starRef.current()?.getBoundingClientRect()
    const dx = star ? star.left + star.width / 2 - cx : 0
    const dy = star ? star.top + star.height / 2 - cy : 0
    return { transform: `translate(${dx}px, ${dy}px) scale(0.06)`, opacity: 0.3 }
  }
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useLayoutEffect(() => {
    headRef.current?.focus({ preventScroll: true })
    if (!reduced()) lensRef.current?.animate([onStar(), { transform: 'none', opacity: 1 }], { duration: 640, easing: EASE_OUT })
  }, [])

  useEffect(() => {
    if (!closing) return
    const lens = lensRef.current
    if (!lens || reduced()) { onClosed(); return }
    // start from wherever the lens is now (it may still be opening), exit faster than it entered
    const now = getComputedStyle(lens)
    const from = { transform: now.transform, opacity: now.opacity }
    lens.getAnimations().forEach((a) => a.cancel())
    const anim = lens.animate([from, onStar()], { duration: 280, easing: EASE_OUT, fill: 'forwards' })
    anim.onfinish = onClosed
    return () => { anim.onfinish = null }
  }, [closing, onClosed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.documentElement.hasAttribute('data-drawer-open')) return
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onStep(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onStep(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onStep])

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
        <button type="button" className={s.view} onClick={() => openCaseStudy(p.id)} aria-label={`Explore case study: ${p.title}`}>
          <img key={p.id} className={s.shot} src={p.image} alt="" decoding="async" draggable={false} />
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
        <p className={`t-label ${s.kind}`}>
          {st.demo ? 'Lab demo' : st.mag === 2 ? 'Featured · shipped' : 'Shipped'} · {CAT[p.category]}
        </p>
        <h3 key={p.id} ref={headRef} tabIndex={-1} className={`t-title ${s.title}`}>{p.title.replace(' — ', '\u00a0— ')}</h3>
        <p className={`t-data ${s.meta}`}>{p.company} · {p.year}</p>
        <p className={s.tagline}>{p.tagline}</p>
        <p className={s.tech}>{p.tech.join(', ')}</p>
        <div className={s.actions}>
          <button type="button" className="btn btn--primary" onClick={() => openCaseStudy(p.id)}>
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
        <div className={s.nav}>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => onStep(-1)} aria-label="Previous project">
            <FaArrowLeft />
          </button>
          <span className={`t-data ${s.count}`}>{pad(i + 1)} / {STARS.length}</span>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => onStep(1)} aria-label="Next project">
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
