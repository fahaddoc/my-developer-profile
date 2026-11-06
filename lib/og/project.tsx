// lib/og/project.tsx
// Share image for /projects/[slug]: the project's name, client, year, tagline
// and first stack items on the titanium plate. A raster screenshot (jpg/png)
// sits in a bracketed viewport on the right; SVG screenshots are left out
// (Satori and the social crawlers render them unreliably), so those cards run
// the copy full width instead.

import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Project } from '@/data/projects'
import { AUTHOR } from '@/lib/seo/site'
import { OG_SIZE } from '@/lib/seo/og'
import { ogFonts } from './fonts'
import { C, FONT, chrome } from './theme'
import { Data, Lamp, Plate, Title, brackets } from './plate'

export const OG_PROJECT_ALT = `Project case study by ${AUTHOR.name}`

const PAD_X = 76
const CONTENT_W = 1200 - PAD_X * 2 // 1048
const GAP = 48 // copy column to screenshot viewport
const THUMB_MAX_W = 400
const THUMB_MAX_H = 380

const CATEGORY: Record<Project['category'], string> = { web: 'WEB', mobile: 'MOBILE', realtime: 'REAL-TIME' }

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

// Chivo Mono at `size` with `track` px letter spacing: ~0.6em per glyph.
const monoChars = (width: number, size: number, track: number) => Math.floor(width / (size * 0.6 + track))

interface Thumb {
  src: string
  w: number
  h: number
  /** the screenshot's own pixel size, shown in the viewport label */
  srcW: number
  srcH: number
  /** drawn size of the screenshot: covers w×h, anchored top-left, overflow clipped */
  imgW: number
  imgH: number
}

/** Pixel size of a PNG or baseline/progressive JPEG, read from its header. */
function rasterSize(b: Buffer): { w: number; h: number } | null {
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const m = b[i + 1]
      // start-of-frame markers carry the size (C4, C8, CC are not frames)
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }
      }
      i += 2 + b.readUInt16BE(i + 2)
    }
  }
  return null
}

/**
 * The screenshot as a data URI sized for the viewport, or null for an SVG or
 * an unreadable file. The viewport's aspect is held between 1:1.5 (phone
 * screens) and 1.6:1 (ultra-wide shots); beyond that the shot is cropped from
 * its top-left corner (where titles and app chrome sit) by the frame's
 * overflow, since Satori ignores objectPosition.
 */
function thumbnail(src: string): Thumb | null {
  const ext = src.split('.').pop()?.toLowerCase()
  const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : null
  if (!mime) return null
  try {
    const b = readFileSync(join(process.cwd(), 'public', src))
    const size = rasterSize(b)
    if (!size || !size.w || !size.h) return null
    const natural = size.w / size.h
    const ratio = Math.min(1.6, Math.max(1 / 1.5, natural))
    const w = Math.round(Math.min(THUMB_MAX_W, THUMB_MAX_H * ratio))
    const h = Math.round(w / ratio)
    const wider = natural > w / h
    const imgW = wider ? Math.round(h * natural) : w
    const imgH = wider ? h : Math.round(w / natural)
    return { src: `data:${mime};base64,${b.toString('base64')}`, w, h, srcW: size.w, srcH: size.h, imgW, imgH }
  } catch {
    return null
  }
}

/**
 * Splits a project title into a display name and a descriptor
 * ("Konnect.im — Video Conferencing" → "Konnect.im" + "Video Conferencing"),
 * then sizes the name in Tektur 800 caps to fit `width` (0.68em per glyph: the
 * average is ~0.62em but M and W run wide, and a wrapped line breaks the card),
 * breaking it over two balanced lines when one line would drop below 60px.
 */
function titleLines(name: string, width: number, max: number): { lines: string[]; size: number } {
  const fit = (lines: string[]) =>
    Math.min(max, Math.floor(width / (Math.max(...lines.map((l) => l.length)) * 0.68)))
  const one = [name]
  const words = name.split(/\s+/)
  if (fit(one) >= 60 || words.length < 2) return { lines: one, size: fit(one) }
  let best = one
  let bestLongest = name.length
  for (let i = 1; i < words.length; i++) {
    const pair = [words.slice(0, i).join(' '), words.slice(i).join(' ')]
    const longest = Math.max(pair[0].length, pair[1].length)
    if (longest < bestLongest) {
      best = pair
      bestLongest = longest
    }
  }
  return { lines: best, size: fit(best) }
}

function chip(label: string) {
  return (
    <div
      key={label}
      style={{
        display: 'flex',
        fontFamily: FONT.mono,
        fontWeight: 500,
        fontSize: 19,
        letterSpacing: 2,
        color: C.ink,
        padding: '9px 13px',
        borderRadius: 4,
        border: `1px solid ${chrome(0.3)}`,
        backgroundImage: `linear-gradient(180deg, ${chrome(0.09)}, ${chrome(0.02)})`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        whiteSpace: 'nowrap',
      }}
    >
      {label.toUpperCase()}
    </div>
  )
}

/** The leading stack items whose chips fit on one row of `width` px. */
function fittingTech(tech: string[], width: number, limit: number): string[] {
  const out: string[] = []
  let used = 0
  for (const t of tech.slice(0, limit)) {
    const w = t.length * (19 * 0.6 + 2) + 28 + (out.length ? 10 : 0)
    if (used + w > width) break
    out.push(t)
    used += w
  }
  return out.length ? out : tech.slice(0, 1)
}

function viewport(t: Thumb) {
  return (
    <div key="viewport" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', alignSelf: 'center' }}>
      {[
        <div key="label" style={{ display: 'flex', width: t.w, justifyContent: 'space-between', marginBottom: 14 }}>
          <Data size={15} track={3}>SCREEN</Data>
          <Data size={15} track={3} color={C.ink2}>{`${t.srcW}×${t.srcH}`}</Data>
        </div>,
        <div key="frame" style={{ display: 'flex', position: 'relative', width: t.w, height: t.h }}>
          {[
            <div key="clip" style={{ position: 'absolute', display: 'flex', left: 0, top: 0, width: t.w, height: t.h, overflow: 'hidden', borderRadius: 3 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.src} width={t.imgW} height={t.imgH} alt="" style={{ width: t.imgW, height: t.imgH }} />
            </div>,
            <div
              key="glass"
              style={{
                position: 'absolute',
                display: 'flex',
                left: 0,
                top: 0,
                width: t.w,
                height: t.h,
                borderRadius: 3,
                border: `1px solid ${chrome(0.28)}`,
                backgroundImage: `linear-gradient(180deg, rgba(9,10,12,0) 55%, rgba(9,10,12,0.42) 100%), linear-gradient(112deg, ${chrome(0)} 30%, ${chrome(0.07)} 42%, ${chrome(0)} 54%)`,
              }}
            />,
            ...brackets('vp', { x: -12, y: -12, w: t.w + 24, h: t.h + 24 }, 24, 2, chrome(0.7)),
          ]}
        </div>,
      ]}
    </div>
  )
}

export async function renderProjectOg(project: Project): Promise<ImageResponse> {
  const fonts = await ogFonts()
  const thumb = thumbnail(project.image)
  const colW = thumb ? CONTENT_W - thumb.w - GAP : CONTENT_W

  const [rawName, ...rest] = project.title.split(/\s+—\s+/)
  const name = rawName.trim()
  const descriptor = rest.join(' — ').trim()
  const { lines, size } = titleLines(name.toUpperCase(), colW, thumb ? 96 : 116)
  const tagline = project.tagline.replace(/[.\s]+$/, '')
  const company = project.company.toUpperCase()
  const tech = fittingTech(project.tech, colW, thumb ? 3 : 5)

  return new ImageResponse(
    (
      <Plate>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: `62px ${PAD_X}px 60px ${PAD_X}px` }}>
          {[
            <div key="strip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Lamp />
                <Data color={C.chrome} track={4}>SHAHFAHAD.DEV/PROJECTS</Data>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Data color={C.ink} track={4}>{AUTHOR.name.toUpperCase()}</Data>
                <Data color={C.line} track={0}>//</Data>
                <Data color={C.chrome} track={4}>{`${CATEGORY[project.category]} · ${project.year}`}</Data>
              </div>
            </div>,

            <div key="body" style={{ display: 'flex', flex: 1, alignItems: 'stretch', justifyContent: 'space-between', marginTop: 28 }}>
              {[
                <div key="copy" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: colW }}>
                  {[
                    <div key="headline" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, paddingBottom: 28 }}>
                      <Data size={20} track={4} color={C.ink2}>{clip(company, monoChars(colW, 20, 4))}</Data>
                      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18 }}>
                        {lines.map((l) => (
                          <Title key={l} size={size}>{l}</Title>
                        ))}
                      </div>
                      {descriptor ? (
                        <div style={{ display: 'flex', marginTop: 16 }}>
                          <Data size={22} track={4} color={C.chrome}>{clip(descriptor.toUpperCase(), monoChars(colW, 22, 4))}</Data>
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', width: 96, height: 3, marginTop: 24, background: C.chrome, boxShadow: `0 0 14px ${chrome(0.5)}` }} />
                      <div
                        style={{
                          display: 'flex',
                          marginTop: 24,
                          fontFamily: FONT.body,
                          fontSize: 28,
                          lineHeight: 1.35,
                          color: C.ink2,
                          maxWidth: colW,
                          textWrap: 'balance',
                        }}
                      >
                        {clip(tagline, 110)}
                      </div>
                    </div>,
                    <div key="stack" style={{ display: 'flex', gap: 10 }}>{tech.map(chip)}</div>,
                  ]}
                </div>,
                thumb ? viewport(thumb) : null,
              ]}
            </div>,
          ]}
        </div>
      </Plate>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}
