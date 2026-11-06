// Achievement — the page for one upstream contribution (/achievements/[slug]).
// Server component: the shell and primitives are client islands, everything
// else (dates, durations, the diff) renders on the server from
// data/open-source.ts. Every value shown is a field of the contribution or a
// plain derivation of one (days from opened to merged); nothing is invented.

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Contribution } from '@/data/open-source'
import { PageShell } from '@/components/site/PageShell'
import { PageHeader, Panel, Telemetry, Viewport } from '@/components/site/primitives'
import { FlutterLogo, GitHubLogo, MergedGlyph } from '@/components/featured/BrandLogos'
import { AUTHOR } from '@/lib/seo/site'
import s from './Achievement.module.css'

const STATUS = {
  merged: { kicker: 'Merged upstream', short: 'Merged' },
  'in-review': { kicker: 'In review upstream', short: 'In review' },
  open: { kicker: 'Open upstream', short: 'Open' },
} as const

const DAY = 86_400_000

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

function openToMerge(c: Contribution) {
  if (!c.mergedOn) return null
  const days = Math.round((Date.parse(c.mergedOn) - Date.parse(c.openedOn)) / DAY)
  return days <= 0 ? 'Same day' : `${days} ${days === 1 ? 'day' : 'days'}`
}

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={s.out}>
      {children}<span aria-hidden className={s.arrow}>↗</span>
      <span className={s.sr}> (opens in a new tab)</span>
    </a>
  )
}

function Mark({ org, size }: { org: string; size: number }) {
  return org === 'Flutter' ? <FlutterLogo size={size} /> : <GitHubLogo size={size} />
}

function Size({ c }: { c: Contribution }) {
  return (
    <span className={s.size}>
      {c.filesChanged} {c.filesChanged === 1 ? 'file' : 'files'}
      <span className={s.add}>+{c.additions}</span>
      <span className={s.del}>−{c.deletions}</span>
    </span>
  )
}

function Row({ n, id, title, children }: { n: string; id: string; title: string; children: ReactNode }) {
  return (
    <section className={s.row} aria-labelledby={id}>
      <Panel as="div" className={s.plate}>
        <div className={s.rowHead}>
          <span className={`t-data ${s.num}`} aria-hidden>{n}</span>
          <h2 id={id} className={`t-subtitle ${s.rowTitle}`}>{title}</h2>
        </div>
        <div className={s.rowBody}>{children}</div>
      </Panel>
    </section>
  )
}

function Diff({ sign, kind, code }: { sign: '+' | '−'; kind: 'add' | 'del'; code: string }) {
  return (
    <pre className={`${s.code} ${kind === 'add' ? s.codeAdd : s.codeDel}`}>
      <span className={s.sr}>{kind === 'add' ? 'After:' : 'Before:'}</span>
      {code.split('\n').map((line, i) => (
        <span key={i} className={s.line}>
          <span aria-hidden className={s.sign}>{sign}</span>
          <code>{line || ' '}</code>
        </span>
      ))}
    </pre>
  )
}

function NavPlate({ to, dir }: { to?: Contribution; dir: 'older' | 'newer' }) {
  if (!to) {
    return (
      <Link href="/open-source" className={`${s.navPlate} ${s.navEnd} ${dir === 'newer' ? s.navRight : ''}`}>
        <span className={`t-data ${s.navKicker}`}>{dir === 'older' ? 'Earliest merge on file' : 'Latest merge on file'}</span>
        <span className={`t-subtitle ${s.navTitle}`}>All open-source work</span>
        <span className={`t-data ${s.navMeta}`}>Back to the hub</span>
      </Link>
    )
  }
  return (
    <Link href={`/achievements/${to.id}`} className={`${s.navPlate} ${dir === 'newer' ? s.navRight : ''}`}>
      {/* the arrow sits on the outer edge, pointing the way the plate goes */}
      <span className={`t-data ${s.navKicker}`}>
        {dir === 'older'
          ? <><span aria-hidden>← </span>Older merge · {to.displayDate}</>
          : <>Newer merge · {to.displayDate}<span aria-hidden> →</span></>}
      </span>
      <span className={`t-subtitle ${s.navTitle}`}>{to.title}</span>
      <span className={`t-data ${s.navMeta}`}>{to.repo} · #{to.prNumber}</span>
    </Link>
  )
}

export function Achievement({ c, newer, older, total }: {
  c: Contribution
  newer?: Contribution
  older?: Contribution
  total: number
}) {
  const st = STATUS[c.status]
  const merged = c.status === 'merged'
  const duration = openToMerge(c)
  const cs = c.caseStudy

  const readout = [
    { label: 'Repository', value: <Out href={c.repoUrl}>{c.repo}</Out> },
    { label: 'Pull request', value: <Out href={c.prUrl}>#{c.prNumber}</Out> },
    {
      label: 'Status',
      value: <span className={merged ? s.merged : undefined}>{merged && <MergedGlyph size={13} />} {st.short}</span>,
    },
    ...(c.mergedOn ? [{ label: 'Merged', value: <time dateTime={c.mergedOn}>{c.displayDate}</time> }] : []),
    { label: 'Opened', value: <time dateTime={c.openedOn}>{fmtDate(c.openedOn)}</time> },
    ...(duration ? [{ label: 'Open to merge', value: duration }] : []),
    { label: 'Change size', value: <Size c={c} /> },
    ...(c.issueNumber && c.issueUrl ? [{ label: 'Closes issue', value: <Out href={c.issueUrl}>#{c.issueNumber}</Out> }] : []),
    ...(c.mergeCommit && c.mergeCommitUrl ? [{ label: 'Merge commit', value: <Out href={c.mergeCommitUrl}>{c.mergeCommit}</Out> }] : []),
    { label: 'Project', value: c.project },
    { label: 'Language', value: c.language },
    { label: 'Stack', value: c.tech.join(' · ') },
  ]

  return (
    <PageShell back={{ href: '/open-source', label: 'Open source' }} where="Merged PR">
      <article className={s.page}>
        <div className={s.top}>
          <PageHeader
            kicker={<>{st.kicker} <span aria-hidden>·</span> {c.repo} <span aria-hidden>·</span> #{c.prNumber}</>}
            title={c.title}
            lead={c.summary}
          >
            <a href={c.prUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
              <GitHubLogo size={16} /> View the PR <span aria-hidden className="btn-arrow">↗</span>
              <span className={s.sr}> (opens in a new tab)</span>
            </a>
            <a href={c.repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              {c.repo} <span aria-hidden className="btn-arrow">↗</span>
              <span className={s.sr}> (opens in a new tab)</span>
            </a>
          </PageHeader>

          {/* mission patch: the org mark and the PR's state, a quick read of the same readout below */}
          <div className={s.patchWrap} aria-hidden>
            <Viewport className={s.patch}>
              <div className={s.patchIn}>
                <span className={s.patchMark}><Mark org={c.org} size={52} /></span>
                <span className={`t-subtitle ${s.patchOrg}`}>{c.org}</span>
                <span className={`t-data ${s.patchRole}`}>{c.role}</span>
                <span className={`t-data ${s.patchState} ${merged ? s.merged : ''}`}>
                  {merged && <MergedGlyph size={13} />} {st.short} · #{c.prNumber}
                </span>
              </div>
            </Viewport>
          </div>
        </div>

        <Panel label="Readout" className={s.readout}>
          <p className={s.prTitle}>
            <span className={`t-data ${s.prTitleLabel}`}>Pull request title</span>
            <span className={s.prTitleText}>{c.prTitle}</span>
          </p>
          <Telemetry items={readout} />
          <p className={`t-label ${s.byline}`}>
            Contributed by <Link href="/" className="link-quiet">{AUTHOR.name}</Link>, {AUTHOR.jobTitle} in {AUTHOR.city}, {AUTHOR.countryName}.
          </p>
        </Panel>

        <section className={s.glance} aria-labelledby="glance">
          <h2 id="glance" className={`t-data ${s.glanceTitle}`}>At a glance</h2>
          <ul className={s.glanceList}>
            {c.bullets.map((b, i) => (
              <li key={i} className={s.glanceItem}>
                <span className={`t-data ${s.num}`} aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className={s.rows}>
          <Row n="01" id="context" title="Context">
            <p className={s.prose}>{cs.story}</p>
          </Row>

          <Row n="02" id="problem" title="The problem">
            <p className={s.prose}>{cs.problem}</p>
          </Row>

          <Row n="03" id="changed" title="What changed">
            <ol className={s.steps}>
              {cs.changed.map((item, i) => (
                <li key={i}>
                  <span className={`t-data ${s.num}`} aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>

            <Viewport className={s.diffFrame}>
              <figure className={s.diff}>
                <figcaption className={`t-data ${s.diffCap}`}>
                  <span className={s.diffFile}>{c.area[0]}</span>
                  <span className={s.diffNote}>Excerpt from the diff</span>
                </figcaption>
                {/* addition-only PRs have no codeBefore: a red block of unchanged
                    context would contradict the −0 in the readout */}
                {cs.codeBefore && <Diff sign="−" kind="del" code={cs.codeBefore} />}
                <Diff sign="+" kind="add" code={cs.codeAfter} />
              </figure>
            </Viewport>

            <div className={s.files}>
              <p className={`t-data ${s.filesLabel}`}>
                {c.area.length === 1 ? 'File touched' : `Files touched · ${c.area.length}`}
              </p>
              <ul className={s.fileList}>
                {c.area.map((f) => <li key={f} className="t-data">{f}</li>)}
              </ul>
            </div>
          </Row>

          <Row n="04" id="review" title="Review and merge">
            <ol className={s.log}>
              <li>
                <span className={`t-data ${s.logWhen}`}>Opened · <time dateTime={c.openedOn}>{fmtDate(c.openedOn)}</time></span>
              </li>
              <li>
                <span className={`t-data ${s.logWhen}`}>Review</span>
                <p className={s.prose}>{cs.review}</p>
              </li>
              <li className={merged ? s.logDone : undefined}>
                <span className={`t-data ${s.logWhen}`}>
                  {c.mergedOn ? <>Merged · <time dateTime={c.mergedOn}>{c.displayDate}</time></> : st.short}
                </span>
                <p className={s.prose}>{cs.merge}</p>
                {c.mergeCommit && c.mergeCommitUrl && (
                  <p className={`t-data ${s.commit}`}>
                    <MergedGlyph size={13} /> <Out href={c.mergeCommitUrl}>Merge commit {c.mergeCommit}</Out>
                  </p>
                )}
              </li>
            </ol>
          </Row>

          <Row n="05" id="why" title="Why it matters">
            <p className={`${s.prose} ${s.why}`}>{cs.whyItMatters}</p>
          </Row>

          <Row n="06" id="lessons" title="Lessons">
            <ol className={s.steps}>
              {cs.lessons.map((l, i) => (
                <li key={i}>
                  <span className={`t-data ${s.num}`} aria-hidden>L{i + 1}</span>
                  <span>{l}</span>
                </li>
              ))}
            </ol>
          </Row>
        </div>

        <nav className={s.nav} aria-label={`More contributions, ${total} on file`}>
          <NavPlate to={older} dir="older" />
          <NavPlate to={newer} dir="newer" />
        </nav>
      </article>
    </PageShell>
  )
}
