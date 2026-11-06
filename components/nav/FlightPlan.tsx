'use client'

// FlightPlan — the station rail as a flight route. Each station is a stop on
// a hand-drifted trajectory; the stretch already flown is drawn solid, the
// rest dotted, and a probe (a small boat in the sea theme) rides the route
// with the scroll. Hovering or focusing a stop shows the flight time to it;
// clicking flies there. "Set course" opens the nav computer.
//
// Positioning is the parent's job (fixed in the HUD).

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { STATIONS, type StationDef } from '@/lib/tunnel'
import { ROW, eta, routePosition, routeSegments, stopPoint } from './route'
import s from './FlightPlan.module.css'

export function FlightPlan({ stations = STATIONS, activeId, progress, onGo, onSetCourse, className }: {
  stations?: StationDef[]
  activeId: string
  /** journey progress, 0..1 (the same scale as StationDef.t) */
  progress: number
  /** fly to a station; `keyboard` is true when the stop was activated by key */
  onGo: (id: string, keyboard: boolean) => void
  onSetCourse?: () => void
  className?: string
}) {
  const n = stations.length
  const segs = useMemo(() => routeSegments(n), [n])
  const full = useMemo(() => segs.map((d, i) => (i === 0 ? d : d.replace(/^M[^C]*/, ''))).join(' '), [segs])
  const segRefs = useRef<(SVGPathElement | null)[]>([])
  const trailRef = useRef<SVGPathElement>(null)
  const probeRef = useRef<SVGGElement>(null)
  const headingRef = useRef<SVGGElement>(null)
  const startAt = useRef<number[]>([])           // route length where each segment starts
  const [mod, setMod] = useState('⌘K')

  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) setMod('Ctrl K')
  }, [])

  useLayoutEffect(() => {
    let acc = 0
    startAt.current = segRefs.current.map((p) => { const a = acc; acc += p?.getTotalLength() ?? 0; return a })
  }, [segs])

  // Move the probe and the flown trail without re-rendering the stops.
  useLayoutEffect(() => {
    const { seg, f } = routePosition(stations, progress)
    const path = segRefs.current[seg]
    if (!path || !probeRef.current || !headingRef.current || !trailRef.current) return
    const len = path.getTotalLength()
    const at = f * len
    const p = path.getPointAtLength(at)
    const a = path.getPointAtLength(Math.max(0, at - 1))
    const b = path.getPointAtLength(Math.min(len, at + 1))
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
    probeRef.current.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`)
    headingRef.current.setAttribute('transform', `rotate(${angle.toFixed(1)})`)
    trailRef.current.style.strokeDasharray = `${((startAt.current[seg] ?? 0) + at).toFixed(1)} 9999`
  }, [progress, stations])

  const here = stations.findIndex((st) => st.id === activeId)

  return (
    <nav aria-label="Stations" className={`${s.plan} ${className ?? ''}`} style={{ '--rows': n } as CSSProperties}>
      <svg className={s.route} width={40} height={n * ROW} viewBox={`0 0 40 ${n * ROW}`} aria-hidden>
        {segs.map((d, i) => <path key={i} ref={(el) => { segRefs.current[i] = el }} d={d} className={s.measure} />)}
        <path d={full} className={s.ahead} />
        <path ref={trailRef} d={full} className={s.trail} />
        <g ref={probeRef} className={s.probe}>
          {/* the comet points along the route; the boat stays upright */}
          <g ref={headingRef}>
            <path className={s.tail} d="M-16 0 L-3 0" />
            <circle className={s.core} r={3.8} />
          </g>
          <path className={s.boat} transform="scale(1.45)" d="M-5 1.5 L5 1.5 L3 4 L-3.5 4 Z M0.5 1 L0.5 -7 L5 0.5 Z" />
        </g>
      </svg>

      <ol className={s.stops}>
        {stations.map((st, i) => {
          const [x, y] = stopPoint(i)
          const state = i < here ? 'past' : i === here ? 'here' : 'ahead'
          return (
            <li key={st.id} style={{ top: y }}>
              <button
                type="button"
                className={s.stop}
                data-state={state}
                aria-current={state === 'here' ? 'step' : undefined}
                style={{ '--x': `${x}px` } as CSSProperties}
                onClick={(e) => onGo(st.id, e.detail === 0)}
              >
                <span className={s.node} aria-hidden />
                <span className={s.name}>{st.short}</span>
                <span className={`t-data ${s.eta}`} aria-hidden>
                  {state === 'here' ? 'you are here' : `${eta(progress, st.t).toFixed(1)}s`}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {onSetCourse && (
        <button type="button" className={s.course} onClick={onSetCourse} aria-keyshortcuts="Meta+K Control+K">
          <span className={s.space}>Set course</span>
          <span className={s.sea}>Set sail</span>
          <kbd className={s.kbd}>{mod}</kbd>
        </button>
      )}
    </nav>
  )
}
