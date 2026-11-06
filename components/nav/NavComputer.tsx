'use client'

// NavComputer — "Set course" (⌘K / Ctrl K): a command palette dressed as a
// ship's nav computer. Destinations are the stations, each with the real
// flight time from where you are; below them, the few things people come for
// (résumé, email, the other theme, the intro). Type to filter, arrows to
// move, Enter to go. A native <dialog>, so focus and Escape behave; on phones
// it docks to the bottom as a sheet. CourseDock is the phone's way in.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { STATIONS, type StationDef } from '@/lib/tunnel'
import { AUTHOR } from '@/lib/seo/site'
import { useTheme } from '@/components/providers/ThemeProvider'
import { eta } from './route'
import s from './NavComputer.module.css'

interface Item {
  id: string
  group: 'Destinations' | 'Actions'
  num?: string
  title: string
  sub: string
  meta: string
  run: () => void
}

/** Follow a link the same way a click on <a> would (keeps download/mailto). */
function follow(href: string, download = false) {
  const a = document.createElement('a')
  a.href = href
  if (download) a.download = ''
  if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noreferrer' }
  a.click()
}

export function NavComputer({ open, onClose, progress, activeId, onGo, onPlayIntro, showEta = true, stations = STATIONS }: {
  open: boolean
  onClose: () => void
  progress: number
  activeId: string
  onGo: (id: string) => void
  onPlayIntro?: () => void
  /** flight times only mean something where the camera flies (the tunnel) */
  showEta?: boolean
  stations?: StationDef[]
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const listId = useId()
  const { theme, toggle } = useTheme()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const here = stations.find((st) => st.id === activeId) ?? stations[0]

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setQ('')
      // start on the next stop, the most likely destination
      setSel(Math.min(stations.length - 1, stations.indexOf(here) + 1))
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open, here, stations])

  const items = useMemo<Item[]>(() => [
    ...stations.map((st) => ({
      id: st.id,
      group: 'Destinations' as const,
      num: st.num,
      title: st.short,
      sub: st.subtitle,
      meta: st.id === activeId ? 'here' : showEta ? `${eta(progress, st.t).toFixed(1)}s` : '',
      run: () => onGo(st.id),
    })),
    { id: 'resume', group: 'Actions', title: 'Résumé', sub: 'One page, PDF', meta: '↓', run: () => follow('/Shah_Fahad_Resume.pdf', true) },
    { id: 'email', group: 'Actions', title: 'Email', sub: AUTHOR.email, meta: '↗', run: () => follow(`mailto:${AUTHOR.email}`) },
    {
      id: 'theme', group: 'Actions',
      title: theme === 'dark' ? 'Sail the sea instead' : 'Fly through space instead',
      sub: theme === 'dark' ? 'Light theme' : 'Dark theme', meta: '◐', run: toggle,
    },
    ...(onPlayIntro ? [{ id: 'intro', group: 'Actions' as const, title: 'Play intro', sub: 'The video hello', meta: '▶', run: onPlayIntro }] : []),
  ], [stations, activeId, progress, showEta, onGo, theme, toggle, onPlayIntro])

  const query = q.trim().toLowerCase()
  const shown = query ? items.filter((it) => `${it.num ?? ''} ${it.title} ${it.sub}`.toLowerCase().includes(query)) : items
  const at = Math.min(sel, Math.max(0, shown.length - 1))

  const run = (it: Item | undefined) => {
    if (!it) return
    onClose()
    it.run()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const d = e.key === 'ArrowDown' ? 1 : -1
      setSel((at + d + shown.length) % Math.max(1, shown.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(shown[at])
    }
  }

  // keep the selected row in view while arrowing through a short list
  useEffect(() => {
    document.getElementById(`${listId}-${at}`)?.scrollIntoView({ block: 'nearest' })
  }, [at, listId])

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-label="Set course"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={s.panel}>
        <header className={s.head}>
          <span className={s.title}>
            <span className={s.space}>Set course</span>
            <span className={s.sea}>Chart a course</span>
          </span>
          <span className={`t-data ${s.from}`}>from {here.num} · {here.short}</span>
        </header>

        <input
          className={s.input}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={shown.length ? `${listId}-${at}` : undefined}
          aria-autocomplete="list"
          placeholder="Where to?"
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0) }}
          onKeyDown={onKey}
          autoFocus
        />

        <ul id={listId} role="listbox" aria-label="Destinations and actions" className={s.list}>
          {shown.map((it, k) => (
            <li key={it.id} role="presentation">
              {(k === 0 || shown[k - 1].group !== it.group) && <span className={`t-label ${s.group}`} aria-hidden>{it.group}</span>}
              <div
                id={`${listId}-${k}`}
                role="option"
                aria-selected={k === at}
                className={s.row}
                data-here={it.meta === 'here' ? '' : undefined}
                onPointerMove={() => { if (k !== at) setSel(k) }}
                onClick={() => run(it)}
              >
                <span className={`t-data ${s.num}`}>{it.num ?? ''}</span>
                <span className={s.text}>
                  <span className={s.rowTitle}>{it.title}</span>
                  <span className={s.sub}>{it.sub}</span>
                </span>
                <span className={`t-data ${s.meta}`}>{it.meta}</span>
              </div>
            </li>
          ))}
          {!shown.length && <li className={s.empty}>No such place. Try “work” or “email”.</li>}
        </ul>

        <footer className={`t-data ${s.foot}`} aria-hidden>
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> go</span>
          <span><kbd>esc</kbd> close</span>
        </footer>
      </div>
    </dialog>
  )
}

/** The phone's way into the nav computer: a pill at the bottom of the screen. */
export function CourseDock({ station, onOpen, className }: { station: StationDef; onOpen: () => void; className?: string }) {
  return (
    <button type="button" className={`${s.dock} ${className ?? ''}`} onClick={onOpen} aria-label={`At ${station.short}. Set course`}>
      <span className={s.dockStar} aria-hidden />
      <span className="t-data">{station.num}</span>
      <span className={s.dockName}>{station.short}</span>
      <span className={s.dockCta}>
        <span className={s.space}>Set course</span>
        <span className={s.sea}>Chart a course</span>
      </span>
    </button>
  )
}
