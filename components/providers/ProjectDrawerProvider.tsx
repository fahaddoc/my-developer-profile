'use client'

// ProjectDrawerProvider — the project detail drawer.
//
// Opened by useProjectDrawer().open(id) or the window CustomEvent
// 'project-drawer-open' with `detail: <project id>` (the 3D tunnel and the
// mobile showcase dispatch it). The shell is the shared components/ui/Drawer,
// loaded on first open so framer-motion stays out of the initial bundle.
//
// Content order: the product screenshot first, then title, client, year and
// type, the description and the links, then problem / solution / features as
// short editorial sections, and the stack once at the end.

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { projects, type Project } from '@/data/projects'
import { prefetchDrawer } from '@/components/ui/drawerPrefetch'
import styles from '@/components/ui/Drawer.module.css'

interface DrawerContextValue {
  openProjectId: string | null
  open:  (id: string) => void
  close: () => void
}

const DrawerContext = createContext<DrawerContextValue>({
  openProjectId: null,
  open:  () => {},
  close: () => {},
})

export function useProjectDrawer() {
  return useContext(DrawerContext)
}

// The shared shell's one cached import (components/ui/drawerPrefetch).
const Drawer = dynamic(
  () => prefetchDrawer().then(() => import('@/components/ui/Drawer')).then((m) => m.Drawer),
  { ssr: false },
)

const CATEGORY_LABEL: Record<Project['category'], string> = {
  web:      'Web app',
  mobile:   'Mobile app',
  realtime: 'Real-time',
}

export function ProjectDrawerProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [everOpened, setEverOpened] = useState(false)
  const titleId = useId()

  // The idle warm-up of the shared drawer chunk lives in
  // ContactDrawerProvider (one import serves both drawers).

  const open = useCallback((id: string) => {
    if (!projects.some((p) => p.id === id)) return
    void prefetchDrawer()
    setEverOpened(true)
    setOpenId(id)
  }, [])
  const close = useCallback(() => setOpenId(null), [])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<unknown>).detail
      if (typeof id === 'string') open(id)
    }
    window.addEventListener('project-drawer-open', onOpen)
    return () => window.removeEventListener('project-drawer-open', onOpen)
  }, [open])

  const project = useMemo(
    () => (openId ? projects.find((p) => p.id === openId) ?? null : null),
    [openId],
  )
  // Keep the last project rendered while the drawer animates out.
  const lastRef = useRef<Project | null>(null)
  if (project) lastRef.current = project
  const shown = project ?? lastRef.current

  const ctx = useMemo<DrawerContextValue>(
    () => ({ openProjectId: openId, open, close }),
    [openId, open, close],
  )

  return (
    <DrawerContext.Provider value={ctx}>
      {children}
      {everOpened && shown && (
        <Drawer open={!!project} onClose={close} labelledBy={titleId} width={560} resetKey={shown.id}>
          <ProjectBody key={shown.id} project={shown} titleId={titleId} onNavigate={close} />
        </Drawer>
      )}
    </DrawerContext.Provider>
  )
}

function ProjectBody({ project, titleId, onNavigate }: {
  project: Project
  titleId: string
  onNavigate: () => void
}) {
  const hasLinks = !!(project.liveUrl || project.githubUrl)

  return (
    <article>
      <div className={styles.hero}>
        <Image
          src={project.image}
          alt={`Screenshot of ${project.title}`}
          fill
          sizes="(max-width: 768px) 100vw, 560px"
          decoding="async"
        />
      </div>

      <div className={styles.project}>
        <h2
          id={titleId}
          className={`t-title ${styles.projectTitle} ${styles.focusTarget}`}
          tabIndex={-1}
          data-autofocus=""
        >
          {project.title}
        </h2>
        <p className={styles.company}>{project.company}</p>
        <p className={`t-data ${styles.meta}`}>
          {CATEGORY_LABEL[project.category]} · {project.year}
        </p>

        <p className={`t-lead ${styles.description}`}>{project.description}</p>

        {hasLinks && (
          <div className={styles.ctas}>
            {project.liveUrl && (
              <a className="btn btn--primary" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                Visit project <span className="btn-arrow" aria-hidden="true">↗</span>
                <span className={styles.srOnly}> (opens in a new tab)</span>
              </a>
            )}
            {project.githubUrl && (
              <a className="btn btn--ghost" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                View source <span className="btn-arrow" aria-hidden="true">↗</span>
                <span className={styles.srOnly}> (opens in a new tab)</span>
              </a>
            )}
          </div>
        )}

        <Link
          href={`/projects/${project.id}`}
          className={`link-quiet ${styles.caseLink}`}
          onClick={onNavigate}
        >
          Read the full case study <span className={styles.arrow} aria-hidden="true">→</span>
        </Link>

        {project.problem && (
          <section className={styles.section} aria-labelledby={`${titleId}-problem`}>
            <h3 id={`${titleId}-problem`} className={`t-subtitle ${styles.sectionTitle}`}>The problem</h3>
            <p className={`t-lead ${styles.sectionText}`}>{project.problem}</p>
          </section>
        )}

        {project.solution && (
          <section className={styles.section} aria-labelledby={`${titleId}-solution`}>
            <h3 id={`${titleId}-solution`} className={`t-subtitle ${styles.sectionTitle}`}>The solution</h3>
            <p className={`t-lead ${styles.sectionText}`}>{project.solution}</p>
          </section>
        )}

        {project.features.length > 0 && (
          <section className={styles.section} aria-labelledby={`${titleId}-features`}>
            <h3 id={`${titleId}-features`} className={`t-subtitle ${styles.sectionTitle}`}>Key features</h3>
            <ul className={styles.features}>
              {project.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </section>
        )}

        {project.tech.length > 0 && (
          <section className={styles.section} aria-labelledby={`${titleId}-tech`}>
            <h3 id={`${titleId}-tech`} className={`t-subtitle ${styles.sectionTitle}`}>Built with</h3>
            <ul className={styles.tech}>
              {project.tech.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </section>
        )}
      </div>
    </article>
  )
}
