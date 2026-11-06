'use client'

// MenuDemo — /ideas/menu: the flight-plan rail and the nav computer on a
// stand-in journey. The box below scrolls through the seven stations the way
// the home page does; the rail, ⌘K and the phone dock are the real components
// that would replace the HUD's StationRail and the mobile rail.

import { useCallback, useEffect, useRef, useState } from 'react'
import { STATIONS, nearestStation } from '@/lib/tunnel'
import { FlightPlan } from '@/components/nav/FlightPlan'
import { CourseDock, NavComputer } from '@/components/nav/NavComputer'
import s from './MenuDemo.module.css'

export function MenuDemo() {
  const scroller = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(STATIONS[0].t)
  const [open, setOpen] = useState(false)
  const station = nearestStation(progress)

  // scroll position → journey progress, station by station (like the tunnel)
  const onScroll = () => {
    const el = scroller.current
    const sec = el?.querySelector('section')?.offsetHeight
    if (!el || !sec) return
    const x = el.scrollTop / sec
    const i = Math.min(STATIONS.length - 1, Math.floor(x))
    const next = STATIONS[Math.min(STATIONS.length - 1, i + 1)]
    setProgress(STATIONS[i].t + (next.t - STATIONS[i].t) * Math.min(1, x - i))
  }

  const go = useCallback((id: string) => {
    const el = scroller.current
    const i = STATIONS.findIndex((st) => st.id === id)
    const sec = el?.querySelector('section')?.offsetHeight
    if (!el || i < 0 || !sec) return
    el.scrollTo({ top: i * sec, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={s.demo}>
      <div ref={scroller} className={s.scroller} onScroll={onScroll} tabIndex={0} aria-label="A stand-in for the home page journey">
        {STATIONS.map((st) => (
          <section key={st.id} className={s.sec}>
            <p className={`t-data ${s.num}`}>{st.num}</p>
            <h3 className={`t-title ${s.h}`}>{st.heading.replace('\n', ' ')}</h3>
            <p className={s.sub}>{st.subtitle}</p>
          </section>
        ))}
      </div>

      <FlightPlan className={s.rail} activeId={station.id} progress={progress} onGo={go} onSetCourse={() => setOpen(true)} />
      <CourseDock className={s.dock} station={station} onOpen={() => setOpen(true)} />
      <NavComputer open={open} onClose={() => setOpen(false)} progress={progress} activeId={station.id} onGo={go} />
    </div>
  )
}
