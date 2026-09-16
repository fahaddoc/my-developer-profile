'use client'

import { useState, type CSSProperties, type PointerEvent } from 'react'
import { projects, type Project } from '@/data/projects'
import styles from './ProjectShowcase.module.css'

const categories = [
  { id: 'all', label: 'All work' },
  { id: 'web', label: 'Web' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'realtime', label: 'Real-time' },
] as const
const PAGE_SIZE = 5

export function ProjectShowcase() {
  const [category, setCategory] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState(projects[0].id)
  const matches = projects.filter((project) =>
    (category === 'all' || project.category === category) &&
    `${project.title} ${project.company} ${project.tech.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const visibleProjects = matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const selected = matches.find((project) => project.id === selectedId) ?? matches[0]

  function changePage(nextPage: number) {
    setPage(nextPage)
    setSelectedId(matches[nextPage * PAGE_SIZE].id)
  }

  return (
    <section className={styles.showcase} aria-label="Project showcase">
      <header className={styles.heading}>
        <div>
          <p className={styles.intro}>Ideas, built into software.</p>
          <h2>Selected work<span className={styles.titleDot}>.</span></h2>
        </div>
        <p className={styles.note}>Web platforms, mobile experiences<br />and experiments worth opening.</p>
      </header>

      <div className={styles.workspace}>
        <div className={styles.stage}>
          {selected ? <ProjectSpotlight key={selected.id} project={selected} /> : (
            <div className={styles.empty}>
              <h3>No matching projects</h3>
              <p>Try a project name or a technology like React or Flutter.</p>
              <button onClick={() => { setQuery(''); setCategory('all'); setPage(0); setSelectedId(projects[0].id) }}>Show all work</button>
            </div>
          )}
        </div>

        <aside className={styles.library} aria-label="Browse projects">
          <div className={styles.libraryHeading}><h3>Project library</h3><span>{matches.length} {matches.length === 1 ? 'project' : 'projects'}</span></div>
          <label className={styles.search}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg>
            <input aria-label="Search projects" placeholder="Find a project or technology" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); setSelectedId('') }} />
          </label>
          <div className={styles.filters} aria-label="Project categories">
            {categories.map((item) => (
              <button key={item.id} aria-pressed={category === item.id} onClick={() => { setCategory(item.id); setPage(0); setSelectedId('') }}>{item.label}</button>
            ))}
          </div>
          <div className={styles.projectList}>
            {visibleProjects.map((project) => (
              <button key={project.id} className={styles.projectRow} aria-pressed={selected?.id === project.id} onClick={() => setSelectedId(project.id)} aria-label={`Preview ${project.title}`}>
                <img src={project.image} alt="" />
                <span className={styles.rowText}><strong>{project.title.split(' — ')[0]}</strong><span>{project.tech.slice(0, 2).join(' / ')}</span></span>
                <span className={styles.rowArrow} aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <nav className={styles.pagination} aria-label="Project pages">
            <button aria-label="Previous project page" disabled={page === 0} onClick={() => changePage(page - 1)}>←</button>
            <span aria-live="polite">{matches.length ? page + 1 : 0} <span>/ {matches.length ? pages : 0}</span></span>
            <button aria-label="Next project page" disabled={page + 1 >= pages} onClick={() => changePage(page + 1)}>→</button>
          </nav>
        </aside>
      </div>
    </section>
  )
}

function ProjectSpotlight({ project }: { project: Project }) {
  const category = categories.find((item) => item.id === project.category)?.label
  function tilt(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 5}deg`)
    event.currentTarget.style.setProperty('--tilt-y', `${x * 6}deg`)
  }

  function resetTilt(event: PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--tilt-x', '0deg')
    event.currentTarget.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <article onPointerMove={tilt} onPointerLeave={resetTilt} className={styles.spotlight} style={{ '--project-color': project.color } as CSSProperties}>
      <img className={styles.cardBackdrop} src={project.image} alt="" />
      <div className={styles.cardShade} aria-hidden="true" />
      <div className={styles.cardTop}><span>{category}</span><span>{project.year}</span></div>
      <div className={styles.details}>
        <p className={styles.company}>{project.company}</p>
        <h3>{project.title.split(' — ')[0]}</h3>
        <p className={styles.tagline}>{project.tagline}</p>
        <div className={styles.technologies}>{project.tech.map((tech) => <span key={tech}>{tech}</span>)}</div>
        <div className={styles.actions}>
          <button className={styles.primaryAction} onClick={() => window.dispatchEvent(new CustomEvent('project-drawer-open', { detail: project.id }))}>Explore case study <span aria-hidden="true">↗</span></button>
          {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">Source code <span aria-hidden="true">↗</span></a>}
          {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">Visit project <span aria-hidden="true">↗</span></a>}
        </div>
      </div>
    </article>
  )
}
