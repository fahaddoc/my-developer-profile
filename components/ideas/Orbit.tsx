'use client'

// Orbit — the Work section as a ring of moons. Projects ride a slow 3D ring
// (CSS perspective, one transform per card per frame): the front one is large
// and lit, the far side dims and softens. Drag, swipe, sideways wheel, the
// arrow keys or the buttons spin it. On a phone it flattens into a swipe strip.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MutableRefObject, PointerEvent } from 'react'
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6'
import type { Project } from '@/data/projects'
import { IDEA_PROJECTS, openCaseStudy } from './concepts'
import styles from './Orbit.module.css'

const LIST: Project[] = IDEA_PROJECTS
const N = LIST.length
const TAU = Math.PI * 2
const STEP = TAU / N
/** Ring geometry at full size; all of it scales with the stage (k). PX = drag px per card,
 *  WARP spreads the near side of the ring and packs the far side, PLANET = planet radius. */
const G = { W: 380, RX: 620, RZ: 760, TY: 190, P: 1250, TOP: 150, BOTTOM: 335, PX: 230, WARP: 0.55, PLANET: 118 }
const DRIFT_S = 7
const IDLE_MS = 6000

const mod = (n: number, m: number) => ((n % m) + m) % m
const pad = (n: number) => String(n).padStart(2, '0')
const shortTitle = (p: Project) => p.title.split(' — ')[0]
/** Signed shortest hop around the ring from a to b. */
const hop = (a: number, b: number) => { const d = mod(b - a, N); return d > N / 2 ? d - N : d }

type Api = { step: (d: number) => void; goTo: (i: number) => void; kick: () => void }
type Pause = { hover: boolean; focus: boolean }
interface ViewProps {
  reduced: boolean
  active: number
  pause: MutableRefObject<Pause>
  api: MutableRefObject<Api>
  onActive: (i: number) => void
  onUser: () => void
}
type Drag = { id: number; x0: number; p0: number; lastX: number; lastT: number; v: number; moved: boolean }

function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setMatch(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])
  return match
}

/** Screen path of the ring itself (relative to the stage centre), so the moons ride a visible orbit. */
function orbitPath(from: number, to: number, k: number) {
  const pts: string[] = []
  for (let a = from; a <= to + 1e-6; a += TAU / 120) {
    const c = Math.cos(a)
    const sc = G.P / (G.P + G.RZ * (1 - c))
    pts.push(`${(G.RX * Math.sin(a) * sc * k).toFixed(1)},${((G.TOP + G.TY * c * sc) * k).toFixed(1)}`)
  }
  return `M${pts.join('L')}`
}

function Ring({ reduced, active, pause, api, onActive, onUser }: ViewProps) {
  const stage = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const shades = useRef<(HTMLSpanElement | null)[]>([])
  const cb = useRef({ onActive, onUser })
  const [dims, setDims] = useState({ k: 1, w: 1240 })
  const st = useRef({
    pos: active - 2.4, target: active, u: 0, raf: 0, last: 0, active: -1, drifting: false, lastUser: 0, wheelT: 0, resumeT: 0,
    k: 1, reduced, blur: [] as number[], drag: null as Drag | null,
  })
  const eng = useRef({ user: () => {}, kick: () => {}, goTo: (_i: number) => {} })

  useEffect(() => { cb.current = { onActive, onUser } })
  useEffect(() => { st.current.reduced = reduced; eng.current.kick() }, [reduced])

  useEffect(() => {
    const s = st.current
    const el = stage.current!
    if (s.reduced) s.pos = s.target
    s.lastUser = performance.now() - IDLE_MS + 2400

    const paint = () => {
      const k = s.k
      const front = mod(Math.round(s.drag ? s.pos : s.target), N)
      for (let i = 0; i < N; i++) {
        const card = cards.current[i]
        const shade = shades.current[i]
        if (!card || !shade) continue
        let phi = (i - s.pos) * STEP
        phi -= TAU * Math.round(phi / TAU)
        phi += G.WARP * Math.sin(phi)
        const c = Math.cos(phi)
        const sn = Math.sin(phi)
        const back = (1 - c) / 2
        const lift = 1 + 0.08 * Math.max(0, c) ** 10
        card.style.transform =
          `translate3d(${(G.RX * k * sn).toFixed(1)}px,${(G.TY * k * c).toFixed(1)}px,${(-G.RZ * k * (1 - c)).toFixed(1)}px)` +
          ` rotateY(${(sn * 30).toFixed(2)}deg) scale(${lift.toFixed(3)})`
        // The planet sits at z 50: the far half of the ring passes behind it.
        card.style.zIndex = String(c < 0 ? 1 + Math.round((c + 1) * 40) : 60 + Math.round(c * 40))
        // Only the front moon is fully lit; its neighbours dim fast, the far side sits in shadow.
        const lit = Math.max(0, c) ** 3
        shade.style.opacity = (c >= 0 ? 0.72 * (1 - lit) : 0.72 - 0.1 * c).toFixed(3)
        const blur = c < -0.1 ? Math.round(back * 4) * 0.4 : 0
        if (s.blur[i] !== blur) {
          s.blur[i] = blur
          card.style.filter = blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : 'none'
        }
        card.toggleAttribute('data-front', i === front)
      }
      if (front !== s.active) { s.active = front; cb.current.onActive(front) }
    }

    const tick = (now: number) => {
      const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 1 / 60
      s.last = now
      const p = pause.current
      const drift = !s.reduced && !p.hover && !p.focus && !s.drag && now - s.lastUser > IDLE_MS &&
        document.visibilityState === 'visible' && !document.documentElement.hasAttribute('data-drawer-open')
      if (drift && !s.drifting) s.u = Math.round(s.target)
      if (!drift && s.drifting) s.target = Math.round(s.target)
      s.drifting = drift
      if (drift) {
        // Dwell on each moon, then glide to the next: zero speed at whole positions.
        s.u += dt / DRIFT_S
        const f = s.u - Math.floor(s.u)
        s.target = Math.floor(s.u) + f - Math.sin(TAU * f) / TAU
      }
      if (!s.drag) s.pos = s.reduced ? s.target : s.pos + (s.target - s.pos) * (1 - Math.exp(-dt * 6.5))
      const settled = !drift && !s.drag && Math.abs(s.target - s.pos) < 0.0005
      if (settled) { s.pos = s.target; s.last = 0 }
      paint()
      s.raf = settled ? 0 : requestAnimationFrame(tick)
    }
    const kick = () => { if (!s.raf) s.raf = requestAnimationFrame(tick) }
    const user = () => {
      s.lastUser = performance.now()
      s.drifting = false
      cb.current.onUser()
      window.clearTimeout(s.resumeT)
      s.resumeT = window.setTimeout(kick, IDLE_MS + 80)
    }
    const goTo = (i: number) => { const cur = Math.round(s.target); s.target = cur + hop(cur, i); user(); kick() }
    const step = (d: number) => { if (s.drag) return; s.target = Math.round(s.target) + d; user(); kick() }
    api.current = { step, goTo, kick }
    eng.current = { user, kick, goTo }

    const onWheel = (e: WheelEvent) => {
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
      if (!raw) return
      e.preventDefault()
      s.target += (raw * (e.deltaMode === 1 ? 16 : 1)) / 280
      user()
      kick()
      window.clearTimeout(s.wheelT)
      s.wheelT = window.setTimeout(() => { s.target = Math.round(s.target); kick() }, 140)
    }
    const measure = () => {
      const w = el.clientWidth
      const k = Math.max(0.6, Math.min(1, w / 1240, (window.innerHeight * 0.5) / (G.TOP + G.BOTTOM)))
      s.k = k
      setDims({ k, w })
      paint()
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', measure)
    window.addEventListener('sf:drawer-close', kick)
    document.addEventListener('visibilitychange', kick)
    const first = window.setTimeout(kick, 2500)
    kick()
    return () => {
      ro.disconnect()
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', measure)
      window.removeEventListener('sf:drawer-close', kick)
      document.removeEventListener('visibilitychange', kick)
      window.clearTimeout(first)
      window.clearTimeout(s.wheelT)
      window.clearTimeout(s.resumeT)
      cancelAnimationFrame(s.raf)
      s.raf = 0
    }
  }, [api, pause])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const s = st.current
    s.drag = { id: e.pointerId, x0: e.clientX, p0: s.pos, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current
    const d = s.drag
    if (!d || d.id !== e.pointerId) return
    if (!d.moved) {
      if (Math.abs(e.clientX - d.x0) < 6) return
      d.moved = true
      d.x0 = e.clientX
      d.p0 = s.pos
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.setAttribute('data-dragging', '')
    }
    const dt = Math.max(1, e.timeStamp - d.lastT)
    d.v = d.v * 0.7 + ((e.clientX - d.lastX) / dt) * 0.3
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    s.pos = d.p0 - (e.clientX - d.x0) / (G.PX * s.k)
    s.target = s.pos
    eng.current.user()
    eng.current.kick()
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current
    const d = s.drag
    if (!d || d.id !== e.pointerId) return
    s.drag = null
    e.currentTarget.removeAttribute('data-dragging')
    if (d.moved) {
      const fling = Math.max(-3, Math.min(3, (-d.v / (G.PX * s.k)) * 260))
      s.target = Math.round(s.pos + fling)
      eng.current.user()
      eng.current.kick()
      return
    }
    const card = (e.target as Element).closest<HTMLElement>('[data-i]')
    if (!card) return
    const i = Number(card.dataset.i)
    if (i === s.active && Math.abs(s.target - s.pos) < 0.08) openCaseStudy(LIST[i].id)
    else eng.current.goTo(i)
  }
  const onCancel = () => {
    const s = st.current
    if (!s.drag) return
    s.drag = null
    stage.current?.removeAttribute('data-dragging')
    s.target = Math.round(s.pos)
    eng.current.kick()
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => api.current.step(1),
      ArrowLeft: () => api.current.step(-1),
      Home: () => api.current.goTo(0),
      End: () => api.current.goTo(N - 1),
      Enter: () => openCaseStudy(LIST[st.current.active].id),
    }
    const run = keys[e.key]
    if (run) { e.preventDefault(); run() }
  }

  const { k, w } = dims
  const h = (G.TOP + G.BOTTOM) * k
  const vars = {
    '--cw': `${G.W * k}px`, '--cy': `${G.TOP * k}px`, '--stage-h': `${h}px`, '--pr': `${G.PLANET * k}px`,
    perspective: `${G.P * k}px`,
  } as CSSProperties

  return (
    <div
      ref={stage} className={styles.stage} style={vars} tabIndex={0} role="group"
      aria-roledescription="ring" aria-label="Projects. Left and right arrow keys spin the ring, Enter opens the front project."
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onKeyDown={onKey}
    >
      <svg className={styles.path} viewBox={`${-w / 2} 0 ${w} ${h}`} aria-hidden="true">
        <path className={styles.pathBack} d={orbitPath(Math.PI / 2, (3 * Math.PI) / 2, k)} />
        <path className={styles.pathFront} d={orbitPath(-Math.PI / 2, Math.PI / 2, k)} />
      </svg>
      <div className={styles.planet} aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <circle className={styles.planetBody} cx="50" cy="50" r="49.5" />
          <path className={styles.planetLit} d="M 50 0.5 A 49.5 49.5 0 0 0 50 99.5 A 30 49.5 0 0 1 50 0.5 Z" />
          <path className={styles.planetLimb} d="M 41.7 2.7 A 48 48 0 0 0 10.7 77.5" />
        </svg>
      </div>
      {LIST.map((p, i) => (
        <div key={p.id} data-i={i} className={styles.card} ref={(n) => { cards.current[i] = n }}>
          <span className={styles.lift}>
            <img src={p.image} alt={`${shortTitle(p)} preview`} loading="lazy" decoding="async" draggable={false} />
            <span className={styles.shade} ref={(n) => { shades.current[i] = n }} />
          </span>
        </div>
      ))}
    </div>
  )
}

function Strip({ reduced, active, api, onActive, onUser }: ViewProps) {
  const list = useRef<HTMLUListElement>(null)
  const items = useRef<(HTMLLIElement | null)[]>([])
  const activeRef = useRef(active)
  const want = useRef(active) // where the strip is heading, so quick taps on Next add up
  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    const el = list.current!
    let raf = 0
    let latest = activeRef.current
    const settle = () => { want.current = latest }
    const sync = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2
        let best = 0
        let gap = Infinity
        items.current.forEach((it, i) => {
          const d = it ? Math.abs(it.offsetLeft + it.offsetWidth / 2 - mid) : Infinity
          if (d < gap) { gap = d; best = i }
        })
        latest = best
        onActive(best)
      })
    }
    const goTo = (i: number, instant = false) => {
      want.current = mod(i, N)
      const it = items.current[want.current]
      if (it) el.scrollTo({ left: it.offsetLeft - (el.clientWidth - it.offsetWidth) / 2, behavior: reduced || instant ? 'instant' : 'smooth' })
    }
    api.current = { step: (d) => { onUser(); goTo(want.current + d) }, goTo: (i) => { onUser(); goTo(i) }, kick: () => {} }
    goTo(activeRef.current, true)
    el.addEventListener('scroll', sync, { passive: true })
    el.addEventListener('scrollend', settle)
    el.addEventListener('touchstart', settle, { passive: true })
    return () => {
      el.removeEventListener('scroll', sync)
      el.removeEventListener('scrollend', settle)
      el.removeEventListener('touchstart', settle)
      cancelAnimationFrame(raf)
    }
  }, [api, onActive, onUser, reduced])

  return (
    <ul ref={list} className={styles.strip} aria-label="Projects" onTouchStart={onUser}>
      {LIST.map((p, i) => (
        <li key={p.id} ref={(n) => { items.current[i] = n }} className={styles.slide} data-active={i === active ? '' : undefined}>
          <button
            type="button" className={styles.lift} tabIndex={i === active ? 0 : -1}
            aria-label={i === active ? `Explore case study: ${shortTitle(p)}` : `Show ${shortTitle(p)}`}
            onClick={() => (i === active ? openCaseStudy(p.id) : api.current.goTo(i))}
          >
            <img src={p.image} alt="" loading="lazy" decoding="async" draggable={false} />
          </button>
        </li>
      ))}
    </ul>
  )
}

function Dial({ turn }: { turn: number }) {
  const r = 20
  const at = (t: number) => `${(26 + r * Math.sin(t)).toFixed(2)} ${(26 - r * Math.cos(t)).toFixed(2)}`
  return (
    <div className={styles.dial} aria-hidden="true">
      <svg viewBox="0 0 52 52">
        <circle className={styles.dialRing} cx="26" cy="26" r={r} />
        {LIST.map((p, i) => (
          <line
            key={p.id} className={styles.dialTick}
            x1={26 + 23 * Math.sin(i * STEP)} y1={26 - 23 * Math.cos(i * STEP)}
            x2={26 + 25.5 * Math.sin(i * STEP)} y2={26 - 25.5 * Math.cos(i * STEP)}
          />
        ))}
      </svg>
      <div className={styles.dialArm} style={{ transform: `rotate(${(turn * 360) / N}deg)` }}>
        <svg viewBox="0 0 52 52">
          <path className={styles.dialArc} d={`M ${at(-STEP * 1.6)} A ${r} ${r} 0 0 1 ${at(0)}`} />
          <circle className={styles.dialMoon} cx="26" cy={26 - r} r="3.2" />
        </svg>
      </div>
    </div>
  )
}

export function Orbit() {
  const phone = useMedia('(max-width: 720px)')
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const [active, setActive] = useState(0)
  const [turn, setTurn] = useState(0)
  const [said, setSaid] = useState('')
  const activeRef = useRef(0)
  const userAt = useRef(-Infinity)
  const pause = useRef<Pause>({ hover: false, focus: false })
  const api = useRef<Api>({ step: () => {}, goTo: () => {}, kick: () => {} })

  const onUser = useCallback(() => { userAt.current = performance.now() }, [])
  const onActive = useCallback((i: number) => {
    const prev = activeRef.current
    if (i === prev) return
    activeRef.current = i
    setActive(i)
    setTurn((t) => t + hop(prev, i))
    if (performance.now() - userAt.current < 1500) setSaid(`${shortTitle(LIST[i])}, project ${i + 1} of ${N}`)
  }, [])

  const p = LIST[active]
  const View = phone ? Strip : Ring
  return (
    <section
      className={styles.root} aria-label="Selected work"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') pause.current.hover = true }}
      onPointerLeave={() => { pause.current.hover = false; api.current.kick() }}
      onFocus={(e) => { pause.current.focus = (e.target as Element).matches(':focus-visible') }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { pause.current.focus = false; api.current.kick() }
      }}
    >
      <View reduced={reduced} active={active} pause={pause} api={api} onActive={onActive} onUser={onUser} />
      <div className={styles.console}>
        <div key={p.id} className={styles.copy}>
          <h2 className={`t-title ${styles.title}`}>{shortTitle(p)}</h2>
          <p className={`t-data ${styles.meta}`}>{p.company} · {p.year}</p>
          <p className={`t-lead ${styles.tagline}`}>{p.tagline}</p>
          <ul className={styles.tech} aria-label="Built with">
            {p.tech.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
        <div className={styles.side}>
          <div className={styles.nav}>
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Previous project" onClick={() => { onUser(); api.current.step(-1) }}>
              <FaArrowLeft aria-hidden="true" />
            </button>
            <Dial turn={turn} />
            <p className={`t-data ${styles.count}`}><b>{pad(active + 1)}</b> / {pad(N)}</p>
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Next project" onClick={() => { onUser(); api.current.step(1) }}>
              <FaArrowRight aria-hidden="true" />
            </button>
          </div>
          <div className={styles.actions}>
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
            <button type="button" className="btn btn--primary" onClick={() => openCaseStudy(p.id)}>
              Explore case study <span className="btn-arrow" aria-hidden="true">→</span>
            </button>
          </div>
          {!phone && <p className={styles.hint}>Drag the ring, scroll sideways or use the arrow keys.</p>}
        </div>
      </div>
      <p className={styles.srOnly} aria-live="polite">{said}</p>
    </section>
  )
}
