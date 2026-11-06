// components/ideas/type/fonts.ts — the type directions shown under /ideas/type.
// Each one is a real object the voice is borrowed from, not a category guess
// (impeccable brand.md: no reflex fonts). `preload: false` everywhere, so a
// page only downloads the faces it actually renders.

import {
  Archivo, JetBrains_Mono, Azeret_Mono, Big_Shoulders_Stencil, Bodoni_Moda, Bricolage_Grotesque, Chivo, Chivo_Mono,
  Hanken_Grotesk, Martian_Mono, Michroma, Onest, Overpass, Overpass_Mono, Tektur,
} from 'next/font/google'

// next/font reads its options statically: every call spells them out in full.
const archivo = Archivo({ subsets: ['latin'], display: 'swap', preload: false, axes: ['wdth'] })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], display: 'swap', preload: false })
const michroma = Michroma({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' })
const overpass = Overpass({ subsets: ['latin'], display: 'swap', preload: false })
const overpassMono = Overpass_Mono({ subsets: ['latin'], display: 'swap', preload: false })
const stencil = Big_Shoulders_Stencil({ subsets: ['latin'], display: 'swap', preload: false, axes: ['opsz'] })
const hanken = Hanken_Grotesk({ subsets: ['latin'], display: 'swap', preload: false })
const martian = Martian_Mono({ subsets: ['latin'], display: 'swap', preload: false, axes: ['wdth'] })
const bodoni = Bodoni_Moda({ subsets: ['latin'], display: 'swap', preload: false, axes: ['opsz'] })
const onest = Onest({ subsets: ['latin'], display: 'swap', preload: false })
const azeret = Azeret_Mono({ subsets: ['latin'], display: 'swap', preload: false })
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', preload: false, axes: ['opsz', 'wdth'] })
const tektur = Tektur({ subsets: ['latin'], display: 'swap', preload: false, axes: ['wdth'] })
const chivo = Chivo({ subsets: ['latin'], display: 'swap', preload: false })
const chivoMono = Chivo_Mono({ subsets: ['latin'], display: 'swap', preload: false })

export interface TypeStyle {
  slug: string
  name: string
  /** the physical thing the voice comes from */
  from: string
  /** what each family does, for the caption */
  cast: string
  /** CSS families; null keeps the site's own (Archivo / JetBrains Mono) */
  display: string | null
  body: string | null
  mono: string | null
}

export const TYPES: TypeStyle[] = [
  {
    slug: 'current', name: 'Before: Archivo',
    from: 'What the site used before the cockpit HUD: one variable grotesk, expanded and heavy for titles.',
    cast: 'Archivo (titles + text) · JetBrains Mono (data)',
    display: archivo.style.fontFamily, body: archivo.style.fontFamily, mono: jetbrains.style.fontFamily,
  },
  {
    slug: 'mission', name: 'Mission control',
    from: 'An Apollo-era flight manual and the lettering on a spacecraft hull: wide, calm, engineered.',
    cast: 'Michroma (titles) · Overpass (text) · Overpass Mono (data)',
    display: michroma.style.fontFamily, body: overpass.style.fontFamily, mono: overpassMono.style.fontFamily,
  },
  {
    slug: 'cargo', name: 'Cargo stencil',
    from: 'Stencilled markings on a station bulkhead or a ship’s cargo crate; works for space and for the sea.',
    cast: 'Big Shoulders Stencil (titles) · Hanken Grotesk (text) · Martian Mono (data)',
    display: stencil.style.fontFamily, body: hanken.style.fontFamily, mono: martian.style.fontFamily,
  },
  {
    slug: 'atlas', name: 'Star atlas',
    from: 'The engraved plates of a 19th-century celestial atlas: high-contrast, upright, precise.',
    cast: 'Bodoni Moda (titles) · Onest (text) · Azeret Mono (data)',
    display: bodoni.style.fontFamily, body: onest.style.fontFamily, mono: azeret.style.fontFamily,
  },
  {
    slug: 'zine', name: 'Zine poster',
    from: 'A screen-printed gig poster: one quirky grotesk, squeezed tight for titles, open for reading.',
    cast: 'Bricolage Grotesque (titles + text) · JetBrains Mono (data)',
    display: bricolage.style.fontFamily, body: bricolage.style.fontFamily, mono: null,
  },
  {
    slug: 'hud', name: 'Cockpit HUD',
    from: 'The readouts on a jet’s head-up display: angular, condensed, made to be read at speed.',
    cast: 'Tektur (titles) · Chivo (text) · Chivo Mono (data)',
    display: tektur.style.fontFamily, body: chivo.style.fontFamily, mono: chivoMono.style.fontFamily,
  },
]
