// lib/og/fonts.ts
// TTF font data for the share images. Satori (next/og) parses ttf / otf / woff
// only: a modern User-Agent makes Google Fonts answer with woff2, which Satori
// cannot read, and the image then silently falls back to its default font.
// This old Safari UA gets `format('truetype')` for Tektur, Chivo and Chivo Mono.
// Every failure resolves to null so a network hiccup never breaks the build;
// the cache is dropped when anything is missing, so the next render retries.

const OLD_UA =
  'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1'

type Weight = 400 | 500 | 700 | 800

export interface OgFont {
  name: string
  data: ArrayBuffer
  weight: Weight
  style: 'normal'
}

const WANTED: { name: string; weight: Weight }[] = [
  { name: 'Tektur', weight: 800 },
  { name: 'Chivo Mono', weight: 400 },
  { name: 'Chivo Mono', weight: 500 },
  { name: 'Chivo', weight: 400 },
]

async function loadGoogleTtf(family: string, weight: Weight): Promise<ArrayBuffer | null> {
  try {
    const q = `${family.replace(/ /g, '+')}:wght@${weight}`
    const res = await fetch(`https://fonts.googleapis.com/css2?family=${q}`, {
      headers: { 'User-Agent': OLD_UA },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const css = await res.text()
    const url = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/)?.[1]
    if (!url) return null
    const file = await fetch(url, { signal: AbortSignal.timeout(8000) })
    return file.ok ? await file.arrayBuffer() : null
  } catch {
    return null
  }
}

let cache: Promise<OgFont[]> | null = null

/** Tektur 800 (titles), Chivo Mono 400/500 (data), Chivo 400 (reading text). */
export function ogFonts(): Promise<OgFont[]> {
  if (!cache) {
    cache = Promise.all(
      WANTED.map(async ({ name, weight }) => {
        const data = await loadGoogleTtf(name, weight)
        return data ? ({ name, data, weight, style: 'normal' } as OgFont) : null
      }),
    ).then((list) => {
      const ok = list.filter((f): f is OgFont => f !== null)
      if (ok.length < WANTED.length) cache = null
      return ok
    })
  }
  return cache
}
