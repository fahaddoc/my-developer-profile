import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { contributions, getContribution } from '@/data/open-source'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, techArticleSchema } from '@/lib/seo/jsonld'
import { SITE_URL, AUTHOR } from '@/lib/seo/site'
import { StarfieldBackground } from '@/components/mobile/StarfieldBackground'
import { FlutterLogo, GitHubLogo, MergedGlyph } from '@/components/featured/BrandLogos'

export const dynamicParams = false

export function generateStaticParams() {
  return contributions.map((c) => ({ slug: c.id }))
}

type Params = { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const c = getContribution(slug)
  if (!c) return {}

  const title = `${c.title} — ${c.org} Open Source`
  const description = c.summary
  const url = `${SITE_URL}/achievements/${c.id}`

  return {
    title,
    description,
    alternates: { canonical: `/achievements/${c.id}` },
    keywords: [
      ...c.keywords,
      `${AUTHOR.name} Flutter contributor`,
      'React and Flutter developer',
      'Software Engineer Pakistan',
      'Full Stack Engineer Pakistan',
    ],
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'Shah Fahad',
      publishedTime: c.mergedOn,
      modifiedTime: c.mergedOn,
      authors: [SITE_URL],
      tags: c.tech,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// Flutter-blue identity for this page, layered over the shared space theme.
const PC = '#54C5F8'                          // decorative tints/borders only (alpha-suffixed)
const PCT = 'rgb(var(--flutter-accent))'      // Flutter blue for text/icons — AA in both themes
const A = 'rgb(var(--os-accent))'
const Aa = (a: number) => `rgb(var(--os-accent) / ${a})`
const TXT = 'rgb(var(--text-primary))'
const SUB = 'rgb(var(--text-secondary))'
const MERGED = 'rgb(var(--status-merged))'
const REMOVED = 'rgb(var(--status-removed))'

export default async function AchievementPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const c = getContribution(slug)
  if (!c) notFound()

  const url = `${SITE_URL}/achievements/${c.id}`
  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Open Source', url: `${SITE_URL}/open-source` },
    { name: c.title, url },
  ])

  return (
    <>
      <JsonLd data={techArticleSchema(c)} />
      <JsonLd data={breadcrumbs} />

      <StarfieldBackground />
      <div aria-hidden className="fixed inset-0 -z-[5] pointer-events-none" style={{ background: `radial-gradient(900px 600px at 80% -5%, ${PC}22, transparent 55%)` }} />

      {/* slim space chrome */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(rgb(var(--bg-base) / 0.7), transparent)' }}>
        <Link href="/open-source" className="font-mono text-[11px] tracking-[0.18em] uppercase flex items-center gap-2" style={{ color: TXT }}>
          <span style={{ color: A }}>←</span> Open Source
        </Link>
        <Link href="/" className="font-mono text-[11px] tracking-[0.18em] font-bold" style={{ color: TXT }}>SHAH FAHAD</Link>
      </header>

      <main className="relative z-10 min-h-screen px-5 sm:px-8 pt-28 sm:pt-36 pb-24 overflow-hidden">
        <article className="max-w-3xl mx-auto">

          {/* ── HERO ─────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-6">
            <span className="inline-flex items-center justify-center rounded-2xl" style={{ width: 60, height: 60, background: `linear-gradient(150deg, ${PC}22, rgb(var(--bg-surface) / 0.6))`, border: `1px solid ${PC}55`, color: PCT }}>
              <FlutterLogo size={30} title="Flutter" />
            </span>
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] px-3 py-1.5 rounded-full"
              style={{ color: MERGED, background: 'rgb(var(--status-merged) / 0.12)', border: '1px solid rgb(var(--status-merged) / 0.4)' }}
            >
              <MergedGlyph size={13} /> Merged
            </span>
            <time dateTime={c.mergedOn} className="font-mono text-[11px]" style={{ color: SUB }}>{c.displayDate}</time>
          </div>

          <div className="font-mono text-[10px] tracking-[0.28em] uppercase mb-3" style={{ color: A }}>
            {c.org} · Open Source · #{c.prNumber}
          </div>
          <h1 className="font-display font-extrabold leading-[1.02] mb-4" style={{ fontSize: 'clamp(34px, 6vw, 60px)', letterSpacing: '-0.03em', color: TXT }}>
            {c.title}<span style={{ color: PCT }}>.</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: SUB }}>{c.prTitle}</p>

          {/* meta chips */}
          <div className="flex flex-wrap gap-2.5 mt-6">
            {c.tech.map((t) => (
              <span key={t} className="font-mono text-[11px] px-3 py-1.5 rounded-full" style={{ color: 'rgb(var(--chip-fg))', background: Aa(0.07), border: `1px solid ${Aa(0.3)}` }}>{t}</span>
            ))}
            <span className="font-mono text-[11px] px-3 py-1.5 rounded-full" style={{ color: MERGED, background: 'rgb(var(--status-merged) / 0.08)', border: '1px solid rgb(var(--status-merged) / 0.3)' }}>
              {c.filesChanged} files · +{c.additions}/−{c.deletions}
            </span>
          </div>

          {/* primary CTA */}
          <div className="flex flex-wrap gap-3 mt-8">
            <a href={c.prUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-mono text-[11px] tracking-[0.16em] uppercase font-bold transition-transform hover:scale-[1.03]" style={{ color: '#05070d', background: A, boxShadow: `0 0 28px ${Aa(0.45)}` }}>
              <GitHubLogo size={15} /> View Pull Request ↗
            </a>
            {c.issueUrl && (
              <a href={c.issueUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-6 py-3.5 rounded-xl font-mono text-[11px] tracking-[0.16em] uppercase font-bold" style={{ color: A, border: `1px solid ${Aa(0.5)}`, background: Aa(0.04) }}>
                Original Issue ↗
              </a>
            )}
          </div>

          {/* ── STORY ────────────────────────────────────────────────────── */}
          <Section label="The Story"><Prose>{c.caseStudy.story}</Prose></Section>

          {/* ── PROBLEM ──────────────────────────────────────────────────── */}
          <Section label="The Problem"><Prose>{c.caseStudy.problem}</Prose></Section>

          {/* ── WHAT I CHANGED ───────────────────────────────────────────── */}
          <Section label="What I Changed">
            <ul className="space-y-3">
              {c.caseStudy.changed.map((item, i) => (
                <li key={i} className="flex gap-3 leading-relaxed" style={{ color: 'rgb(var(--text-primary) / 0.85)' }}>
                  <span className="font-mono text-[11px] mt-1 flex-shrink-0" style={{ color: PCT }}>{String(i + 1).padStart(2, '0')}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* the actual diff */}
            <figure className="mt-7 rounded-xl overflow-hidden" style={{ border: `1px solid ${Aa(0.2)}`, background: 'rgb(var(--bg-surface) / 0.55)' }}>
              <figcaption className="font-mono text-[10px] px-4 py-2.5 tracking-[0.1em]" style={{ color: SUB, borderBottom: `1px solid ${Aa(0.14)}` }}>
                {c.area[0]}
              </figcaption>
              {/* addition-only PRs have no `codeBefore` — showing a red "−" block for
                  unchanged context would misrepresent the +N/−0 stat above */}
              {c.caseStudy.codeBefore && (
                <CodeBlock sign="-" color={REMOVED} bg="rgb(var(--status-removed) / 0.08)">{c.caseStudy.codeBefore}</CodeBlock>
              )}
              <CodeBlock sign="+" color={MERGED} bg="rgb(var(--status-merged) / 0.08)">{c.caseStudy.codeAfter}</CodeBlock>
            </figure>
          </Section>

          {/* ── REVIEW ───────────────────────────────────────────────────── */}
          <Section label="The Review Process"><Prose>{c.caseStudy.review}</Prose></Section>

          {/* ── MERGE ────────────────────────────────────────────────────── */}
          <Section label="The Merge">
            <Prose>{c.caseStudy.merge}</Prose>
            {c.mergeCommitUrl && (
              <a href={c.mergeCommitUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 font-mono text-[12px]" style={{ color: PCT }}>
                <MergedGlyph size={14} /> {c.mergeCommit} ↗
              </a>
            )}
          </Section>

          {/* ── WHY IT MATTERS ───────────────────────────────────────────── */}
          <Section label="Why It Matters"><Prose>{c.caseStudy.whyItMatters}</Prose></Section>

          {/* ── LESSONS ──────────────────────────────────────────────────── */}
          <Section label="Lessons Learned">
            <ul className="space-y-3">
              {c.caseStudy.lessons.map((l, i) => (
                <li key={i} className="flex gap-3 leading-relaxed" style={{ color: 'rgb(var(--text-primary) / 0.85)' }}>
                  <span className="flex-shrink-0" style={{ color: PCT }}>▹</span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* ── BUILT BY + BACK ──────────────────────────────────────────── */}
          <section className="mt-16 pt-10 flex flex-col sm:flex-row gap-6 items-start justify-between" style={{ borderTop: `1px solid ${Aa(0.15)}` }}>
            <p className="text-sm leading-relaxed" style={{ color: SUB }}>
              Contributed by <Link href="/" className="underline underline-offset-2" style={{ color: A }}>{AUTHOR.name}</Link> — {AUTHOR.jobTitle}, {AUTHOR.city}, {AUTHOR.countryName}.<br />
              A React and Flutter developer contributing to open source.
            </p>
            <Link href="/open-source" className="flex-shrink-0 inline-flex items-center px-5 py-3 rounded-xl font-mono text-[11px] tracking-[0.16em] uppercase font-bold" style={{ color: A, border: `1px solid ${Aa(0.4)}` }}>
              ← All open source
            </Link>
          </section>

          <div className="mt-16 text-center font-mono text-[10px]" style={{ color: 'rgb(var(--text-secondary))' }}>
            © 2026 Shah Fahad · built in space
          </div>
        </article>
      </main>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <div className="flex items-center gap-3 mb-5">
        <span aria-hidden className="h-px w-10" style={{ background: `linear-gradient(to right, ${A}, transparent)` }} />
        <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: A }}>{label}</h2>
      </div>
      {children}
    </section>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="leading-[1.75] text-[15px] sm:text-base" style={{ color: 'rgb(var(--text-primary) / 0.82)' }}>{children}</p>
}

function CodeBlock({ sign, color, bg, children }: { sign: string; color: string; bg: string; children: string }) {
  return (
    <pre className="overflow-x-auto px-4 py-3 text-[12px] leading-relaxed m-0" style={{ background: bg, fontFamily: 'var(--font-mono), monospace' }}>
      {children.split('\n').map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, whiteSpace: 'pre-wrap' }}>
          <span aria-hidden style={{ color, flexShrink: 0, userSelect: 'none' }}>{sign}</span>
          <code style={{ color: 'rgb(var(--text-primary) / 0.9)' }}>{line}</code>
        </div>
      ))}
    </pre>
  )
}
