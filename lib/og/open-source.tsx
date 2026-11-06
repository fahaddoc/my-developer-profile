// lib/og/open-source.tsx
// Share images for /open-source (the hub) and /achievements/[slug] (one PR).
// Everything shown is read from data/open-source.ts: status, repo, PR number,
// diff, file count and date are the merged PR's real values.

import { ImageResponse } from 'next/og'
import { contributions as allContributions, type Contribution, type OpenSourceStats } from '@/data/open-source'
import { AUTHOR } from '@/lib/seo/site'
import { OG_SIZE } from '@/lib/seo/og'
import { ogFonts } from './fonts'
import { GITHUB_MARK, orgMark } from './marks'
import { C, FONT } from './theme'
import { Data, Lamp, Plate, Readout, Title } from './plate'

const PAD = '62px 76px 60px 76px'

/* eslint-disable @next/next/no-img-element */
const markImg = (src: string, size: number, key: string) => <img key={key} src={src} width={size} height={size} alt="" />

const STATUS_WORD: Record<Contribution['status'], string> = {
  merged: 'MERGED',
  'in-review': 'IN REVIEW',
  open: 'OPEN',
}

function headline(c: Contribution) {
  const org = c.org.toUpperCase()
  if (c.status === 'merged') return `Merged into ${org}`
  if (c.status === 'in-review') return `In review at ${org}`
  return `Open PR to ${org}`
}

/** "a", "a and b", "a, b and c". */
function listJoin(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// Tektur 800 caps run ~0.6em per glyph; shrink long headlines (a longer org
// name) to stay on one line inside the 1048px content width.
const fitTitle = (text: string, max: number) => Math.min(max, Math.floor(1040 / (text.length * 0.6)))

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

function lead(text: string, maxWidth = 1000) {
  return (
    <div style={{ display: 'flex', fontFamily: FONT.body, fontSize: 30, lineHeight: 1.35, color: C.ink2, maxWidth, textWrap: 'balance' }}>
      {text}
    </div>
  )
}

export async function renderAchievementOg(c: Contribution): Promise<ImageResponse> {
  const fonts = await ogFonts()
  const org = orgMark(c.org)
  const dateLabel = c.status === 'merged' ? 'Merged on' : 'Opened on'

  return new ImageResponse(
    (
      <Plate>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', padding: PAD }}>
          {[
            <div key="strip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {org ? markImg(org, 40, 'org') : null}
                {markImg(GITHUB_MARK, 34, 'gh')}
                <Data color={C.chrome} track={3}>{c.repo.toUpperCase()}</Data>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Lamp />
                <Data color={C.ink} track={4}>{AUTHOR.name.toUpperCase()}</Data>
                <Data color={C.line} track={0}>//</Data>
                <Data color={C.chrome} track={4}>SHAHFAHAD.DEV</Data>
              </div>
            </div>,

            <div key="headline" style={{ display: 'flex', flexDirection: 'column' }}>
              <Data size={22} track={6} color={C.ink2}>{`OPEN SOURCE // PR #${c.prNumber}`}</Data>
              <div style={{ display: 'flex', marginTop: 18 }}>
                <Title size={fitTitle(headline(c), 88)}>{headline(c)}</Title>
              </div>
              <div style={{ display: 'flex', marginTop: 22 }}>{lead(clip(c.prTitle, 110))}</div>
            </div>,

            <div key="telemetry" style={{ display: 'flex' }}>
                <Readout
                  first
                  label="Status"
                  value={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Lamp size={12} />
                      <div style={{ display: 'flex' }}>{STATUS_WORD[c.status]}</div>
                    </div>
                  }
                />
                <Readout label="Diff" value={`+${c.additions} / -${c.deletions}`} />
                <Readout label="Files" value={String(c.filesChanged)} />
                <Readout label={dateLabel} value={c.displayDate.toUpperCase()} />
            </div>,
          ]}
        </div>
      </Plate>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}

// contributions defaults to the full list so the old one-argument call sites
// (app/open-source/twitter-image.tsx) can switch by changing the import only.
export async function renderOpenSourceOg(
  stats: OpenSourceStats,
  contributions: Contribution[] = allContributions,
): Promise<ImageResponse> {
  const fonts = await ogFonts()
  const projects = [...new Set(contributions.map((c) => c.project))]
  const orgs = [...new Set(contributions.map((c) => c.org))]
  const marks = orgs.map((o) => orgMark(o)).filter((m): m is string => m !== null)
  const items: [string, string][] = [
    [String(stats.merged), stats.merged === 1 ? 'PR merged' : 'PRs merged'],
    [String(stats.repos), stats.repos === 1 ? 'Repository' : 'Repositories'],
    [`+${stats.additions}`, 'Lines added'],
    [`-${stats.deletions}`, 'Lines removed'],
  ]

  return new ImageResponse(
    (
      <Plate>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', padding: PAD }}>
          {[
            <div key="strip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Lamp />
                <Data color={C.chrome} track={4}>SHAHFAHAD.DEV/OPEN-SOURCE</Data>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {[...marks.map((m, i) => markImg(m, 36, `m${i}`)), markImg(GITHUB_MARK, 34, 'gh')]}
              </div>
            </div>,

            <div key="headline" style={{ display: 'flex', flexDirection: 'column' }}>
              <Data size={22} track={8} color={C.ink2}>{AUTHOR.name.toUpperCase()}</Data>
              <div style={{ display: 'flex', marginTop: 18 }}>
                <Title size={124}>Open source</Title>
              </div>
              <div style={{ display: 'flex', marginTop: 22 }}>
                {lead(`Contributing to the tools I build with: ${listJoin(projects.map((p) => `the ${p}`))}.`)}
              </div>
            </div>,

            <div key="stats" style={{ display: 'flex' }}>
              {items.map(([v, l], i) => (
                <Readout key={l} first={i === 0} label={l} value={v} valueFont="display" valueSize={56} />
              ))}
            </div>,
          ]}
        </div>
      </Plate>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}
