import type { Metadata } from 'next'
import Link from 'next/link'
import { contributions, openSourceStats } from '@/data/open-source'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, openSourceCollectionSchema } from '@/lib/seo/jsonld'
import { SITE_URL, AUTHOR, SOCIALS } from '@/lib/seo/site'
import { StarfieldBackground } from '@/components/mobile/StarfieldBackground'
import { FlutterLogo, GitHubLogo, MergedGlyph } from '@/components/featured/BrandLogos'

const A = 'rgb(var(--os-accent))'
const Aa = (a: number) => `rgb(var(--os-accent) / ${a})`
const TXT = 'rgb(var(--text-primary))'
const SUB = 'rgb(var(--text-secondary))'
const MERGED = 'rgb(var(--status-merged))'
const REMOVED = 'rgb(var(--status-removed))'
const FLUTTER = '#54C5F8'                       // decorative tints/borders only
const FLUTTER_T = 'rgb(var(--flutter-accent))'  // Flutter blue for the logo/icon — AA in light

export const metadata: Metadata = {
  title: 'Open Source Contributions',
  description:
    'Open-source contributions by Shah Fahad, a React and Flutter developer from Pakistan — three merged pull requests across the official Flutter repository (flutter/flutter) and the Supabase Flutter SDK.',
  alternates: { canonical: '/open-source' },
  keywords: [
    'Flutter open source contributor',
    'Flutter framework contribution',
    'Flutter open source',
    'Flutter GitHub PR',
    'open source contributor Pakistan',
    'Software Engineer Pakistan',
    'React and Flutter developer',
    `${AUTHOR.name} open source`,
  ],
  openGraph: {
    type: 'website',
    title: 'Open Source Contributions — Shah Fahad',
    description:
      'Contributing to the tools I build with — merged pull requests in flutter/flutter and supabase/supabase-flutter.',
    url: `${SITE_URL}/open-source`,
    siteName: 'Shah Fahad',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Source Contributions — Shah Fahad',
    description:
      'Three merged pull requests — a Postgres array parser in the Supabase Flutter SDK, a clearer setState()-after-dispose diagnostic, and the documented super call order for didChangeDependencies.',
  },
}

export default function OpenSourcePage() {
  const stats = openSourceStats()
  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Open Source', url: `${SITE_URL}/open-source` },
  ])

  const statCards: [string, string][] = [
    [String(stats.merged), stats.merged === 1 ? 'PR merged' : 'PRs merged'],
    [String(stats.repos), stats.repos === 1 ? 'Repository' : 'Repositories'],
    [`+${stats.additions}`, 'Lines added'],
  ]

  return (
    <>
      <JsonLd data={openSourceCollectionSchema()} />
      <JsonLd data={breadcrumbs} />

      <StarfieldBackground />
      <div aria-hidden className="fixed inset-0 -z-[5] pointer-events-none" style={{ background: `radial-gradient(900px 600px at 80% -5%, ${FLUTTER}1f, transparent 55%)` }} />

      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(rgb(var(--bg-base) / 0.7), transparent)' }}>
        <Link href="/" className="font-mono text-[11px] tracking-[0.18em] uppercase flex items-center gap-2" style={{ color: TXT }}>
          <span style={{ color: A }}>←</span> Home
        </Link>
        <Link href="/" className="font-mono text-[11px] tracking-[0.18em] font-bold" style={{ color: TXT }}>SHAH FAHAD</Link>
      </header>

      <main className="relative z-10 min-h-screen px-5 sm:px-8 pt-28 sm:pt-36 pb-24 overflow-hidden">
        <div className="max-w-3xl mx-auto">

          {/* ── HERO ─────────────────────────────────────────────────────── */}
          <div className="font-mono text-[10px] tracking-[0.28em] uppercase mb-3" style={{ color: A }}>Contributions · flutter/flutter &amp; beyond</div>
          <h1 className="font-display font-extrabold leading-[1.02] mb-5" style={{ fontSize: 'clamp(40px, 8vw, 72px)', letterSpacing: '-0.03em', color: TXT }}>
            Open <span style={{ color: A }}>Source</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-2xl" style={{ color: SUB }}>
            I contribute to the tools I build with. As a React and Flutter developer from {AUTHOR.city}, {AUTHOR.countryName},
            I have had {stats.merged === 1 ? 'a pull request' : `${stats.merged} pull requests`} merged across the
            official Flutter repository (flutter/flutter) and the Supabase Flutter SDK — most recently replacing a
            comma-splitting shortcut that was quietly corrupting Postgres array values in realtime payloads.
          </p>

          {/* stats */}
          <div className="flex flex-wrap gap-4 mt-9">
            {statCards.map(([v, l]) => (
              <div key={l} className="flex flex-col px-6 py-4 rounded-2xl" style={{ background: Aa(0.05), border: `1px solid ${Aa(0.16)}` }}>
                <span className="font-display font-extrabold" style={{ fontSize: 30, color: A }}>{v}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] mt-1" style={{ color: SUB }}>{l}</span>
              </div>
            ))}
            <a href={SOCIALS.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-4 rounded-2xl font-mono text-[12px]" style={{ color: TXT, background: Aa(0.05), border: `1px solid ${Aa(0.16)}` }}>
              <GitHubLogo size={18} /> @fahaddoc ↗
            </a>
          </div>

          {/* ── TIMELINE ─────────────────────────────────────────────────── */}
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-8">
              <span aria-hidden className="h-px w-10" style={{ background: `linear-gradient(to right, ${A}, transparent)` }} />
              <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: A }}>Contribution Timeline</h2>
            </div>

            <ol className="space-y-6 list-none p-0 m-0">
              {contributions.map((c) => (
                <li key={c.id}>
                  <article className="relative rounded-2xl p-6" style={{ background: 'rgb(var(--bg-surface) / 0.5)', backdropFilter: 'blur(10px)', border: `1px solid ${Aa(0.18)}`, boxShadow: '0 18px 50px rgb(0 0 0 / 0.28)' }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: `${FLUTTER}1f`, border: `1px solid ${FLUTTER}55`, color: FLUTTER_T }}>
                        <FlutterLogo size={22} title={`${c.org} logo`} />
                      </span>
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] tracking-[0.12em]" style={{ color: A }}>{c.repo} · #{c.prNumber}</span>
                        <span className="font-display font-bold text-lg leading-tight" style={{ color: TXT }}>{c.title}</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-1.5 rounded-full" style={{ color: MERGED, background: 'rgb(var(--status-merged) / 0.12)', border: '1px solid rgb(var(--status-merged) / 0.4)' }}>
                        <MergedGlyph size={12} /> Merged
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed mt-4" style={{ color: 'rgb(var(--text-primary) / 0.82)' }}>{c.prTitle}</p>

                    <div className="flex items-center gap-4 mt-4 font-mono text-[11px]" style={{ color: SUB }}>
                      <time dateTime={c.mergedOn}>{c.displayDate}</time>
                      <span aria-hidden>·</span>
                      <span>{c.filesChanged} files</span>
                      <span style={{ color: MERGED }}>+{c.additions}</span>
                      <span style={{ color: REMOVED }}>−{c.deletions}</span>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-5">
                      <Link href={`/achievements/${c.id}`} className="inline-flex items-center px-5 py-2.5 rounded-xl font-mono text-[11px] tracking-[0.14em] uppercase font-bold" style={{ color: '#05070d', background: A }}>
                        Read case study →
                      </Link>
                      <a href={c.prUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-[11px] tracking-[0.14em] uppercase font-bold" style={{ color: A, border: `1px solid ${Aa(0.4)}` }}>
                        <GitHubLogo size={13} /> View PR ↗
                      </a>
                    </div>
                  </article>
                </li>
              ))}
            </ol>

            {/* scalable footer note — new contributions land here automatically */}
            <p className="mt-8 font-mono text-[11px] leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>
              More contributions are on the way — each new merged PR is added here and gets its own case study.
            </p>
          </section>

          <div className="mt-16 pt-10 flex flex-col sm:flex-row items-start justify-between gap-6" style={{ borderTop: `1px solid ${Aa(0.15)}` }}>
            <p className="text-sm leading-relaxed" style={{ color: SUB }}>
              <Link href="/" className="underline underline-offset-2" style={{ color: A }}>{AUTHOR.name}</Link> — {AUTHOR.jobTitle}, {AUTHOR.city}, {AUTHOR.countryName}.
            </p>
            <div className="mt-16 sm:mt-0 text-center font-mono text-[10px]" style={{ color: 'rgb(var(--text-secondary))' }}>© 2026 Shah Fahad · built in space</div>
          </div>
        </div>
      </main>
    </>
  )
}
