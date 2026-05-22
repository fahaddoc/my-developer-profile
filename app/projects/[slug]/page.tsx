import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { projects } from '@/data/projects'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, projectSchema } from '@/lib/seo/jsonld'
import { SITE_URL, AUTHOR } from '@/lib/seo/site'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const dynamicParams = false

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.id }))
}

type Params = { slug: string }

async function findProject(slug: string) {
  return projects.find((p) => p.id === slug)
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await params
  const project = await findProject(slug)
  if (!project) return {}

  const title = `${project.title} — ${project.tech.join(', ')}`
  const description = `${project.tagline}. ${project.description.slice(0, 160)}`
  const url = `${SITE_URL}/projects/${project.id}`

  return {
    title,
    description,
    alternates: { canonical: `/projects/${project.id}` },
    keywords: [
      project.title,
      ...project.tech,
      `${project.category} development`,
      `${AUTHOR.name} ${project.title}`,
      `${AUTHOR.name} project`,
      project.company,
    ],
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'Shah Fahad',
      images: [
        {
          url: project.image,
          width: 1200,
          height: 630,
          alt: project.title,
        },
      ],
      authors: [`${SITE_URL}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [project.image],
    },
  }
}

// ─── HUD corner bracket ──────────────────────────────────────────────────────
function CornerBrackets() {
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((c) => {
        const isTop  = c.startsWith('t')
        const isLeft = c.endsWith('l')
        return (
          <span
            key={c}
            aria-hidden
            className="pointer-events-none absolute w-5 h-5"
            style={{
              [isTop  ? 'top'  : 'bottom']: -1,
              [isLeft ? 'left' : 'right']:  -1,
              borderTop:    isTop  ? '1.5px solid rgb(94 234 212 / 0.7)' : undefined,
              borderBottom: !isTop ? '1.5px solid rgb(94 234 212 / 0.7)' : undefined,
              borderLeft:   isLeft ? '1.5px solid rgb(94 234 212 / 0.7)' : undefined,
              borderRight: !isLeft ? '1.5px solid rgb(94 234 212 / 0.7)' : undefined,
              boxShadow: '0 0 8px rgb(94 234 212 / 0.4)',
            }}
          />
        )
      })}
    </>
  )
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const project = await findProject(slug)
  if (!project) notFound()

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Projects', url: `${SITE_URL}/#projects` },
    { name: project.title, url: `${SITE_URL}/projects/${project.id}` },
  ])

  const accent = project.color || '#5EEAD4'
  const accentRgb = accent.replace('#', '').match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',') || '94,234,212'
  const idx = projects.findIndex(p => p.id === project.id)
  const seq = String(idx + 1).padStart(2, '0')

  return (
    <>
      <JsonLd data={projectSchema(project)} />
      <JsonLd data={breadcrumbs} />

      {/* Nebula gradient background — matches tunnel scene aesthetic */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: `
            radial-gradient(ellipse at 18% 12%, rgba(${accentRgb},0.18) 0%, transparent 45%),
            radial-gradient(ellipse at 82% 88%, rgba(${accentRgb},0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(13,89,115,0.25) 0%, rgba(3,10,30,0.85) 70%),
            #03060f
          `,
        }}
      />

      <Navbar />

      <main className="min-h-screen pt-28 pb-24 px-6 relative">
        <article className="max-w-content mx-auto">

          {/* Breadcrumb — mono micro-text like tunnel HUD chrome */}
          <nav
            aria-label="Breadcrumb"
            className="font-mono text-[10px] tracking-[0.3em] uppercase mb-8 flex items-center gap-3"
            style={{ color: 'rgb(245 245 247 / 0.5)' }}
          >
            <Link href="/" className="hover:text-[var(--clr-accent)] transition-colors" style={{ ['--clr-accent' as string]: accent }}>
              Home
            </Link>
            <span style={{ color: accent }}>·</span>
            <Link href="/#projects" className="hover:text-[var(--clr-accent)] transition-colors" style={{ ['--clr-accent' as string]: accent }}>
              Projects
            </Link>
            <span style={{ color: accent }}>·</span>
            <span style={{ color: accent, textShadow: `0 0 10px rgba(${accentRgb},0.6)` }}>
              {project.title}
            </span>
          </nav>

          {/* Header — sequence number + station-style meta + huge display title */}
          <header className="mb-12 relative">
            <div className="flex items-center gap-4 mb-5">
              <span
                className="font-mono text-sm font-bold tracking-widest"
                style={{ color: accent, textShadow: `0 0 12px rgba(${accentRgb},0.7)` }}
              >
                {seq}
              </span>
              <span aria-hidden className="h-px w-12" style={{ background: `linear-gradient(to right, rgb(${accentRgb}), transparent)` }} />
              <span
                className="font-mono text-[10px] tracking-[0.3em] uppercase"
                style={{ color: 'rgb(245 245 247 / 0.55)' }}
              >
                {project.company} · {project.category} · {project.year}
              </span>
            </div>

            <h1
              className="font-display font-extrabold text-4xl md:text-6xl leading-[1.05] mb-6"
              style={{
                color: 'rgb(245 245 247)',
                letterSpacing: '-0.02em',
                textShadow: `0 0 30px rgba(${accentRgb},0.25)`,
              }}
            >
              {project.title}
            </h1>

            <p
              className="text-lg md:text-xl max-w-3xl leading-relaxed"
              style={{ color: 'rgb(245 245 247 / 0.72)' }}
            >
              {project.tagline}
            </p>
          </header>

          {/* Hero image — HUD-framed with corner brackets + glow border */}
          <div className="relative mb-16">
            <CornerBrackets />
            <div
              className="relative aspect-video rounded-xl overflow-hidden"
              style={{
                border: `1px solid rgba(${accentRgb},0.35)`,
                boxShadow: `0 0 0 1px rgba(${accentRgb},0.08), 0 0 60px rgba(${accentRgb},0.18), inset 0 0 30px rgba(${accentRgb},0.08)`,
                background: 'rgba(8,12,20,0.6)',
              }}
            >
              <Image
                src={project.image}
                alt={`${project.title} — ${project.tagline}`}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
              {/* subtle scanline overlay */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-40"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, rgba(${accentRgb},0.12) 0, rgba(${accentRgb},0.12) 1px, transparent 1px, transparent 3px)`,
                }}
              />
            </div>
          </div>

          {/* Body — content + aside */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-20">
            <div className="lg:col-span-2 space-y-12">
              <Section title="Overview" accent={accent} accentRgb={accentRgb}>
                <p className="text-base md:text-lg leading-[1.75]" style={{ color: 'rgb(245 245 247 / 0.78)' }}>
                  {project.description}
                </p>
              </Section>

              <Section title="Problem" accent={accent} accentRgb={accentRgb}>
                <p className="text-base md:text-lg leading-[1.75]" style={{ color: 'rgb(245 245 247 / 0.78)' }}>
                  {project.problem}
                </p>
              </Section>

              <Section title="Solution" accent={accent} accentRgb={accentRgb}>
                <p className="text-base md:text-lg leading-[1.75]" style={{ color: 'rgb(245 245 247 / 0.78)' }}>
                  {project.solution}
                </p>
              </Section>

              <Section title="Key Features" accent={accent} accentRgb={accentRgb}>
                <ul className="space-y-3">
                  {project.features.map((f, i) => (
                    <li
                      key={f}
                      className="flex gap-4 items-start p-3 rounded-lg"
                      style={{
                        background: `linear-gradient(140deg, rgba(${accentRgb},0.04), rgba(8,12,20,0.4))`,
                        border: `1px solid rgba(${accentRgb},0.12)`,
                      }}
                    >
                      <span
                        className="font-mono text-[10px] mt-1 tabular-nums flex-shrink-0"
                        style={{ color: accent, textShadow: `0 0 8px rgba(${accentRgb},0.7)` }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="leading-relaxed" style={{ color: 'rgb(245 245 247 / 0.85)' }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>

            <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
              <Card accent={accent} accentRgb={accentRgb}>
                <CardLabel accent={accent} accentRgb={accentRgb}>Tech Stack</CardLabel>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded"
                      style={{
                        color: 'rgb(245 245 247 / 0.85)',
                        border: `1px solid rgba(${accentRgb},0.35)`,
                        background: `rgba(${accentRgb},0.06)`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Card>

              <Card accent={accent} accentRgb={accentRgb}>
                <CardLabel accent={accent} accentRgb={accentRgb}>Built By</CardLabel>
                <p style={{ color: 'rgb(245 245 247 / 0.78)' }} className="leading-relaxed text-sm">
                  <Link href="/" className="hover:underline" style={{ color: accent }}>
                    {AUTHOR.name}
                  </Link>{' '}
                  — {AUTHOR.jobTitle}<br/>
                  <span style={{ color: 'rgb(245 245 247 / 0.55)' }}>
                    {AUTHOR.city}, {AUTHOR.countryName}
                  </span>
                </p>
              </Card>

              {(project.liveUrl || project.githubUrl) && (
                <div className="space-y-2.5">
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-3 rounded-lg font-mono text-[11px] tracking-[0.25em] uppercase font-bold transition-all hover:scale-[1.02]"
                      style={{
                        color: '#0A0A12',
                        background: accent,
                        boxShadow: `0 0 24px rgba(${accentRgb},0.45)`,
                      }}
                    >
                      View Live →
                    </a>
                  )}
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-3 rounded-lg font-mono text-[11px] tracking-[0.25em] uppercase font-bold transition-all"
                      style={{
                        color: accent,
                        border: `1px solid rgba(${accentRgb},0.5)`,
                        background: `rgba(${accentRgb},0.04)`,
                      }}
                    >
                      View Source →
                    </a>
                  )}
                </div>
              )}
            </aside>
          </div>

          {/* Related — tunnel-card-style grid */}
          <section
            className="pt-12"
            style={{ borderTop: `1px solid rgba(${accentRgb},0.15)` }}
          >
            <div className="flex items-baseline gap-4 mb-8">
              <span aria-hidden className="h-px w-16" style={{ background: `linear-gradient(to right, rgb(${accentRgb}), transparent)` }} />
              <h2
                className="font-mono text-[11px] tracking-[0.3em] uppercase"
                style={{ color: accent, textShadow: `0 0 10px rgba(${accentRgb},0.5)` }}
              >
                More Case Studies
              </h2>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects
                .filter((p) => p.id !== project.id)
                .slice(0, 4)
                .map((p) => {
                  const pAccent = p.color || '#5EEAD4'
                  const pRgb = pAccent.replace('#', '').match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',') || '94,234,212'
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="block p-5 rounded-xl transition-all hover:-translate-y-0.5"
                        style={{
                          border: `1px solid rgba(${pRgb},0.2)`,
                          background: `linear-gradient(140deg, rgba(${pRgb},0.04), rgba(8,12,20,0.5))`,
                        }}
                      >
                        <span
                          className="font-mono text-[10px] tracking-[0.3em] uppercase"
                          style={{ color: pAccent, textShadow: `0 0 8px rgba(${pRgb},0.6)` }}
                        >
                          {p.company}
                        </span>
                        <p className="font-display font-bold text-lg mt-2" style={{ color: 'rgb(245 245 247)' }}>
                          {p.title}
                        </p>
                        <p className="text-sm mt-1.5 line-clamp-2" style={{ color: 'rgb(245 245 247 / 0.65)' }}>
                          {p.tagline}
                        </p>
                      </Link>
                    </li>
                  )
                })}
            </ul>
          </section>

        </article>
      </main>

      <Footer />
    </>
  )
}

// ─── Section + Card helpers ─────────────────────────────────────────────────
function Section({ title, accent, accentRgb, children }: {
  title: string; accent: string; accentRgb: string; children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <span aria-hidden className="h-px w-10" style={{ background: `linear-gradient(to right, rgb(${accentRgb}), transparent)` }} />
        <h2
          className="font-mono text-[11px] tracking-[0.3em] uppercase"
          style={{ color: accent, textShadow: `0 0 10px rgba(${accentRgb},0.5)` }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Card({ accent, accentRgb, children }: {
  accent: string; accentRgb: string; children: React.ReactNode
}) {
  void accent
  return (
    <div
      className="p-5 rounded-xl relative"
      style={{
        border: `1px solid rgba(${accentRgb},0.18)`,
        background: `linear-gradient(140deg, rgba(${accentRgb},0.04), rgba(8,12,20,0.5))`,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      {children}
    </div>
  )
}

function CardLabel({ accent, accentRgb, children }: {
  accent: string; accentRgb: string; children: React.ReactNode
}) {
  return (
    <div
      className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
      style={{ color: accent, textShadow: `0 0 8px rgba(${accentRgb},0.6)` }}
    >
      {children}
    </div>
  )
}
