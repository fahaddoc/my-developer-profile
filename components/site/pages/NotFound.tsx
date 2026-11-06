'use client'

// The 404 page: off course, with the way back into the journey. No WebGL:
// PageShell gives it the same backdrop and HUD bar as every other page, the
// title floats like the home page's, and every station is one jump away.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6'
import { PageShell } from '@/components/site/PageShell'
import { PageHeader, Panel, Telemetry } from '@/components/site/primitives'
import { STATIONS } from '@/lib/tunnel'
import css from './NotFound.module.css'

const MAX_PATH = 96

/** The path the visitor asked for. Rendered only after mount: the static 404
    is prerendered once for every missing URL, so the server can't know it. */
function RequestedPath() {
  const pathname = usePathname()
  const [path, setPath] = useState<string | null>(null)

  useEffect(() => {
    let p = pathname || window.location.pathname || '/'
    try { p = decodeURIComponent(p) } catch { /* keep it encoded */ }
    setPath(p.length > MAX_PATH ? `${p.slice(0, MAX_PATH)}…` : p)
  }, [pathname])

  return (
    <code className={`t-data ${css.path}`} title={path ?? undefined}>
      {path ?? <span className={css.scanning}>scanning…</span>}
    </code>
  )
}

/** Opens the nav computer through PageShell's own ⌘K / Ctrl K listener. */
function SetCourseButton() {
  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
    >
      <span className={css.spaceCopy}>Set course</span>
      <span className={css.seaCopy}>Chart a course</span>
      <FaArrowRight size={11} className="btn-arrow" aria-hidden />
    </button>
  )
}

export function NotFoundPage() {
  return (
    <PageShell back={{ href: '/', label: 'Journey' }} where="Off course">
      <div className={css.layout}>
        <div className={css.lost}>
          <PageHeader
            kicker={<><span className={css.blip} aria-hidden />ERROR 404 · SIGNAL LOST</>}
            title={'Off\ncourse.'}
            lead="The page you were looking for doesn't exist, or it has moved somewhere else. Everything else is still on the map, one jump away."
          >
            <Link href="/" className="btn btn--primary">
              <FaArrowLeft size={11} aria-hidden />
              Back to the journey
            </Link>
            <SetCourseButton />
          </PageHeader>

          <Telemetry
            className={css.telemetry}
            items={[
              { label: 'Requested path', value: <RequestedPath /> },
              { label: 'Last known position', value: 'The journey' },
            ]}
          />
        </div>

        <Panel label={`Quick destinations · ${STATIONS.length} stations`} className={css.panel}>
          <nav aria-label="Journey stations">
            <ol className={css.list}>
              {STATIONS.map((st) => (
                <li key={st.id}>
                  <Link href={`/#${st.id}`} className={css.dest}>
                    <span className={`t-data ${css.num}`}>{st.num}</span>
                    <span className={css.text}>
                      <span className={`t-subtitle ${css.name}`}>{st.short}</span>
                      <span className={`t-label ${css.sub}`}>{st.subtitle}</span>
                    </span>
                    <FaArrowRight size={11} className={css.arrow} aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </Panel>
      </div>
    </PageShell>
  )
}
