'use client'

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { FaArrowLeftLong, FaArrowRightLong, FaMagnifyingGlass } from 'react-icons/fa6'
import { projects, type Project } from '@/data/projects'
import styles from './ProjectShowcase.module.css'

const categories = [
  { id: 'all', label: 'All' },
  { id: 'web', label: 'Web' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'realtime', label: 'Real-time' },
] as const
const PAGE_SIZE = 5
/** One slide per project, long enough to read the tagline. The library page flips with it. */
const AUTOPLAY_MS = 6500

const shortTitle = (project: Project) => project.title.split(' — ')[0]
const pad = (value: number) => String(value).padStart(2, '0')

/** Portrait shots (phone mockups) crop better a little below the top edge. */
function markOrientation(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  img.dataset.portrait = img.naturalHeight > img.naturalWidth ? 'true' : 'false'
}

export function ProjectShowcase() {
  const [category, setCategory] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(projects[0].id)
  // The slideshow runs until the visitor drives the gallery themselves; hovering
  // only pauses it, so reading a project never costs you the project.
  const [autoplay, setAutoplay] = useState(true)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  // Bumped every time the timer (re)starts so the progress line can restart with it.
  const [cycle, setCycle] = useState(0)

  const matches = useMemo(
    () => projects.filter((project) =>
      (category === 'all' || project.category === category) &&
      `${project.title} ${project.company} ${project.tech.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
    [category, query],
  )

  // `page` is derived, not stored: the selected project is always the one on screen,
  // so the page that contains it is the page to show.
  const selectedIndex = Math.max(0, matches.findIndex((project) => project.id === selectedId))
  const page = Math.floor(selectedIndex / PAGE_SIZE)
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const visibleProjects = matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const selected = matches[selectedIndex]

  const slideshow = autoplay && !reduced && matches.length > 1
  const running = slideshow && !paused

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!running) return
    setCycle((value) => value + 1)
    const timer = window.setInterval(() => {
      setSelectedId((current) => {
        const index = matches.findIndex((project) => project.id === current)
        return matches[(index + 1) % matches.length].id
      })
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
    // Deliberately not keyed on `selectedId`: the timer keeps its own steady cadence.
  }, [running, matches])

  // Warm the next slide while this one is on screen, so the crossfade never lands on a blank frame.
  useEffect(() => {
    if (!running) return
    const next = matches[(selectedIndex + 1) % matches.length]
    if (!next) return
    const img = new Image()
    img.decoding = 'async'
    img.src = next.image
  }, [running, matches, selectedIndex])

  /** Any deliberate use of the controls hands the gallery over to the visitor. */
  const take = useCallback((id: string) => {
    setAutoplay(false)
    setSelectedId(id)
  }, [])

  function reset() {
    setQuery('')
    setCategory('all')
    setSelectedId(projects[0].id)
    setAutoplay(true)
  }

  return (
    <section
      className={styles.showcase}
      aria-label="Project showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <header className={styles.heading}>
        <h2 className={`t-title ${styles.title}`}>Selected work.</h2>
        <p className={`t-lead ${styles.lead}`}>Shipped products and engineering demos.</p>
      </header>

      {selected ? (
        <ProjectStage project={selected} onOpen={() => setAutoplay(false)} />
      ) : (
        <div className={styles.stage}>
          <div className={`${styles.screen} ${styles.screenEmpty}`} role="status">
            <h3 className={styles.emptyTitle}>No matching projects</h3>
            <p className={styles.emptyText}>Try a project name or a technology like React or Flutter.</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>Show all work</button>
          </div>
        </div>
      )}

      <aside className={styles.library} aria-label="Browse projects">
        <div className={styles.libraryHeading}>
          <h3 className={styles.libraryTitle}>Project library</h3>
          <span className={`t-label ${styles.count}`}>{matches.length} {matches.length === 1 ? 'project' : 'projects'}</span>
        </div>

        <label className={styles.search}>
          <FaMagnifyingGlass aria-hidden="true" className={styles.searchIcon} />
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Find a project or technology"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => { setAutoplay(false); setQuery(event.target.value); setSelectedId('') }}
          />
        </label>

        <div className={styles.filters} role="group" aria-label="Project categories">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn btn--ghost btn--sm ${styles.filter}`}
              aria-pressed={category === item.id}
              onClick={() => { setAutoplay(false); setCategory(item.id); setSelectedId('') }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.projectList}>
          {visibleProjects.map((project) => {
            const active = selected?.id === project.id
            return (
              <button
                key={project.id}
                type="button"
                className={styles.row}
                aria-pressed={active}
                onClick={() => take(project.id)}
                aria-label={`Preview ${shortTitle(project)}`}
              >
                <img className={styles.thumb} src={project.image} alt="" loading="lazy" decoding="async" />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{shortTitle(project)}</span>
                  <span className={styles.rowMeta}>
                    <span className={styles.rowCompany}>{project.company}</span>
                    <span className="t-data">{project.year}</span>
                  </span>
                </span>
                <span className={styles.rowDot} aria-hidden="true" />
                {active && slideshow && (
                  <span
                    key={`${project.id}-${cycle}`}
                    aria-hidden="true"
                    className={paused ? `${styles.rowProgress} ${styles.rowProgressPaused}` : styles.rowProgress}
                    style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
                  />
                )}
              </button>
            )
          })}
        </div>

        <nav className={styles.pagination} aria-label="Project pages">
          <button
            type="button"
            className={`btn btn--ghost btn--sm ${styles.pageButton}`}
            aria-label="Previous project page"
            disabled={page === 0}
            onClick={() => take(matches[(page - 1) * PAGE_SIZE].id)}
          >
            <FaArrowLeftLong aria-hidden="true" />
          </button>
          <span className={`t-data ${styles.pageCount}`} aria-live={running ? 'off' : 'polite'}>
            {matches.length > 0 && <>{pad(page + 1)} <span className={styles.pageTotal}>/ {pad(pages)}</span></>}
          </span>
          <button
            type="button"
            className={`btn btn--ghost btn--sm ${styles.pageButton}`}
            aria-label="Next project page"
            disabled={page + 1 >= pages}
            onClick={() => take(matches[(page + 1) * PAGE_SIZE].id)}
          >
            <FaArrowRightLong aria-hidden="true" />
          </button>
        </nav>
      </aside>
    </section>
  )
}

/**
 * Keeps the project that was on screen before the current one, so the new shot can
 * crossfade over the old one instead of fading up from an empty frame.
 */
function usePreviousProject(project: Project) {
  const [pair, setPair] = useState<{ current: Project; previous: Project | null }>({ current: project, previous: null })
  if (pair.current !== project) {
    setPair({ current: project, previous: pair.current })
    return pair.current
  }
  return pair.previous
}

function ProjectStage({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const previous = usePreviousProject(project)
  const category = categories.find((item) => item.id === project.category)?.label
  const title = shortTitle(project)

  return (
    <div className={styles.stage}>
      {/* The shot and the text never share a box: many thumbnails are posters with their own
          big title, and an HTML title laid over a cropped poster reads as a ghost of itself. */}
      <figure className={styles.screen}>
        {previous && previous.id !== project.id && (
          <img
            key={`under-${previous.id}`}
            className={`${styles.shot} ${styles.shotUnder}`}
            src={previous.image}
            alt=""
            aria-hidden="true"
            decoding="async"
            onLoad={markOrientation}
          />
        )}
        <img
          key={project.id}
          className={`${styles.shot} ${styles.shotIn}`}
          src={project.image}
          alt={`${title}, product screenshot`}
          decoding="async"
          onLoad={markOrientation}
        />
      </figure>

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
        <h3 className={styles.projectTitle}>{title}</h3>
        <div className={styles.copy}>
          <p className={styles.tagline}>{project.tagline}</p>
          <p className={styles.tech}>{project.tech.join(' · ')}</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn--primary"
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
    </div>
  )
}
