import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { projects } from '@/data/projects'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, projectSchema } from '@/lib/seo/jsonld'
import { SITE_URL, AUTHOR } from '@/lib/seo/site'
import { StarfieldBackground } from '@/components/mobile/StarfieldBackground'

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
      images: [{ url: project.image, width: 1200, height: 630, alt: project.title }],
      authors: [`${SITE_URL}`],
    },
    twitter: { card: 'summary_large_image', title, description, images: [project.image] },
  }
}

// theme-adaptive teal identity (matches the tunnel / mobile-space accent)
const A = 'rgb(var(--mob-accent))'
const Aa = (a: number) => `rgb(var(--mob-accent) / ${a})`
const TXT = 'rgb(var(--text-primary))'
const SUB = 'rgb(var(--text-secondary))'
const VIO = 'rgb(var(--accent-violet))'

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const project = await findProject(slug)
  if (!project) notFound()

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Projects', url: `${SITE_URL}/#projects` },
    { name: project.title, url: `${SITE_URL}/projects/${project.id}` },
  ])

  const pc = project.color || '#5EEAD4'
  const idx = projects.findIndex((p) => p.id === project.id)
  const seq = String(idx + 1).padStart(2, '0')
  const mesh = `conic-gradient(from 210deg, ${pc}, ${A}, ${VIO}, ${pc})`
  const related = projects.filter((p) => p.id !== project.id).slice(0, 4)

  return (
    <>
      <JsonLd data={projectSchema(project)} />
      <JsonLd data={breadcrumbs} />

      <StarfieldBackground />
      {/* per-project colour tint over the starfield */}
      <div aria-hidden className="fixed inset-0 -z-[5] pointer-events-none" style={{ background: `radial-gradient(900px 600px at 80% -5%, ${pc}22, transparent 55%)` }} />

      {/* slim space chrome — back nav (no classic navbar) */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(rgb(var(--bg-base) / 0.7), transparent)' }}>
        <Link href="/#projects" className="font-mono text-[11px] tracking-[0.18em] uppercase flex items-center gap-2 transition-colors" style={{ color: TXT }}>
          <span style={{ color: A }}>←</span> Back to work
        </Link>
        <Link href="/" className="font-mono text-[11px] tracking-[0.18em] font-bold" style={{ color: TXT }}>SHAH FAHAD</Link>
      </header>

      <main className="relative z-10 min-h-screen px-5 sm:px-8 pt-24 pb-24 overflow-hidden">
        <article className="max-w-5xl mx-auto">

          {/* giant ghost sequence number — editorial backdrop */}
          <div aria-hidden className="pointer-events-none absolute -top-2 right-0 font-display font-extrabold leading-none select-none" style={{ fontSize: 'clamp(160px, 30vw, 360px)', color: Aa(0.04), letterSpacing: '-0.04em' }}>
            {seq}
          </div>

          {/* ── COLLAGE HERO ───────────────────────────────────────────── */}
          <section className="relative mb-24">
            {/* image block — rotated, mesh glow */}
            <div className="relative ml-auto" style={{ width: 'min(100%, 660px)', transform: 'rotate(-2.5deg)' }}>
              <div aria-hidden className="absolute -inset-5 rounded-[28px] -z-10" style={{ background: mesh, filter: 'blur(34px)', opacity: 0.55, transform: 'rotate(5deg)' }} />
              <div className="relative aspect-video rounded-2xl overflow-hidden" style={{ border: `1px solid ${Aa(0.4)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5)` }}>
                <Image src={project.image} alt={`${project.title} — ${project.tagline}`} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 660px" />
                <div aria-hidden className="absolute inset-0 mix-blend-overlay opacity-30" style={{ backgroundImage: `repeating-linear-gradient(to bottom, ${Aa(0.5)} 0 1px, transparent 1px 3px)` }} />
              </div>
              {/* sequence chip */}
              <span className="absolute -top-4 -left-4 font-mono text-xs font-bold px-3 py-2 rounded-lg" style={{ color: '#05070d', background: A, transform: 'rotate(-6deg)', boxShadow: `0 0 24px ${Aa(0.6)}` }}>
                {seq} / {String(projects.length).padStart(2, '0')}
              </span>
            </div>

            {/* title card — overlaps the image, opposite tilt */}
            <div className="relative -mt-20 sm:-mt-28 max-w-xl" style={{ transform: 'rotate(1.2deg)' }}>
              <div className="proj-card-float p-6 sm:p-8 rounded-2xl" style={{ background: 'rgb(var(--bg-surface) / 0.72)', backdropFilter: 'blur(14px)', border: `1px solid ${Aa(0.22)}`, boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}>
                <div className="font-mono text-[10px] tracking-[0.28em] uppercase mb-3" style={{ color: A }}>
                  {project.company} · {project.category} · {project.year}
                </div>
                <h1 className="font-display font-extrabold leading-[0.98] mb-4" style={{ fontSize: 'clamp(36px, 7vw, 68px)', letterSpacing: '-0.03em', color: TXT }}>
                  {project.title.split(' — ')[0]}
                  <span style={{ color: A }}>.</span>
                </h1>
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: SUB }}>{project.tagline}</p>
              </div>
            </div>

            {/* scattered tech chips */}
            <div className="flex flex-wrap gap-3 mt-7 pl-1">
              {project.tech.map((tech, i) => (
                <span key={tech} className="font-mono text-[11px] px-3.5 py-2 rounded-full" style={{ color: '#cdeee7', background: Aa(0.07), border: `1px solid ${Aa(0.3)}`, transform: `rotate(${i % 2 ? 2.5 : -2.5}deg)` }}>
                  {tech}
                </span>
              ))}
            </div>
          </section>

          {/* ── OVERVIEW — editorial lead ──────────────────────────────── */}
          <section className="mb-20 max-w-3xl">
            <SectionLabel>Overview</SectionLabel>
            <p className="font-display leading-[1.5]" style={{ fontSize: 'clamp(20px, 3vw, 30px)', color: TXT, letterSpacing: '-0.01em' }}>
              {project.description}
            </p>
          </section>

          {/* ── PROBLEM / SOLUTION — staggered collage cards ───────────── */}
          <section className="mb-24 relative">
            <div className="relative max-w-md mb-6 sm:mb-0" style={{ transform: 'rotate(-1deg)' }}>
              <CollageCard tint={Aa(0.05)} delay={0.6}>
                <SectionLabel>The Problem</SectionLabel>
                <p className="leading-[1.75]" style={{ color: 'rgb(var(--text-primary) / 0.82)' }}>{project.problem}</p>
              </CollageCard>
            </div>
            <div className="relative max-w-md ml-auto sm:-mt-10" style={{ transform: 'rotate(1.4deg)' }}>
              <CollageCard tint={`${pc}14`} border={`${pc}55`} delay={1.4}>
                <div className="font-mono text-[10px] tracking-[0.28em] uppercase mb-3" style={{ color: pc }}>The Solution</div>
                <p className="leading-[1.75]" style={{ color: 'rgb(var(--text-primary) / 0.82)' }}>{project.solution}</p>
              </CollageCard>
            </div>
          </section>

          {/* ── FEATURES — staggered list ──────────────────────────────── */}
          <section className="mb-24 max-w-3xl">
            <SectionLabel>Key Features</SectionLabel>
            <ul className="mt-2 space-y-3">
              {project.features.map((f, i) => (
                <li key={f} className="flex gap-4 items-start p-4 rounded-xl" style={{
                  background: 'rgb(var(--bg-surface) / 0.4)',
                  border: `1px solid ${Aa(0.14)}`,
                  marginLeft: `${(i % 3) * 18}px`,
                  transform: `rotate(${i % 2 ? 0.5 : -0.5}deg)`,
                }}>
                  <span className="font-mono text-[11px] mt-1 flex-shrink-0" style={{ color: A }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="leading-relaxed" style={{ color: 'rgb(var(--text-primary) / 0.85)' }}>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── META + CTA ─────────────────────────────────────────────── */}
          <section className="mb-24 flex flex-col sm:flex-row gap-5 items-start">
            <CollageCard tint={Aa(0.05)} delay={0.3}>
              <SectionLabel>Built By</SectionLabel>
              <p className="leading-relaxed text-sm" style={{ color: SUB }}>
                <Link href="/" className="hover:underline" style={{ color: A }}>{AUTHOR.name}</Link> — {AUTHOR.jobTitle}<br />
                <span style={{ color: 'rgb(var(--text-secondary) / 0.7)' }}>{AUTHOR.city}, {AUTHOR.countryName}</span>
              </p>
            </CollageCard>
            {(project.liveUrl || project.githubUrl) && (
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-center px-6 py-3.5 rounded-xl font-mono text-[11px] tracking-[0.2em] uppercase font-bold transition-transform hover:scale-[1.03]" style={{ color: '#05070d', background: A, boxShadow: `0 0 28px ${Aa(0.45)}` }}>
                    View Live ↗
                  </a>
                )}
                {project.githubUrl && (
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-center px-6 py-3.5 rounded-xl font-mono text-[11px] tracking-[0.2em] uppercase font-bold" style={{ color: A, border: `1px solid ${Aa(0.5)}`, background: Aa(0.04) }}>
                    View Source ↗
                  </a>
                )}
              </div>
            )}
          </section>

          {/* ── RELATED — collage grid ─────────────────────────────────── */}
          <section className="pt-12" style={{ borderTop: `1px solid ${Aa(0.15)}` }}>
            <SectionLabel>More Case Studies</SectionLabel>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
              {related.map((p, i) => {
                const rpc = p.color || '#5EEAD4'
                return (
                  <li key={p.id} style={{ transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}>
                    <Link href={`/projects/${p.id}`} className="block p-5 rounded-xl transition-transform hover:-translate-y-1" style={{ background: 'rgb(var(--bg-surface) / 0.45)', border: `1px solid ${Aa(0.16)}` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: rpc, boxShadow: `0 0 10px ${rpc}` }} />
                        <span className="font-mono text-[10px] tracking-[0.24em] uppercase" style={{ color: A }}>{p.company}</span>
                      </div>
                      <p className="font-display font-bold text-lg" style={{ color: TXT }}>{p.title.split(' — ')[0]}</p>
                      <p className="text-sm mt-1.5 leading-snug" style={{ color: SUB }}>{p.tagline}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          <div className="mt-20 text-center font-mono text-[10px]" style={{ color: 'rgb(var(--text-secondary) / 0.6)' }}>
            © 2026 Shah Fahad · built in space
          </div>
        </article>
      </main>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span aria-hidden className="h-px w-10" style={{ background: `linear-gradient(to right, ${A}, transparent)` }} />
      <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: A }}>{children}</h2>
    </div>
  )
}

function CollageCard({ tint, border, delay = 0, children }: { tint: string; border?: string; delay?: number; children: React.ReactNode }) {
  return (
    <div className="proj-card-float p-6 rounded-2xl w-full" style={{
      background: `linear-gradient(150deg, ${tint}, rgb(var(--bg-surface) / 0.5))`,
      border: `1px solid ${border || Aa(0.18)}`,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
      animationDelay: `${delay}s`,
    }}>
      {children}
    </div>
  )
}
