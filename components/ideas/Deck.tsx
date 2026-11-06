'use client'

// Deck — the Work section as a hand of cards. Projects fan out along an arc;
// hovering or focusing a card lifts and straightens it while its neighbours
// make room (pure CSS :has). Picking one flies it to the centre (FLIP, via the
// Web Animations API) where it opens into a detail card; the rest of the hand
// dims and sinks, and stays clickable to swap. Nine cards per hand, paged.
// Under 760px it becomes a pile you swipe through.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent, Ref } from 'react'
import { FaArrowLeft, FaArrowRight, FaXmark } from 'react-icons/fa6'
import type { Project } from '@/data/projects'
import { IDEA_PROJECTS, openCaseStudy } from './concepts'
import s from './Deck.module.css'

// concepts.ts appends the demos to `projects`, which already ends with them:
// keep the first of each id so every card is unique.
const ALL = IDEA_PROJECTS
const N = ALL.length
const HANDS = Math.ceil(N / 9)
const SIZE = Math.ceil(N / HANDS)
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
type Vars = CSSProperties & Record<`--${string}`, string | number>
const short = (t: string) => t.split(' — ')[0]
const two = (v: number) => String(v).padStart(2, '0')
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const drawerOpen = () => document.documentElement.hasAttribute('data-drawer-open')

/** Where an element really sits: centre, unrotated width, rotation. */
function pose(el: HTMLElement, lift = 0) {
  const r = el.getBoundingClientRect()
  const m = new DOMMatrix(getComputedStyle(el).transform)
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 - lift, w: el.offsetWidth * Math.hypot(m.a, m.b), r: (Math.atan2(m.b, m.a) * 180) / Math.PI }
}
type Pose = ReturnType<typeof pose>
function toPose(d: HTMLElement, p: Pose) {
  const b = d.getBoundingClientRect()
  return `translate(${p.x - (b.left + b.width / 2)}px, ${p.y - (b.top + b.height / 2)}px) rotate(${p.r}deg) scale(${p.w / b.width})`
}

function useMedia(q: string) {
  const [match, setMatch] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return match
}

export function Deck() {
  return useMedia('(max-width: 760px)') ? <Pile /> : <Hand />
}

function Actions({ p, className, primaryRef }: { p: Project; className: string; primaryRef?: Ref<HTMLButtonElement> }) {
  return (
    <div className={className}>
      <button ref={primaryRef} type="button" className="btn btn--primary" onClick={() => openCaseStudy(p.id)}>
        Explore case study <span className="btn-arrow" aria-hidden="true">→</span>
      </button>
      {(p.liveUrl || p.githubUrl) && (
        <div className={s.links}>
          {p.liveUrl && (
            <a className="btn btn--ghost btn--sm" href={p.liveUrl} target="_blank" rel="noopener noreferrer">
              Visit project <span className="btn-arrow" aria-hidden="true">↗</span>
            </a>
          )}
          {p.githubUrl && (
            <a className="btn btn--ghost btn--sm" href={p.githubUrl} target="_blank" rel="noopener noreferrer">
              Source <span className="btn-arrow" aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function Details({ p }: { p: Project }) {
  return (
    <>
      <p className={`t-data ${s.dMeta}`}>{p.company} · {p.year}</p>
      <p className={`t-lead ${s.dTag}`}>{p.tagline}</p>
      <p className={s.dTech}>{p.tech.join(' · ')}</p>
    </>
  )
}

/* ─── Desktop: the fanned hand ──────────────────────────────────────────── */

function Hand() {
  const root = useRef<HTMLDivElement>(null)
  const handEl = useRef<HTMLDivElement>(null)
  const detail = useRef<HTMLElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const cards = useRef<(HTMLButtonElement | null)[]>([])
  const from = useRef<Pose | null>(null)
  const focusTo = useRef<number | null>(null)
  const [box, setBox] = useState({ w: 1200, h: 700 })
  const [hand, setHand] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [closing, setClosing] = useState(false)

  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [])

  // Geometry: card size, spacing along the arc, and the vertical rhythm.
  const start = hand * SIZE
  const inHand = ALL.slice(start, start + SIZE)
  const n = inHand.length
  const cw = Math.round(Math.min(232, Math.max(176, box.w * 0.165)))
  const ch = (cw * 2) / 3 + 14 + 62 + 2
  const gap = Math.min(cw * 0.64, (box.w - cw - 270) / Math.max(1, n - 1))
  const step = Math.min(5.5, 40 / Math.max(1, n - 1))
  const arc = (t: number) => t * t * 2.6 * (cw / 200)
  const edge = arc((n - 1) / 2)
  const titleH = Math.min(64, Math.max(40, window.innerWidth * 0.044)) + 48
  const pad = Math.max(16, (box.h - (titleH + 92 + ch + edge + 64)) / 2)
  const handB = pad + 64 + edge
  const vars: Vars = {
    '--cw': `${cw}px`,
    '--pad': `${pad}px`,
    '--hand-b': `${handB}px`,
    '--ctrl-b': `${pad}px`,
    '--sink': `${handB + ch - 86}px`,
    '--dw': `${Math.round(Math.min(700, box.w * 0.9, (box.h - 336) * 1.78))}px`,
  }

  const pick = (gi: number) => {
    if (closing) return
    if (gi === picked) return close()
    const el = cards.current[gi]
    from.current = el ? pose(el) : null
    setHand(Math.floor(gi / SIZE))
    setPicked(gi)
  }

  const close = useCallback(() => {
    if (picked === null || closing) return
    const d = detail.current
    const el = cards.current[picked]
    const done = () => {
      setPicked(null)
      setClosing(false)
      el?.focus({ preventScroll: true })
    }
    if (!d || !el || calm()) return done()
    const sunk = new DOMMatrix(getComputedStyle(handEl.current!).transform).m42
    const to = toPose(d, pose(el, sunk))
    setClosing(true)
    d.animate([{ transform: 'none' }, { transform: to }], { duration: 640, easing: EASE, fill: 'forwards' }).onfinish = done
  }, [picked, closing])

  // FLIP: the detail card is laid out at the centre, then played back from
  // the card it came from.
  useLayoutEffect(() => {
    const d = detail.current
    if (picked === null || !d) return
    const f = from.current
    from.current = null
    primary.current?.focus({ preventScroll: true })
    if (!f || calm()) {
      d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EASE })
      return
    }
    d.animate([{ transform: toPose(d, f) }, { transform: 'none' }], { duration: 680, easing: EASE })
  }, [picked])

  useEffect(() => {
    if (picked === null) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !drawerOpen()) {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picked, close])

  useEffect(() => {
    if (focusTo.current === null) return
    cards.current[focusTo.current]?.focus({ preventScroll: true })
    focusTo.current = null
  }, [hand])

  const turn = (dir: number) => setHand((h) => Math.min(HANDS - 1, Math.max(0, h + dir)))

  const onHandKey = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const k = cards.current.findIndex((c) => c && c === document.activeElement)
    if (!dir || k < 0) return
    e.preventDefault()
    e.stopPropagation()
    const next = k + dir
    if (next >= start && next < start + n) cards.current[next]?.focus()
    else if (next >= 0 && next < N) {
      focusTo.current = next
      setHand(Math.floor(next / SIZE))
    }
  }

  const onDetailKey = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir || picked === null) return
    e.preventDefault()
    pick((picked + dir + N) % N)
  }

  const open = picked !== null && !closing
  const p = picked !== null ? ALL[picked] : null

  return (
    <div ref={root} className={s.root} style={vars} data-open={open}>
      <div className={s.intro} aria-hidden={open}>
        <h2 className={`t-title ${s.introTitle}`}>Pick a card.</h2>
        <p className={`t-lead ${s.introLead}`}>{N} projects, dealt {SIZE} at a time. Hover to look, click one to play it.</p>
      </div>

      {p && <div className={s.scrim} onClick={close} aria-hidden="true" />}

      <div ref={handEl} key={hand} className={s.hand} role="group" aria-label={`Hand ${hand + 1} of ${HANDS}`} onKeyDown={onHandKey}>
        {inHand.map((q, k) => {
          const gi = start + k
          const t = k - (n - 1) / 2
          const style: Vars = { '--x': `${t * gap}px`, '--y': `${arc(t)}px`, '--r': `${t * step}deg`, '--i': k }
          return (
            <button
              key={q.id}
              ref={(el) => { cards.current[gi] = el }}
              type="button"
              className={s.card}
              style={style}
              data-picked={picked === gi}
              aria-label={`${q.title}, ${q.company}, ${q.year}`}
              onClick={() => pick(gi)}
            >
              <img className={s.thumb} src={q.image} alt={`${q.title} preview`} loading="lazy" decoding="async" draggable={false} />
              <span className={s.cap}>
                <span className={`t-subtitle ${s.capTitle}`}>{short(q.title)}</span>
                <span className={`t-data ${s.capMeta}`}>{q.company} · {q.year}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className={s.controls} inert={open}>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => turn(-1)} disabled={hand === 0}>
          <FaArrowLeft size={11} aria-hidden /> Previous hand
        </button>
        <span className={`t-data ${s.count}`} aria-live="polite">Hand {two(hand + 1)} / {two(HANDS)}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => turn(1)} disabled={hand === HANDS - 1}>
          Next hand <FaArrowRight size={11} aria-hidden />
        </button>
      </div>

      {p && (
        <section ref={detail} key={p.id} className={s.detail} aria-label={p.title} onKeyDown={onDetailKey}>
          <img className={s.detailImg} src={p.image} alt={`${p.title} screenshot`} loading="lazy" decoding="async" />
          <div className={s.body}>
            <div>
              <h3 className={`t-subtitle ${s.dTitle}`}>{p.title}</h3>
              <Details p={p} />
            </div>
            <Actions p={p} className={s.actions} primaryRef={primary} />
          </div>
          <button type="button" className={`btn btn--ghost btn--icon ${s.close}`} onClick={close} aria-label="Back to the hand">
            <FaXmark aria-hidden />
          </button>
        </section>
      )}
    </div>
  )
}

/* ─── Narrow screens: a pile you swipe through ─────────────────────────── */

function Pile() {
  const [i, setI] = useState(0)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [fling, setFling] = useState<'' | 'left' | 'right'>('')
  const drag = useRef<{ x: number; y: number; t: number; on: boolean } | null>(null)
  const moved = useRef(false)

  const toss = (dir: 'left' | 'right') => {
    if (fling) return
    if (calm()) {
      setI((v) => (v + 1) % N)
      setDx(0)
      return
    }
    setFling(dir)
    window.setTimeout(() => {
      setI((v) => (v + 1) % N)
      setFling('')
      setDx(0)
    }, 300)
  }
  const back = () => {
    if (!fling) setI((v) => (v - 1 + N) % N)
  }

  const down = (e: PointerEvent) => {
    moved.current = false
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), on: false }
  }
  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    const mx = e.clientX - d.x
    const my = e.clientY - d.y
    if (!d.on) {
      if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) drag.current = null
      if (Math.abs(mx) < 8 || Math.abs(mx) < Math.abs(my)) return
      d.on = true
      moved.current = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDx(mx)
  }
  const up = (e: PointerEvent) => {
    const d = drag.current
    drag.current = null
    setDragging(false)
    if (!d?.on) return
    const mx = e.clientX - d.x
    const speed = Math.abs(mx) / Math.max(1, performance.now() - d.t)
    if (Math.abs(mx) > 90 || speed > 0.6) toss(mx < 0 ? 'left' : 'right')
    else setDx(0)
  }
  const cancel = () => {
    drag.current = null
    setDragging(false)
    setDx(0)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); toss('left') }
    if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
  }

  const stack = [0, 1, 2].map((d) => ALL[(i + d) % N])

  return (
    <div className={s.m} onKeyDown={onKey}>
      <div className={s.pile} role="group" aria-roledescription="card pile" aria-label={`Project ${i + 1} of ${N}`}>
        {stack.map((q, d) => {
          const top = d === 0
          const style: Vars = top ? { '--d': 0, '--dx': `${dx}px`, '--rot': `${dx / 18}deg` } : { '--d': d }
          return (
            <article
              key={q.id}
              className={s.mCard}
              style={style}
              inert={!top}
              aria-hidden={!top}
              data-top={top}
              data-drag={top && dragging}
              data-fling={top ? fling : ''}
              onPointerDown={top ? down : undefined}
              onPointerMove={top ? move : undefined}
              onPointerUp={top ? up : undefined}
              onPointerCancel={top ? cancel : undefined}
              onClickCapture={top ? (e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false } } : undefined}
            >
              <img className={s.mImg} src={q.image} alt={`${q.title} screenshot`} loading="lazy" decoding="async" draggable={false} />
              <div className={s.mBody}>
                <h3 className={`t-subtitle ${s.mTitle}`}>{q.title}</h3>
                <Details p={q} />
                <Actions p={q} className={s.mActions} />
              </div>
            </article>
          )
        })}
      </div>
      <div className={s.mNav}>
        <button type="button" className="btn btn--ghost btn--icon" onClick={back} aria-label="Previous project">
          <FaArrowLeft aria-hidden />
        </button>
        <span className={`t-data ${s.count}`} aria-live="polite">{two(i + 1)} / {two(N)}</span>
        <button type="button" className="btn btn--ghost btn--icon" onClick={() => toss('left')} aria-label="Next project">
          <FaArrowRight aria-hidden />
        </button>
      </div>
      <p className={`t-label ${s.hint}`}>Swipe the top card away for the next one.</p>
    </div>
  )
}
