'use client'

// Postcards — every project is a postcard from an island (or from orbit, in the
// dark theme), dealt onto a loose table. Pick one up and it flies to the middle
// and turns over: a short note, the sender, the tech on the "To:" lines and the
// actions. The filter chips gather the cards into a pile and deal them again.
// Phones get a single column of cards that flip in place.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type SyntheticEvent } from 'react'
import { FaArrowLeft, FaArrowRight, FaGlobe, FaMobileScreen, FaRotate, FaTowerBroadcast, FaXmark } from 'react-icons/fa6'
import type { Project } from '@/data/projects'
import { IDEA_PROJECTS, openCaseStudy } from './concepts'
import s from './Postcards.module.css'

type Cat = 'all' | Project['category']
const FILTERS: { id: Cat; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'web', label: 'Web' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'realtime', label: 'Real-time' },
]
const CAT_LABEL = { web: 'Web', mobile: 'Mobile', realtime: 'Live' } as const
const GLYPH = { web: FaGlobe, mobile: FaMobileScreen, realtime: FaTowerBroadcast } as const

/** Card is 40em wide and 29.7em tall (1.2em border, a 16:10 photo, a 5em caption strip). */
const ASPECT = 40 / 29.7
const GATHER_MS = 320
const DEAL_MS = 640
const STAGGER = 26
const TOOLS_H = 64

const CARDS = IDEA_PROJECTS
const COUNTS: Record<Cat, number> = {
  all: CARDS.length,
  web: CARDS.filter((p) => p.category === 'web').length,
  mobile: CARDS.filter((p) => p.category === 'mobile').length,
  realtime: CARDS.filter((p) => p.category === 'realtime').length,
}

const shortTitle = (p: Project) => p.title.split(' — ')[0]
const firstSentence = (text: string) => text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Deterministic 0..1 from the id, so the scatter is the same on every visit. */
function rand(id: string, salt: number) {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

/** A loose grid: pick the column count that gives the biggest cards, then jitter each slot. */
function layout(n: number, W: number, H: number) {
  let best = { c: 1, tw: 0 }
  for (let c = 1; c <= Math.max(1, n); c++) {
    const tw = Math.min((W / c) * 1.06, (H / Math.ceil(n / c)) * 0.98 * ASPECT, 340)
    if (tw > best.tw) best = { c, tw }
  }
  const { c, tw } = best
  const rows = Math.ceil(n / c)
  const cw = W / c
  const ch = H / rows
  const th = tw / ASPECT
  return {
    tw,
    at(i: number, id: string) {
      const row = Math.floor(i / c)
      const inRow = row === rows - 1 ? n - c * (rows - 1) : c
      const x = ((c - inRow) * cw) / 2 + (i % c + 0.5) * cw + (rand(id, 1) - 0.5) * cw * 0.2
      const y = (row + 0.5) * ch + (rand(id, 2) - 0.5) * ch * 0.14
      // Upper rows sit on top of lower ones, so no card hides another one's caption strip.
      const z = (rows - 1 - row) * c + (i % c) + 1
      return { x: clamp(x, tw * 0.48, W - tw * 0.48), y: clamp(y, th * 0.5, H - th * 0.5), r: (rand(id, 3) - 0.5) * 15, z }
    },
  }
}

function markOrientation(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (img.naturalWidth) img.dataset.portrait = img.naturalHeight > img.naturalWidth ? 'true' : 'false'
}

function Stamp({ p }: { p: Project }) {
  const Glyph = GLYPH[p.category]
  return (
    <span className={s.stamp} aria-hidden>
      <span className={s.stampIn}><Glyph /><span className={s.stampLabel}>{CAT_LABEL[p.category]}</span></span>
    </span>
  )
}

function Postmark({ p, where }: { p: Project; where: string }) {
  const arc = `pm-${where}-${p.id}`
  return (
    <svg className={s.postmark} viewBox="0 0 200 120" aria-hidden focusable="false">
      <defs><path id={arc} d="M 60 60 m -39 0 a 39 39 0 1 1 78 0 a 39 39 0 1 1 -78 0" /></defs>
      <circle cx="60" cy="60" r="55" />
      <circle cx="60" cy="60" r="25" />
      <text className={s.pmArc}>
        <textPath href={`#${arc}`} startOffset="1%">
          <tspan className={s.pmDark}>VIA ORBIT · KARACHI · PK ·</tspan>
          <tspan className={s.pmLight}>BY SEA · KARACHI · PK ·</tspan>
        </textPath>
      </text>
      <text className={s.pmYear} x="60" y="67" textAnchor="middle">{p.year}</text>
      {[38, 53, 68, 83].map((y) => <path key={y} d={`M 106 ${y} q 8 -7 16 0 t 16 0 t 16 0 t 16 0 t 16 0`} />)}
    </svg>
  )
}

interface CardProps {
  p: Project
  flipped: boolean
  onHit: () => void
  onTurn?: () => void
  hitLabel: string
}

function Card({ p, flipped, onHit, onTurn, hitLabel }: CardProps) {
  const title = shortTitle(p)
  return (
    <div className={s.flip} data-flipped={flipped}>
      <div className={`${s.face} ${s.front}`} inert={flipped}>
        <div className={s.photo}>
          <img src={p.image} alt={p.title} loading="lazy" decoding="async" draggable={false}
            className={p.image.endsWith('.svg') ? s.svg : undefined} onLoad={markOrientation} />
        </div>
        <div className={s.strip}>
          <span className={s.caption} data-long={title.length > 16} aria-hidden>{title}</span>
          <Stamp p={p} />
          <Postmark p={p} where="f" />
        </div>
        <button type="button" id={`pc-hit-${p.id}`} className={s.hit} aria-label={hitLabel} onClick={onHit} />
      </div>
      <div className={`${s.face} ${s.back}`} inert={!flipped} role="group" aria-label={`${p.title}, back of the postcard`}>
        <div className={s.note}>
          <h3 className={`t-subtitle ${s.title}`}>{p.title}</h3>
          <p className={s.tagline}>{p.tagline}</p>
          <p className={s.desc}>{firstSentence(p.description)}</p>
          <p className={s.sign} aria-hidden>Shah</p>
          <div className={s.actions}>
            <button type="button" id={`pc-cta-${p.id}`} className="btn btn--primary btn--sm" onClick={() => openCaseStudy(p.id)}>
              Explore case study <span className="btn-arrow" aria-hidden>→</span>
            </button>
            {p.liveUrl && <a className="link-quiet t-label" href={p.liveUrl} target="_blank" rel="noopener noreferrer">Visit project ↗</a>}
            {p.githubUrl && <a className="link-quiet t-label" href={p.githubUrl} target="_blank" rel="noopener noreferrer">Source ↗</a>}
          </div>
        </div>
        <div className={s.address}>
          <div className={s.addrTop}><Postmark p={p} where="b" /></div>
          <p className={s.from}><span className={s.to}>From</span> {p.company} · <span className="t-data">{p.year}</span></p>
          <ul className={s.lines} aria-label="Built with">
            {p.tech.map((t, i) => <li key={t}>{i === 0 && <span className={s.to}>To:</span>}<span>{t}</span></li>)}
          </ul>
        </div>
        {onTurn && (
          <button type="button" className={`btn btn--ghost btn--icon btn--sm ${s.turn}`} aria-label={`Turn ${title} back over`} onClick={onTurn}>
            <FaRotate aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

export function Postcards() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [filter, setFilter] = useState<Cat>('all')
  const [shown, setShown] = useState<Cat>('all')
  const [phase, setPhase] = useState<'gather' | 'deal' | 'idle'>('gather')
  const [selected, setSelected] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [turned, setTurned] = useState<Set<string>>(() => new Set())
  const [reduced, setReduced] = useState(false)
  const timers = useRef<number[]>([])
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }, [])
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: clamp(window.innerHeight * 0.72 - 64, 440, 760) })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimers() }
  }, [])

  const compact = size.w > 0 && size.w < 700
  const visible = useMemo(() => CARDS.filter((p) => shown === 'all' || p.category === shown), [shown])

  // First deal, once the table has a size: the pile appears, then the cards fly to their spots.
  const dealt = useRef(false)
  useEffect(() => {
    if (!size.w || dealt.current) return
    dealt.current = true
    later(() => setPhase('deal'), 120)
    later(() => setPhase('idle'), 120 + DEAL_MS + CARDS.length * STAGGER)
  }, [size.w, later])

  const choose = (cat: Cat) => {
    if (cat === filter) return
    setFilter(cat)
    setSelected(null)
    setFlipped(false)
    clearTimers()
    if (reduced || compact) { setShown(cat); setPhase('idle'); return }
    setPhase('gather')
    later(() => { setShown(cat); setPhase('deal') }, GATHER_MS)
    later(() => setPhase('idle'), GATHER_MS + DEAL_MS + COUNTS[cat] * STAGGER)
  }

  const focusSoon = (id: string, ms: number) => later(() => document.getElementById(id)?.focus({ preventScroll: true }), ms)
  const pick = (id: string) => { setSelected(id); setFlipped(true); focusSoon(`pc-cta-${id}`, reduced ? 0 : 460) }
  const putBack = useCallback(() => {
    if (!selected) return
    const id = selected
    setSelected(null)
    setFlipped(false)
    focusSoon(`pc-hit-${id}`, 40)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps
  const step = useCallback((d: number) => {
    const i = visible.findIndex((p) => p.id === selected)
    if (i < 0) return
    const next = visible[(i + d + visible.length) % visible.length].id
    setSelected(next)
    setFlipped(true)
    focusSoon(`pc-cta-${next}`, reduced ? 0 : 460)
  }, [visible, selected, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (document.documentElement.hasAttribute('data-drawer-open')) return
      if (e.key === 'Escape') { e.preventDefault(); putBack() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, putBack, step])

  // Arrow keys walk the table (or the stack) when nothing is picked up.
  const onTableKey = (e: KeyboardEvent<HTMLElement>) => {
    if (selected || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return
    const id = (e.target as HTMLElement).id
    const i = visible.findIndex((p) => `pc-hit-${p.id}` === id)
    if (i < 0) return
    e.preventDefault()
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    document.getElementById(`pc-hit-${visible[(i + d + visible.length) % visible.length].id}`)?.focus()
  }

  const toggleTurned = (id: string) => setTurned((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const W = size.w
  const H = size.h
  const F = Math.min(680, W * 0.92, (H - TOOLS_H - 8) * ASPECT)
  const FH = F / ASPECT
  const deck = useMemo(() => layout(visible.length, W, H), [visible.length, W, H])
  const scale = deck.tw / F
  const current = selected ? CARDS.find((p) => p.id === selected) : undefined

  return (
    <div ref={rootRef} className={`${s.root} ${compact ? s.compact : ''}`}>
      <div className={s.bar}>
        <div className={s.chips} role="group" aria-label="Filter postcards">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={`${s.chip} t-label`} aria-pressed={filter === f.id} onClick={() => choose(f.id)}>
              {f.label} <span className={`t-data ${s.count}`}>{COUNTS[f.id]}</span>
            </button>
          ))}
        </div>
        <span className={`t-label ${s.hint}`}>{compact ? 'Tap a postcard to turn it over.' : 'Pick a postcard to turn it over.'}</span>
      </div>

      {W > 0 && compact && (
        <ul key={shown} className={s.list} onKeyDown={onTableKey}>
          {visible.map((p, i) => (
            <li key={p.id} className={s.item} style={{ fontSize: W / 40, '--r': `${(rand(p.id, 3) - 0.5) * 2.4}deg`, '--d': `${Math.min(i, 6) * 60}ms` } as CSSProperties}>
              <Card p={p} flipped={turned.has(p.id)} onHit={() => toggleTurned(p.id)} onTurn={() => toggleTurned(p.id)} hitLabel={`${shortTitle(p)}: turn the postcard over`} />
            </li>
          ))}
        </ul>
      )}

      {W > 0 && !compact && (
        <div className={s.board} style={{ height: H }} onKeyDown={onTableKey}>
          {selected && <div className={s.scrim} onClick={putBack} aria-hidden />}
          {CARDS.map((p) => {
            const i = visible.indexOf(p)
            const hidden = i < 0
            const isSel = selected === p.id
            let x = W / 2, y = H / 2, r = (rand(p.id, 4) - 0.5) * 22, k = scale * 0.94, z = hidden ? 0 : CARDS.length - i
            if (isSel) { x = W / 2; y = (H - TOOLS_H) / 2; r = 0; k = 1 }
            else if (!hidden && phase !== 'gather') { const at = deck.at(i, p.id); x = at.x; y = at.y; r = at.r; z = at.z; k = scale }
            const style = {
              width: F,
              fontSize: F / 40,
              transform: `translate3d(${(x - F / 2).toFixed(1)}px, ${(y - FH / 2).toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg) scale(${k.toFixed(4)})`,
              '--r': `${r.toFixed(2)}deg`,
              '--z': z,
              '--d': `${phase === 'deal' && !hidden ? i * STAGGER : 0}ms`,
            } as CSSProperties
            return (
              <div key={p.id} className={s.slot} style={style} data-hidden={hidden} data-selected={isSel}
                data-dim={!!selected && !isSel} inert={hidden || (!!selected && !isSel)}>
                <div className={s.lift}>
                  <Card p={p} flipped={isSel && flipped} hitLabel={isSel ? `Turn ${shortTitle(p)} over` : `${shortTitle(p)}: pick up the postcard`}
                    onHit={() => (isSel ? setFlipped((f) => !f) : pick(p.id))} />
                </div>
              </div>
            )
          })}
          <div className={s.tools} data-on={!!current} inert={!current} role="toolbar" aria-label="Postcard controls">
            <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="Previous postcard" onClick={() => step(-1)}><FaArrowLeft aria-hidden /></button>
            <span className={`t-data ${s.counter}`} aria-live="polite">
              {String(visible.findIndex((p) => p.id === selected) + 1).padStart(2, '0')} / {String(visible.length).padStart(2, '0')}
            </span>
            <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="Next postcard" onClick={() => step(1)}><FaArrowRight aria-hidden /></button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFlipped((f) => !f)}><FaRotate aria-hidden /> Turn over</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={putBack}><FaXmark aria-hidden /> Put back</button>
          </div>
        </div>
      )}
    </div>
  )
}
