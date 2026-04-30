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

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const project = await findProject(slug)
  if (!project) notFound()

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Projects', url: `${SITE_URL}/#projects` },
    { name: project.title, url: `${SITE_URL}/projects/${project.id}` },
  ])

  return (
    <>
      <JsonLd data={projectSchema(project)} />
      <JsonLd data={breadcrumbs} />

      <Navbar />

      <main className="min-h-screen pt-32 pb-24 px-6">
        <article className="max-w-content mx-auto">

          <nav aria-label="Breadcrumb" className="font-mono text-xs text-text-muted mb-6">
            <Link href="/" className="hover:text-accent-violet">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/#projects" className="hover:text-accent-violet">Projects</Link>
            <span className="mx-2">/</span>
            <span className="text-accent-violet">{project.title}</span>
          </nav>

          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-4 font-mono text-xs">
              <span className="text-accent-cyan uppercase tracking-widest">{project.company}</span>
              <span className="text-text-muted">•</span>
              <span className="text-text-muted uppercase tracking-widest">{project.category}</span>
              <span className="text-text-muted">•</span>
              <span className="text-text-muted">{project.year}</span>
            </div>

            <h1 className="font-display font-extrabold text-4xl md:text-6xl text-text-primary leading-tight mb-4">
              {project.title}
            </h1>

            <p className="text-lg md:text-xl text-text-secondary max-w-3xl leading-relaxed">
              {project.tagline}
            </p>
          </header>

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-accent-violet/15 mb-12 bg-bg-elevated">
            <Image
              src={project.image}
              alt={`${project.title} — ${project.tagline}`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            <div className="lg:col-span-2 space-y-10">
              <section>
                <h2 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Overview</h2>
                <p className="text-text-secondary leading-relaxed">{project.description}</p>
              </section>

              <section>
                <h2 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Problem</h2>
                <p className="text-text-secondary leading-relaxed">{project.problem}</p>
              </section>

              <section>
                <h2 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Solution</h2>
                <p className="text-text-secondary leading-relaxed">{project.solution}</p>
              </section>

              <section>
                <h2 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Key Features</h2>
                <ul className="space-y-2">
                  {project.features.map((f) => (
                    <li key={f} className="text-text-secondary leading-relaxed flex gap-3">
                      <span className="text-accent-cyan flex-shrink-0">▶</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <aside className="space-y-8">
              <div>
                <h2 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Tech Stack</h2>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 text-xs font-mono rounded-full bg-accent-violet/10 border border-accent-violet/20 text-text-secondary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-mono text-xs text-accent-violet uppercase tracking-widest mb-3">Built By</h2>
                <p className="text-text-secondary leading-relaxed">
                  <Link href="/" className="text-accent-cyan hover:text-accent-violet transition-colors">
                    {AUTHOR.name}
                  </Link>{' '}
                  — {AUTHOR.jobTitle} based in {AUTHOR.city}, {AUTHOR.countryName}.
                </p>
              </div>

              {(project.liveUrl || project.githubUrl) && (
                <div className="space-y-2">
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full text-center px-4 py-2.5 rounded-lg bg-accent-violet text-white font-medium text-sm hover:shadow-neon-violet transition-all"
                    >
                      View Live →
                    </a>
                  )}
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full text-center px-4 py-2.5 rounded-lg border border-accent-violet/30 text-text-secondary hover:text-accent-violet hover:border-accent-violet/60 transition-all text-sm"
                    >
                      View Source →
                    </a>
                  )}
                </div>
              )}
            </aside>
          </div>

          <section className="border-t border-accent-violet/15 pt-10">
            <h2 className="font-display font-bold text-2xl text-text-primary mb-6">More Projects</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects
                .filter((p) => p.id !== project.id)
                .slice(0, 4)
                .map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="block p-4 rounded-xl border border-accent-violet/15 hover:border-accent-cyan/40 hover:bg-accent-violet/5 transition-all"
                    >
                      <span className="font-mono text-xs text-accent-cyan uppercase tracking-widest">{p.company}</span>
                      <p className="font-display font-semibold text-text-primary mt-1">{p.title}</p>
                      <p className="text-sm text-text-secondary mt-1 line-clamp-2">{p.tagline}</p>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>

        </article>
      </main>

      <Footer />
    </>
  )
}
