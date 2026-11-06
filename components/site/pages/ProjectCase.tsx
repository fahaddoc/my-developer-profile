// ProjectCase — one project's case study, in the journey's HUD language:
// a floating title, the screenshot in a bracketed viewport, telemetry
// readouts, the story (overview, problem, solution, features), the projects
// that share its stack, and the way to the previous / next star in time.
// Server component; PageShell and the primitives are the client islands.

import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Project } from '@/data/projects'
import { engineeringDemos } from '@/data/engineering-demos'
import { RELATED, STARS, type Star } from '@/components/projects/starmap/layout'
import { PageShell } from '@/components/site/PageShell'
import { PageHeader, Panel, Telemetry, Viewport } from '@/components/site/primitives'
import s from './ProjectCase.module.css'

const DEMO_IDS = new Set(engineeringDemos.map((d) => d.id))
const CATEGORY: Record<Project['category'], string> = { web: 'Web', mobile: 'Mobile', realtime: 'Real-time' }
const short = (title: string) => title.split(' — ')[0]
const pad = (n: number) => String(n).padStart(2, '0')
const NEW_TAB = <span className={s.sr}> (opens in a new tab)</span>
/** the same words for both worlds: space (dark) and the sea chart (light) */
const Duo = ({ space, sea }: { space: string; sea: string }) => (
  <><span className={s.inSpace}>{space}</span><span className={s.inSea}>{sea}</span></>
)

export function ProjectCase({ project, size }: { project: Project; size: { w: number; h: number } }) {
  const demo = DEMO_IDS.has(project.id)
  const name = short(project.title)
  const category = CATEGORY[project.category]
  const i = STARS.findIndex((st) => st.p.id === project.id)
  const total = STARS.length
  const related = i >= 0 ? RELATED[i].map((j) => STARS[j]) : []
  const prev = i > 0 ? STARS[i - 1] : null
  const next = i >= 0 && i < total - 1 ? STARS[i + 1] : null

  const ratio = size.w / size.h
  const portrait = ratio < 1.1
  // wide shots keep their own shape (clamped so a panorama stays a viewport)
  const frameRatio = portrait ? undefined : Math.min(2.4, Math.max(1.3, ratio)).toFixed(3)

  const links = (
    <span className={s.links}>
      {project.liveUrl && (
        <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="link-quiet">
          {project.liveUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗{NEW_TAB}
        </a>
      )}
      {project.githubUrl && (
        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="link-quiet">
          Source on GitHub ↗{NEW_TAB}
        </a>
      )}
      {!project.liveUrl && !project.githubUrl && <span className={s.muted}>Not public</span>}
    </span>
  )

  return (
    <PageShell back={{ href: '/#projects', label: 'All work' }} where="Case study">
      <article className={s.case}>
        <PageHeader
          kicker={`${demo ? 'Lab demo' : 'Case study'} · ${category} · ${project.year}`}
          title={name}
          lead={project.tagline}
        >
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
              Visit project <span aria-hidden>↗</span>{NEW_TAB}
            </a>
          )}
          {project.githubUrl && (
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className={`btn ${project.liveUrl ? 'btn--ghost' : 'btn--primary'}`}>
              Source <span aria-hidden>↗</span>{NEW_TAB}
            </a>
          )}
          <Link href="/#projects" className="btn btn--ghost"><span>See it on the <Duo space="star map" sea="sea chart" /></span></Link>
        </PageHeader>

        <figure className={s.figure}>
          <Viewport>
            <div
              className={`${s.frame} ${portrait ? s.portrait : ''}`}
              style={frameRatio ? ({ '--ar': frameRatio } as CSSProperties) : undefined}
            >
              <Image
                src={project.image}
                alt={`${name}: ${project.tagline}`}
                fill
                priority
                className={s.shot}
                sizes={portrait ? '(max-width: 720px) 80vw, 520px' : '(max-width: 1180px) 100vw, 1100px'}
              />
            </div>
          </Viewport>
          <figcaption className={`t-data ${s.caption}`}>
            <span>{i >= 0 ? <><Duo space="Star" sea="Mark" /> {pad(i + 1)} / {pad(total)}</> : category}</span>
            <span>{demo ? 'Synthetic data · AI-assisted demo' : project.company}</span>
          </figcaption>
        </figure>

        <Telemetry
          className={s.telemetry}
          items={[
            { label: demo ? 'Context' : 'Client / company', value: project.company },
            { label: 'Year', value: project.year },
            { label: 'Type', value: demo ? `Lab demo · ${category}` : project.featured ? `${category} · Featured` : category },
            { label: 'Stack', value: project.tech.join(' · ') },
            { label: 'Links', value: links },
          ]}
        />

        <section className={s.block} aria-labelledby="case-overview">
          <h2 id="case-overview" className={`t-data ${s.label}`}><span className={s.num}>01</span> Overview</h2>
          <p className={s.description}>{project.description}</p>
        </section>

        <section className={s.block} aria-labelledby="case-approach">
          <h2 id="case-approach" className={`t-data ${s.label}`}><span className={s.num}>02</span> Problem and solution</h2>
          <div className={s.pair}>
            <Panel as="div">
              <h3 className={`t-data ${s.panelHead}`}>Problem</h3>
              <p className={s.panelText}>{project.problem}</p>
            </Panel>
            <Panel as="div">
              <h3 className={`t-data ${s.panelHead} ${s.panelHeadOn}`}>Solution</h3>
              <p className={s.panelText}>{project.solution}</p>
            </Panel>
          </div>
        </section>

        <section className={s.block} aria-labelledby="case-features">
          <h2 id="case-features" className={`t-data ${s.label}`}><span className={s.num}>03</span> Features</h2>
          <ol className={s.features} role="list">
            {project.features.map((f, n) => (
              <li key={f} className={s.feature}>
                <span className={`t-data ${s.featureNum}`}>{pad(n + 1)}</span>
                <span>{f}</span>
              </li>
            ))}
          </ol>
        </section>

        {related.length > 0 && (
          <section className={s.block} aria-labelledby="case-related">
            <h2 id="case-related" className={`t-data ${s.label}`}><span className={s.num}>04</span> Shares a stack with</h2>
            <ul className={s.related} role="list">
              {related.map((st) => (
                <li key={st.p.id}>
                  <Link href={`/projects/${st.p.id}`} className={s.relLink}>
                    <span className={s.thumb}>
                      <Image src={st.p.image} alt="" fill sizes="48px" className={`${s.thumbImg} ${st.p.image.endsWith('.svg') ? s.thumbPoster : ''}`} />
                    </span>
                    <span className={s.relText}>
                      <span className={`t-subtitle ${s.relName}`}>{short(st.p.title)}</span>
                      <span className={`t-data ${s.relMeta}`}>{CATEGORY[st.p.category]} · {st.p.year}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav className={s.pager} aria-label="Previous and next project">
          {prev ? <PagerLink star={prev} dir="prev" n={i} total={total} /> : <MapLink edge="Start" />}
          {next ? <PagerLink star={next} dir="next" n={i + 2} total={total} /> : <MapLink edge="End" />}
        </nav>
      </article>
    </PageShell>
  )
}

function PagerLink({ star, dir, n, total }: { star: Star; dir: 'prev' | 'next'; n: number; total: number }) {
  const isNext = dir === 'next'
  return (
    <Link href={`/projects/${star.p.id}`} className={`${s.pg} ${isNext ? s.pgNext : ''}`} rel={dir}>
      <span className={`t-data ${s.pgLabel}`}>
        {!isNext && <span className={s.arrow} aria-hidden>←</span>}
        {isNext ? 'Next' : 'Previous'} · {pad(n)} / {pad(total)}
        {isNext && <span className={s.arrow} aria-hidden>→</span>}
      </span>
      <span className={`t-title ${s.pgTitle}`}>{short(star.p.title)}</span>
      <span className={`t-data ${s.pgMeta}`}>{CATEGORY[star.p.category]} · {star.p.year}</span>
    </Link>
  )
}

function MapLink({ edge }: { edge: 'Start' | 'End' }) {
  return (
    <Link href="/#projects" className={`${s.pg} ${s.pgMap}`}>
      <span className={`t-data ${s.pgLabel}`}>{edge} of the chart</span>
      <span className={`t-title ${s.pgTitle}`}>Back to the <Duo space="star map" sea="sea chart" /></span>
      <span className={`t-data ${s.pgMeta}`}>All {STARS.length} projects</span>
    </Link>
  )
}
