// /open-source — every upstream pull request in the HUD language of the
// journey: a floating title, telemetry of the real totals, then one machined
// plate per repository with a row per PR (newest first). Every number on this
// page is derived from data/open-source.ts; nothing is typed in by hand.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { SiSupabase } from 'react-icons/si'
import { contributions, openSourceStats } from '@/data/open-source'
import type { Contribution } from '@/data/open-source'
import { FlutterLogo, GitHubLogo, MergedGlyph } from '@/components/featured/BrandLogos'
import { PageHeader, Panel, Telemetry } from '@/components/site/primitives'
import { SOCIALS } from '@/lib/seo/site'
import css from './OpenSource.module.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-10-30" → "30 Oct 2026", without a timezone shift */
function shortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function daysBetween(a: string, b: string) {
  const t = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((t(b) - t(a)) / 86_400_000)
}

/** ["a", "b", "c"] → "a, b and c" */
function joinAnd(items: string[]) {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

function OrgLogo({ org, size }: { org: string; size: number }) {
  if (org === 'Flutter') return <FlutterLogo size={size} />
  if (org === 'Supabase') return <SiSupabase size={size} aria-hidden focusable={false} />
  return <GitHubLogo size={size} />
}

interface RepoGroup {
  repo: string
  repoUrl: string
  org: string
  project: string
  items: Contribution[]
}

/** One group per repository, in the order of each repo's newest PR. */
function groupByRepo(list: Contribution[]): RepoGroup[] {
  const sortKey = (c: Contribution) => c.mergedOn ?? c.openedOn
  const sorted = [...list].sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
  const groups = new Map<string, RepoGroup>()
  for (const c of sorted) {
    const g = groups.get(c.repo)
    if (g) g.items.push(c)
    else groups.set(c.repo, { repo: c.repo, repoUrl: c.repoUrl, org: c.org, project: c.project, items: [c] })
  }
  return [...groups.values()]
}

function Status({ status }: { status: Contribution['status'] }) {
  if (status === 'merged') {
    return (
      <span className={`t-data ${css.status} ${css.merged}`}>
        <MergedGlyph size={12} /> Merged
      </span>
    )
  }
  return (
    <span className={`t-data ${css.status}`}>
      <span className={css.pulse} aria-hidden /> {status === 'in-review' ? 'In review' : 'Open'}
    </span>
  )
}

function Row({ c }: { c: Contribution }) {
  const date = c.mergedOn ?? c.openedOn
  const days = c.mergedOn ? daysBetween(c.openedOn, c.mergedOn) : null
  const turnaround =
    days === null ? null : days === 0 ? 'merged same day' : `${plural(days, 'day', 'days')} to merge`

  return (
    <li className={css.row}>
      <div className={css.when}>
        <time dateTime={date} className="t-data">{shortDate(date)}</time>
        <span className={`t-data ${css.prNum}`}>#{c.prNumber}</span>
        <Status status={c.status} />
      </div>

      <div className={css.body}>
        <h3 className={`t-subtitle ${css.title}`}>
          <Link href={`/achievements/${c.id}`} className={css.stretch}>
            {c.title}
            <span className="sr-only">, read the case study</span>
          </Link>
        </h3>
        <p className={`t-data ${css.prTitle}`}>{c.prTitle}</p>
        <p className={`t-data ${css.meta}`}>
          <span>{plural(c.filesChanged, 'file', 'files')}</span>
          <span>
            <span className={css.add}>+{c.additions}</span> <span className={css.del}>−{c.deletions}</span>
          </span>
          {turnaround && <span>{turnaround}</span>}
          {c.issueNumber && c.issueUrl && (
            <a href={c.issueUrl} target="_blank" rel="noopener noreferrer" className={`link-quiet ${css.raise}`}>
              issue #{c.issueNumber}
            </a>
          )}
        </p>
      </div>

      <div className={css.side}>
        <a
          href={c.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn btn--ghost btn--sm ${css.raise} ${css.prBtn}`}
          aria-label={`View PR #${c.prNumber} on GitHub (opens in a new tab)`}
        >
          <GitHubLogo size={14} /> View PR <span className="btn-arrow" aria-hidden>↗</span>
        </a>
        <span className={`t-label ${css.cue}`} aria-hidden>
          Case study <span className={css.cueArrow}>→</span>
        </span>
      </div>
    </li>
  )
}

export function OpenSource() {
  const stats = openSourceStats()
  const groups = groupByRepo(contributions)
  // only projects that actually have a merged PR, so the lead never claims a merge that has not happened
  const projects = groups.filter((g) => g.items.some((c) => c.status === 'merged')).map((g) => `the ${g.project}`)
  const files = contributions.reduce((n, c) => n + c.filesChanged, 0)
  const latest = contributions
    .map((c) => c.mergedOn)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop()
  const open = stats.total - stats.merged
  const newest = groups[0]?.items[0]

  const telemetry: { label: string; value: ReactNode }[] = [
    { label: 'Merged PRs', value: <span className={css.big}>{stats.merged}</span> },
    { label: stats.repos === 1 ? 'Repository' : 'Repositories', value: <span className={css.big}>{stats.repos}</span> },
    {
      label: 'Lines changed',
      value: (
        <span className={css.big}>
          <span className={css.sign}>+</span>{stats.additions} <span className={css.sign}>−</span>{stats.deletions}
        </span>
      ),
    },
    { label: 'Files changed', value: <span className={css.big}>{files}</span> },
  ]
  if (latest) {
    telemetry.push({ label: 'Latest merge', value: <time dateTime={latest} className={`${css.big} ${css.bigDate}`}>{shortDate(latest)}</time> })
  }

  return (
    <>
      <PageHeader
        kicker="Open source · Upstream"
        title={'Merged\nupstream.'}
        lead={
          <>
            {plural(stats.merged, 'pull request', 'pull requests')} merged into {joinAnd(projects)}, the tools I build
            with{open > 0 ? `, and ${open} still in review` : ''}. Each one links to the PR on GitHub and to a write-up
            of what changed and why.
          </>
        }
      >
        {newest && (
          <Link href={`/achievements/${newest.id}`} className="btn btn--primary">
            Latest: #{newest.prNumber} <span className="btn-arrow" aria-hidden>→</span>
          </Link>
        )}
        <a href={SOCIALS.github} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
          <GitHubLogo size={15} /> GitHub profile <span className="btn-arrow" aria-hidden>↗</span>
        </a>
      </PageHeader>

      <section aria-label="Totals" className={css.totals}>
        <Telemetry items={telemetry} />
      </section>

      <div className={css.groups}>
        {groups.map((g) => {
          const merged = g.items.filter((c) => c.status === 'merged').length
          const headId = `repo-${g.repo.replace(/[^a-z0-9]+/gi, '-')}`
          return (
            <Panel key={g.repo} className={css.group}>
              <div className={css.groupHead}>
                <span className={css.logo}><OrgLogo org={g.org} size={22} /></span>
                <div className={css.groupName}>
                  <h2 id={headId} className={`t-title ${css.project}`}>{g.project}</h2>
                  <a href={g.repoUrl} target="_blank" rel="noopener noreferrer" className={`t-data link-quiet ${css.repo}`}>
                    {g.repo} <span aria-hidden>↗</span>
                  </a>
                </div>
                <p className={`t-data ${css.count}`}>
                  {merged === g.items.length ? `${merged} merged` : `${merged} merged · ${g.items.length - merged} open`}
                </p>
              </div>
              <ol className={css.rows} aria-labelledby={headId}>
                {g.items.map((c) => <Row key={c.id} c={c} />)}
              </ol>
            </Panel>
          )
        })}
      </div>
    </>
  )
}
