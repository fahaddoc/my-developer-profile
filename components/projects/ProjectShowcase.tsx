'use client'

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { FaChevronDown, FaMagnifyingGlass, FaXmark } from 'react-icons/fa6'
import { projects, type Project } from '@/data/projects'
import { engineeringDemos } from '@/data/engineering-demos'
import { DRAWER_CLOSE_EVENT, DRAWER_OPEN_EVENT, prefetchDrawer } from '@/components/ui/drawerPrefetch'
import styles from './ProjectShowcase.module.css'

const categories = [
  { id: 'all', label: 'All' },
  { id: 'web', label: 'Web' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'realtime', label: 'Real-time' },
] as const

/** One slide per project, long enough to read the tagline. The short list flips its page with it. */
const AUTOPLAY_MS = 6500
/** How long the browse panel takes to fade out before it unmounts (matches --dur-1). */
const BROWSE_EXIT_MS = 180
/** The row's progress bar ends each slide; the timer is only a fallback if that never fires. */
const FALLBACK_SLACK_MS = 900

const BY_ID = new Map(projects.map((project) => [project.id, project]))

// The count is derived from the data, worded the same way on desktop and mobile.
const DEMO_IDS = new Set(engineeringDemos.map((project) => project.id))
const DEMO_COUNT = projects.filter((project) => DEMO_IDS.has(project.id)).length
const SHIPPED_COUNT = projects.length - DEMO_COUNT
const COUNT_LABEL = `${SHIPPED_COUNT} shipped · ${DEMO_COUNT} ${DEMO_COUNT === 1 ? 'demo' : 'demos'}`

const shortTitle = (project: Project) => project.title.split(' — ')[0]
const categoryLabel = (project: Project) => categories.find((item) => item.id === project.category)?.label

/** Pages of four until the short list has been measured (first client frame only). */
const FALLBACK_PAGE_STARTS = projects.map((_, index) => index).filter((index) => index % 4 === 0)

/** Portrait shots (phone mockups) crop better a little below the top edge. */
function markOrientation(img: HTMLImageElement) {
  if (img.naturalWidth) img.dataset.portrait = img.naturalHeight > img.naturalWidth ? 'true' : 'false'
}
const onShotLoad = (event: SyntheticEvent<HTMLImageElement>) => markOrientation(event.currentTarget)

// Fetch + decode a shot before it is asked for, so a pick never fades in an empty frame.
const warmed = new Set<string>()
function warm(src: string) {
  if (typeof window === 'undefined' || warmed.has(src)) return
  warmed.add(src)
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  img.decode().catch(() => { warmed.delete(src) })
}

function sameStarts(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export const ProjectShowcase = memo(function ProjectShowcase() {
  const [selectedId, setSelectedId] = useState(projects[0].id)
  // The slideshow runs until the visitor drives the gallery themselves; hovering, focus,
  // a hidden tab or an open drawer only pause it, and it resumes where it stopped.
  const [autoplay, setAutoplay] = useState(true)
  const [hoverPaused, setHoverPaused] = useState(false)
  const [focusPaused, setFocusPaused] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [reduced, setReduced] = useState(false)

  // "Browse all": search, filters and the full list stay out of the way until asked for.
  const [browse, setBrowse] = useState(false)
  const [browseMounted, setBrowseMounted] = useState(false)
  const [category, setCategory] = useState<string>('all')
  const [query, setQuery] = useState('')

  const [pageStarts, setPageStarts] = useState<number[]>(FALLBACK_PAGE_STARTS)

  const listRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const exitTimer = useRef(0)
  const focusAfterClose = useRef<'row' | 'toggle' | null>(null)
  // Elapsed time of the current slide, kept across pauses so resuming continues the slide.
  const progress = useRef({ id: projects[0].id, elapsed: 0, since: 0 })

  const pickerId = useId()
  const resultsId = useId()

  const selectedIndex = Math.max(0, projects.findIndex((project) => project.id === selectedId))
  const selected = projects[selectedIndex]

  const slideshow = autoplay && !reduced
  const running = slideshow && !hoverPaused && !focusPaused && !tabHidden && !drawerOpen && !browse

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return projects.filter((project) =>
      (category === 'all' || project.category === category) &&
      `${project.title} ${project.company} ${project.tech.join(' ')}`.toLowerCase().includes(needle),
    )
  }, [category, query])

  // The page of the short list is derived, not stored: it is always the page that holds
  // the project on screen. Pages are packed from measured row heights, so a client name
  // that wraps never pushes a row out of the panel.
  let page = 0
  for (let index = 0; index < pageStarts.length; index++) if (pageStarts[index] <= selectedIndex) page = index
  const pageStart = pageStarts[page] ?? 0
  const pageEnd = pageStarts[page + 1] ?? projects.length
  const visibleProjects = projects.slice(pageStart, pageEnd)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const sync = () => setTabHidden(document.hidden)
    const opened = () => setDrawerOpen(true)
    const closed = () => setDrawerOpen(false)
    sync()
    document.addEventListener('visibilitychange', sync)
    window.addEventListener(DRAWER_OPEN_EVENT, opened)
    window.addEventListener(DRAWER_CLOSE_EVENT, closed)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener(DRAWER_OPEN_EVENT, opened)
      window.removeEventListener(DRAWER_CLOSE_EVENT, closed)
    }
  }, [])

  /** Moves on from slide `fromId`; a no-op if something else already moved the gallery. */
  const advance = useCallback((fromId: string) => {
    setSelectedId((current) => {
      if (current !== fromId) return current
      const index = projects.findIndex((project) => project.id === current)
      return projects[(index + 1) % projects.length].id
    })
  }, [])

  // Pausing banks the elapsed time of the slide; resuming runs only what is left, and a
  // new slide starts from zero. The visible bar's animationend is what normally moves the
  // slide on (it is the clock the visitor sees, and it starts a frame after this effect),
  // so the timer for the remaining time carries a little slack and only covers a bar
  // that never finishes.
  useEffect(() => {
    const state = progress.current
    if (state.id !== selectedId) {
      state.id = selectedId
      state.elapsed = 0
      state.since = 0
    }
    if (!running) return
    state.since = performance.now()
    const timer = window.setTimeout(
      () => advance(selectedId),
      Math.max(0, AUTOPLAY_MS - state.elapsed) + FALLBACK_SLACK_MS,
    )
    return () => {
      window.clearTimeout(timer)
      if (state.id === selectedId && state.since) state.elapsed += performance.now() - state.since
      state.since = 0
    }
  }, [running, selectedId, advance])

  /** Milliseconds already spent on slide `id` (0 for any other slide). */
  const getElapsed = useCallback((id: string) => {
    const state = progress.current
    if (state.id !== id) return 0
    return Math.min(AUTOPLAY_MS, state.elapsed + (state.since ? performance.now() - state.since : 0))
  }, [])

  // Warm the next slide while this one is on screen.
  useEffect(() => {
    if (!slideshow) return
    warm(projects[(selectedIndex + 1) % projects.length].image)
  }, [slideshow, selectedIndex])

  // Pack the short list into pages that fit the panel, from the hidden measuring copy.
  useLayoutEffect(() => {
    const list = listRef.current
    const measure = measureRef.current
    if (!list || !measure) return
    const compute = () => {
      const available = list.clientHeight
      if (available <= 0) return
      const gap = parseFloat(getComputedStyle(measure).rowGap) || 0
      const starts = [0]
      let used = 0
      Array.from(measure.children).forEach((child, index) => {
        const height = (child as HTMLElement).offsetHeight
        if (used > 0 && used + gap + height > available) {
          starts.push(index)
          used = height
        } else {
          used = used > 0 ? used + gap + height : height
        }
      })
      setPageStarts((current) => (sameStarts(current, starts) ? current : starts))
    }
    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(list)
    let live = true
    document.fonts?.ready.then(() => { if (live) compute() })
    return () => {
      live = false
      observer.disconnect()
    }
  }, [])

  // Focus follows the browse panel: into the search field when it opens, back to the
  // list (or the toggle) when it closes.
  useEffect(() => {
    if (browse) {
      searchRef.current?.focus({ preventScroll: true })
      return
    }
    const target = focusAfterClose.current
    focusAfterClose.current = null
    if (!target) return
    const row = target === 'row'
      ? listRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
      : null
    ;(row ?? toggleRef.current)?.focus({ preventScroll: true })
  }, [browse])

  useEffect(() => () => window.clearTimeout(exitTimer.current), [])

  /** Any deliberate use of the controls hands the gallery over to the visitor. */
  const take = useCallback((id: string) => {
    setAutoplay(false)
    setSelectedId(id)
  }, [])

  function openBrowse() {
    window.clearTimeout(exitTimer.current)
    setAutoplay(false)
    setBrowseMounted(true)
    setBrowse(true)
  }

  function closeBrowse(focus: 'row' | 'toggle') {
    focusAfterClose.current = focus
    setBrowse(false)
    window.clearTimeout(exitTimer.current)
    if (reduced) setBrowseMounted(false)
    else exitTimer.current = window.setTimeout(() => setBrowseMounted(false), BROWSE_EXIT_MS)
  }

  function onBrowseKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    closeBrowse('toggle')
  }

  function resetFilters() {
    setQuery('')
    setCategory('all')
    searchRef.current?.focus({ preventScroll: true })
  }

  return (
    <section
      className={styles.showcase}
      aria-label="Project showcase"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={() => setFocusPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusPaused(false)
      }}
    >
      <div className={styles.frame}>
        <header className={styles.head}>
          <h2 className={`t-title ${styles.title}`}>Selected work.</h2>
          <p className={`t-lead ${styles.lead}`}>Shipped products and engineering demos.</p>
        </header>

        <ProjectScreen project={selected} reduced={reduced} />
        <ProjectDetails project={selected} onOpen={() => setAutoplay(false)} />

        <aside className={styles.library} aria-label="All work" inert={browse || undefined}>
          <div className={styles.libraryHead}>
            <h3 className={styles.libraryTitle}>All work</h3>
            <button
              ref={toggleRef}
              type="button"
              className={`t-label ${styles.toggle}`}
              aria-expanded={browse}
              aria-controls={pickerId}
              onClick={openBrowse}
            >
              Browse all
              <FaChevronDown aria-hidden="true" className={styles.toggleIcon} />
            </button>
            <p className={`t-label ${styles.count}`}>{COUNT_LABEL}</p>
          </div>

          <div ref={listRef} className={styles.list}>
            <div key={pageStart} className={`${styles.rows} ${styles.rowsIn}`}>
              {visibleProjects.map((project) => {
                const active = project.id === selectedId
                return (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    active={active}
                    onPick={take}
                    progress={active && slideshow
                      ? <RowProgress key={project.id} id={project.id} running={running} getElapsed={getElapsed} onDone={advance} />
                      : null}
                  />
                )
              })}
            </div>
            {/* Invisible copy of every row: its heights decide how many rows fit per page. */}
            <div ref={measureRef} className={`${styles.rows} ${styles.measure}`} aria-hidden="true">
              {projects.map((project) => <RowBody key={project.id} project={project} measure />)}
            </div>
          </div>
        </aside>

        {browseMounted && (
          <section
            id={pickerId}
            className={styles.picker}
            data-open={browse}
            aria-label="Browse all work"
            onKeyDown={onBrowseKeyDown}
          >
            <div className={styles.pickerHead}>
              <div className={styles.pickerHeading}>
                <h3 className={styles.libraryTitle}>All work</h3>
                <p className={`t-label ${styles.count}`}>{COUNT_LABEL}</p>
              </div>

              <label className={styles.search}>
                <FaMagnifyingGlass aria-hidden="true" className={styles.searchIcon} />
                <input
                  ref={searchRef}
                  type="search"
                  aria-label="Search projects"
                  aria-describedby={resultsId}
                  placeholder="Find a project or technology"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>

              <div className={styles.filters} role="group" aria-label="Project categories">
                {categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.filter}
                    aria-pressed={category === item.id}
                    onClick={() => setCategory(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={styles.close}
                aria-label="Close the project list"
                onClick={() => closeBrowse('toggle')}
              >
                <FaXmark aria-hidden="true" />
              </button>
            </div>

            <p id={resultsId} className="sr-only" role="status">
              {matches.length} {matches.length === 1 ? 'project' : 'projects'}
            </p>

            {matches.length > 0 ? (
              <div className={styles.pickerList} data-lenis-prevent>
                {matches.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    active={project.id === selectedId}
                    onPick={(id) => { take(id); closeBrowse('row') }}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>No matching projects</p>
                <p className={styles.emptyText}>Try a project name or a technology like React or Flutter.</p>
                <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>Show all work</button>
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  )
})

function ProjectRow({
  project,
  active,
  onPick,
  progress = null,
}: {
  project: Project
  active: boolean
  onPick: (id: string) => void
  progress?: ReactNode
}) {
  const prewarm = () => warm(project.image)
  return (
    <button
      type="button"
      className={styles.row}
      aria-pressed={active}
      onClick={() => onPick(project.id)}
      onPointerEnter={prewarm}
      onFocus={prewarm}
    >
      <RowBody project={project} />
      {progress}
    </button>
  )
}

/** Thumb, title + year on the first line, the client on its own line (wraps, never clipped). */
function RowBody({ project, measure = false }: { project: Project; measure?: boolean }) {
  const content = (
    <>
      {measure
        ? <span className={styles.thumb} />
        : <img className={styles.thumb} src={project.image} alt="" loading="lazy" decoding="async" />}
      <span className={styles.rowText}>
        <span className={styles.rowTop}>
          <span className={styles.rowTitle}>{shortTitle(project)}</span>
          <span className={`t-data ${styles.rowYear}`}>{project.year}</span>
        </span>
        <span className={styles.rowClient}>{project.company}</span>
      </span>
    </>
  )
  return measure ? <div className={styles.row}>{content}</div> : content
}

/**
 * The slideshow timer under the active row. It pauses with the slideshow and, if it ever
 * remounts mid-slide, starts from the time already spent (negative delay) instead of zero.
 */
function RowProgress({
  id,
  running,
  getElapsed,
  onDone,
}: {
  id: string
  running: boolean
  getElapsed: (id: string) => number
  onDone: (id: string) => void
}) {
  const [offset] = useState(() => getElapsed(id))
  return (
    <span
      aria-hidden="true"
      className={styles.rowProgress}
      onAnimationEnd={(event) => {
        event.stopPropagation()
        onDone(id)
      }}
      style={{
        animationDuration: `${AUTOPLAY_MS}ms`,
        animationDelay: `${-Math.round(offset)}ms`,
        animationPlayState: running ? 'running' : 'paused',
      }}
    />
  )
}

/**
 * The lit screen. The incoming shot stays invisible until img.decode() resolves, then
 * fades in over the last shot that was fully on screen, which stays underneath until
 * the fade has finished.
 */
function ProjectScreen({ project, reduced }: { project: Project; reduced: boolean }) {
  const [state, setState] = useState<{ current: string; shown: string | null; ready: boolean }>({
    current: project.id,
    shown: null,
    ready: false,
  })
  let view = state
  if (state.current !== project.id) {
    // A shot that had decoded keeps its place as the backdrop; one that never got that far is dropped.
    view = { current: project.id, shown: state.ready ? state.current : state.shown, ready: false }
    setState(view)
  }

  const imgRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    let live = true
    const mark = () => {
      if (!live) return
      markOrientation(img)
      setState((current) => current.current === project.id
        ? { ...current, ready: true, shown: reduced ? project.id : current.shown }
        : current)
    }
    // decode() waits for the load as well; a failed image still lets go of the old shot.
    img.decode().then(mark, mark)
    return () => { live = false }
  }, [project.id, reduced])

  const backdrop = view.shown && view.shown !== view.current ? BY_ID.get(view.shown) : undefined
  const layers = backdrop ? [backdrop, project] : [project]
  const title = shortTitle(project)

  return (
    <figure className={styles.screen}>
      {layers.map((layer) => {
        const isCurrent = layer.id === view.current
        const className = !isCurrent
          ? styles.shotUnder
          : layer.id === view.shown ? styles.shotSettled : styles.shotIn
        return (
          <img
            key={layer.id}
            ref={isCurrent ? imgRef : undefined}
            className={`${styles.shot} ${className}`}
            src={layer.image}
            alt={isCurrent ? `${title}, product screenshot` : ''}
            aria-hidden={isCurrent ? undefined : true}
            decoding="async"
            data-ready={isCurrent ? view.ready : undefined}
            onLoad={onShotLoad}
            onAnimationEnd={isCurrent ? (event) => {
              if (event.target !== event.currentTarget) return
              setState((current) => current.current === layer.id ? { ...current, shown: layer.id } : current)
            } : undefined}
          />
        )
      })}
    </figure>
  )
}

function ProjectDetails({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const category = categoryLabel(project)
  const warmDrawer = () => { void prefetchDrawer() }

  return (
    // The shot and the text never share a box: many thumbnails are posters with their own
    // big title, and an HTML title laid over a cropped poster reads as a ghost of itself.
    <div key={project.id} className={styles.details}>
      <p className={styles.meta}>
        <span>{project.company}</span>
        <span className={styles.metaSep} aria-hidden="true">·</span>
        <span className="t-data">{project.year}</span>
        {category && (
          <>
            <span className={styles.metaSep} aria-hidden="true">·</span>
            <span>{category}</span>
          </>
        )}
      </p>
      <h3 className={styles.projectTitle}>{shortTitle(project)}</h3>
      <p className={styles.tagline}>{project.tagline}</p>
      <p className={styles.tech}>{project.tech.join(' · ')}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn--primary"
          onPointerEnter={warmDrawer}
          onFocus={warmDrawer}
          onClick={() => { onOpen(); window.dispatchEvent(new CustomEvent('project-drawer-open', { detail: project.id })) }}
        >
          Explore case study <span className="btn-arrow" aria-hidden="true">→</span>
        </button>
        {project.githubUrl && (
          <a className="btn btn--ghost" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
            Source code <span className="btn-arrow" aria-hidden="true">↗</span>
          </a>
        )}
        {project.liveUrl && (
          <a className="btn btn--ghost" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
            Visit project <span className="btn-arrow" aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </div>
  )
}
